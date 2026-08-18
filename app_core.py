from __future__ import annotations

import json
import os
import platform
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
JOBS_DIR = DATA_DIR / "jobs"
CONFIG_FILE = DATA_DIR / "config.json"
VENV_DIR = ROOT / ".venv"
FRONTEND_DIR = ROOT / "frontend"

DATA_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR.mkdir(parents=True, exist_ok=True)


def default_config() -> dict[str, Any]:
    return {
        "language": "zh-CN",
        "python_path": "",
        "use_project_venv": True,
        "venv_path": str(VENV_DIR),
        "model_source": "huggingface",
        "model_id": "Qwen/Qwen3-0.6B",
        "local_model_path": "",
        "hf_endpoint": "https://huggingface.co",
        "http_proxy": "",
        "https_proxy": "",
        "hf_token": "",
        "cache_dir": str(DATA_DIR / "huggingface"),
        "shards_dir": str(DATA_DIR / "shards"),
        "compression": "none",
        "prefetching": True,
        "delete_original": False,
        "device": "auto",
        "max_seq_len": 512,
        "max_new_tokens": 256,
        "temperature": 0.7,
        "top_p": 0.9,
        "repetition_penalty": 1.05,
        "torch_index_url": "",
    }


_config_lock = threading.Lock()


def load_config() -> dict[str, Any]:
    config = default_config()
    if CONFIG_FILE.exists():
        try:
            with CONFIG_FILE.open("r", encoding="utf-8") as handle:
                saved = json.load(handle)
            if isinstance(saved, dict):
                config.update(saved)
        except (OSError, json.JSONDecodeError):
            pass
    return config


def save_config(incoming: dict[str, Any]) -> dict[str, Any]:
    with _config_lock:
        current = load_config()
        allowed = set(default_config())
        for key, value in incoming.items():
            if key not in allowed:
                continue
            if key == "hf_token" and value in (None, "", "********"):
                continue
            current[key] = value

        current["max_seq_len"] = _bounded_int(current.get("max_seq_len"), 32, 32768, 512)
        current["max_new_tokens"] = _bounded_int(current.get("max_new_tokens"), 1, 8192, 256)
        current["temperature"] = _bounded_float(current.get("temperature"), 0.0, 2.0, 0.7)
        current["top_p"] = _bounded_float(current.get("top_p"), 0.01, 1.0, 0.9)
        current["repetition_penalty"] = _bounded_float(current.get("repetition_penalty"), 0.1, 3.0, 1.05)

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        temp_file = CONFIG_FILE.with_suffix(".tmp")
        with temp_file.open("w", encoding="utf-8") as handle:
            json.dump(current, handle, ensure_ascii=False, indent=2)
        os.replace(temp_file, CONFIG_FILE)
        return current


def public_config(config: dict[str, Any] | None = None) -> dict[str, Any]:
    result = dict(config or load_config())
    token = str(result.get("hf_token") or "")
    result["hf_token"] = ""
    result["hf_token_saved"] = bool(token)
    return result


def _bounded_int(value: Any, low: int, high: int, fallback: int) -> int:
    try:
        return max(low, min(high, int(value)))
    except (TypeError, ValueError):
        return fallback


def _bounded_float(value: Any, low: float, high: float, fallback: float) -> float:
    try:
        return max(low, min(high, float(value)))
    except (TypeError, ValueError):
        return fallback


def venv_python(venv_path: str | Path) -> Path:
    base = Path(venv_path)
    if os.name == "nt":
        return base / "Scripts" / "python.exe"
    return base / "bin" / "python"


def resolve_target_python(config: dict[str, Any] | None = None) -> str:
    config = config or load_config()
    if config.get("use_project_venv"):
        candidate = venv_python(config.get("venv_path") or VENV_DIR)
        if candidate.exists():
            return str(candidate)
    configured = str(config.get("python_path") or "").strip().strip('"')
    if configured and Path(configured).exists():
        return configured
    return sys.executable


def build_process_env(config: dict[str, Any] | None = None) -> dict[str, str]:
    config = config or load_config()
    env = dict(os.environ)
    env["PYTHONUNBUFFERED"] = "1"
    env["PYTHONUTF8"] = "1"

    endpoint = str(config.get("hf_endpoint") or "").strip()
    if endpoint and endpoint != "https://huggingface.co":
        env["HF_ENDPOINT"] = endpoint.rstrip("/")
    elif "HF_ENDPOINT" in env:
        env.pop("HF_ENDPOINT", None)

    cache_dir = str(config.get("cache_dir") or "").strip()
    if cache_dir:
        Path(cache_dir).mkdir(parents=True, exist_ok=True)
        env["HF_HOME"] = cache_dir
        env["HF_HUB_CACHE"] = str(Path(cache_dir) / "hub")

    http_proxy = str(config.get("http_proxy") or "").strip()
    https_proxy = str(config.get("https_proxy") or "").strip()
    if http_proxy:
        env["HTTP_PROXY"] = http_proxy
        env["http_proxy"] = http_proxy
    if https_proxy:
        env["HTTPS_PROXY"] = https_proxy
        env["https_proxy"] = https_proxy
    return env


def _run_text(command: list[str], timeout: int = 20, env: dict[str, str] | None = None) -> tuple[int, str]:
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            env=env,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        output = "\n".join(part.strip() for part in (result.stdout, result.stderr) if part.strip())
        return result.returncode, output
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 1, str(exc)


def detect_environment(python_path: str | None = None) -> dict[str, Any]:
    config = load_config()
    target = (python_path or resolve_target_python(config)).strip().strip('"')
    if not target or not Path(target).exists():
        return {"ok": False, "error": "Python executable does not exist.", "python_path": target}

    probe = r'''
import importlib.metadata
import importlib.util
import json
import platform
import sys

def package(name):
    try:
        return {"installed": True, "version": importlib.metadata.version(name)}
    except importlib.metadata.PackageNotFoundError:
        return {"installed": False, "version": ""}

result = {
    "ok": True,
    "python_path": sys.executable,
    "python_version": platform.python_version(),
    "architecture": platform.machine(),
    "platform": platform.platform(),
    "is_venv": sys.prefix != getattr(sys, "base_prefix", sys.prefix),
    "prefix": sys.prefix,
    "pip": package("pip"),
    "torch": package("torch"),
    "airllm": package("airllm"),
    "bitsandbytes": package("bitsandbytes"),
    "huggingface_hub": package("huggingface-hub"),
    "cuda_available": False,
    "cuda_version": "",
    "gpu_name": "",
    "gpu_memory_gb": None,
}

if result["torch"]["installed"]:
    try:
        import torch
        result["cuda_available"] = bool(torch.cuda.is_available())
        result["cuda_version"] = str(torch.version.cuda or "")
        if result["cuda_available"]:
            result["gpu_name"] = torch.cuda.get_device_name(0)
            props = torch.cuda.get_device_properties(0)
            result["gpu_memory_gb"] = round(props.total_memory / 1024 ** 3, 1)
    except Exception as exc:
        result["torch_error"] = str(exc)

print(json.dumps(result, ensure_ascii=False))
'''
    code, output = _run_text([target, "-c", probe], timeout=30, env=build_process_env(config))
    if code != 0:
        return {"ok": False, "error": output or "Environment detection failed.", "python_path": target}
    try:
        return json.loads(output.splitlines()[-1])
    except (json.JSONDecodeError, IndexError):
        return {"ok": False, "error": output or "Invalid environment response.", "python_path": target}


def gpu_info() -> dict[str, Any]:
    nvidia_smi = shutil.which("nvidia-smi")
    if not nvidia_smi:
        return {"available": False}
    code, output = _run_text(
        [nvidia_smi, "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits"],
        timeout=10,
    )
    if code != 0 or not output:
        return {"available": False, "error": output}
    first = output.splitlines()[0]
    parts = [part.strip() for part in first.split(",")]
    return {
        "available": True,
        "name": parts[0] if parts else "NVIDIA GPU",
        "memory_mb": int(float(parts[1])) if len(parts) > 1 else None,
        "driver_version": parts[2] if len(parts) > 2 else "",
    }


def system_info() -> dict[str, Any]:
    usage = shutil.disk_usage(ROOT.drive + "\\" if os.name == "nt" and ROOT.drive else ROOT)
    return {
        "platform": platform.platform(),
        "backend_python": sys.executable,
        "backend_python_version": platform.python_version(),
        "project_root": str(ROOT),
        "disk_free_gb": round(usage.free / 1024 ** 3, 1),
        "gpu": gpu_info(),
    }


def choose_path(kind: str) -> str:
    if os.name != "nt":
        return ""
    if kind == "python":
        script = r'''
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Select Python executable'
$dialog.Filter = 'Python executable (python.exe)|python.exe|Executable files (*.exe)|*.exe'
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $dialog.FileName }
'''
    else:
        script = r'''
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select a folder'
$dialog.ShowNewFolderButton = $true
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $dialog.SelectedPath }
'''
    code, output = _run_text(
        ["powershell", "-NoProfile", "-STA", "-Command", script],
        timeout=300,
    )
    return output.splitlines()[-1].strip() if code == 0 and output.strip() else ""


@dataclass
class Job:
    id: str
    kind: str
    title: str
    status: str = "queued"
    progress: int = 0
    phase: str = "等待开始"
    logs: list[str] = field(default_factory=list)
    error: str = ""
    result: dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def public(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "kind": self.kind,
            "title": self.title,
            "status": self.status,
            "progress": self.progress,
            "phase": self.phase,
            "logs": self.logs[-250:],
            "error": self.error,
            "result": self.result,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class JobManager:
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()

    def create(self, kind: str, title: str, target: Callable[[Job], Any]) -> Job:
        job = Job(id=uuid.uuid4().hex[:12], kind=kind, title=title)
        with self._lock:
            self._jobs[job.id] = job
        thread = threading.Thread(target=self._run, args=(job, target), daemon=True)
        thread.start()
        return job

    def _run(self, job: Job, target: Callable[[Job], Any]) -> None:
        self.update(job, status="running", phase="正在启动", progress=1)
        try:
            result = target(job)
            if isinstance(result, dict):
                job.result = result
            self.update(job, status="completed", phase="已完成", progress=100)
        except Exception as exc:
            self.append(job, f"ERROR: {exc}")
            self.update(job, status="failed", phase="执行失败", error=str(exc))

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    def list(self) -> list[dict[str, Any]]:
        with self._lock:
            jobs = sorted(self._jobs.values(), key=lambda item: item.created_at, reverse=True)
        return [job.public() for job in jobs[:20]]

    def update(self, job: Job, **changes: Any) -> None:
        with self._lock:
            for key, value in changes.items():
                setattr(job, key, value)
            job.updated_at = time.time()

    def append(self, job: Job, line: str) -> None:
        clean = _clean_log(line)
        if not clean:
            return
        with self._lock:
            job.logs.append(clean)
            if len(job.logs) > 500:
                del job.logs[:-400]
            match = re.search(r"(?<!\d)(\d{1,3})%", clean)
            if match:
                job.progress = max(job.progress, min(98, int(match.group(1))))
            job.updated_at = time.time()

    def run_process(
        self,
        job: Job,
        command: list[str],
        env: dict[str, str] | None = None,
        progress_start: int = 5,
        progress_end: int = 95,
    ) -> None:
        self.append(job, "> " + " ".join(_display_arg(item) for item in command))
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=env,
            bufsize=1,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        self.update(job, progress=max(job.progress, progress_start))
        assert process.stdout is not None
        for raw in iter(process.stdout.readline, ""):
            for part in raw.replace("\r", "\n").splitlines():
                self.append(job, part)
        return_code = process.wait()
        if return_code != 0:
            raise RuntimeError(f"Command exited with code {return_code}.")
        self.update(job, progress=max(job.progress, progress_end))


def _clean_log(line: str) -> str:
    ansi = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
    return ansi.sub("", str(line)).strip()


def _display_arg(value: str) -> str:
    if value.startswith("hf_") or "token=" in value.lower():
        return "********"
    return f'"{value}"' if " " in value else value


def create_venv_job(manager: JobManager, job: Job, base_python: str, venv_path: str) -> dict[str, Any]:
    base = base_python.strip().strip('"')
    if not base or not Path(base).exists():
        raise RuntimeError("请选择一个有效的基础 Python。")
    destination = Path(venv_path or VENV_DIR).resolve()
    manager.update(job, phase="创建虚拟环境", progress=10)
    manager.run_process(job, [base, "-m", "venv", str(destination)], env=build_process_env(), progress_end=70)
    created_python = venv_python(destination)
    if not created_python.exists():
        raise RuntimeError("虚拟环境创建完成，但没有找到 python.exe。")
    manager.update(job, phase="初始化 pip", progress=75)
    manager.run_process(
        job,
        [str(created_python), "-m", "pip", "install", "--upgrade", "pip"],
        env=build_process_env(),
        progress_start=75,
        progress_end=95,
    )
    config = save_config({
        "python_path": base,
        "use_project_venv": True,
        "venv_path": str(destination),
    })
    return {"python_path": str(created_python), "config": public_config(config)}


def install_dependencies_job(manager: JobManager, job: Job, options: dict[str, Any]) -> dict[str, Any]:
    config = load_config()
    target = resolve_target_python(config)
    if not Path(target).exists():
        raise RuntimeError("目标 Python 不存在。")
    env = build_process_env(config)
    selected: list[tuple[str, list[str]]] = []
    if options.get("pytorch"):
        command = [target, "-m", "pip", "install", "--upgrade", "torch"]
        index_url = str(options.get("torch_index_url") or config.get("torch_index_url") or "").strip()
        if index_url:
            command.extend(["--index-url", index_url])
        selected.append(("安装 PyTorch", command))
    if options.get("airllm"):
        selected.append(("安装 AirLLM", [target, "-m", "pip", "install", "--upgrade", "airllm"]))
    if options.get("bitsandbytes"):
        selected.append(("安装 bitsandbytes", [target, "-m", "pip", "install", "--upgrade", "bitsandbytes"]))
    if not selected:
        raise RuntimeError("至少选择一个需要安装的依赖。")

    step_size = max(1, 88 // len(selected))
    for index, (title, command) in enumerate(selected):
        start = 5 + index * step_size
        end = min(95, start + step_size - 3)
        manager.update(job, phase=title, progress=start)
        manager.run_process(job, command, env=env, progress_start=start, progress_end=end)
    return detect_environment(target)


def prepare_model_job(manager: JobManager, job: Job) -> dict[str, Any]:
    config = load_config()
    target = resolve_target_python(config)
    if not Path(target).exists():
        raise RuntimeError("目标 Python 不存在。")
    payload_path = JOBS_DIR / f"{job.id}.json"
    with payload_path.open("w", encoding="utf-8") as handle:
        json.dump(config, handle, ensure_ascii=False, indent=2)
    manager.update(job, phase="下载并准备模型", progress=3)
    try:
        manager.run_process(
            job,
            [target, str(ROOT / "model_prepare.py"), str(payload_path)],
            env=build_process_env(config),
            progress_start=3,
            progress_end=98,
        )
    finally:
        try:
            payload_path.unlink()
        except OSError:
            pass
    return {"model": config.get("model_id") or config.get("local_model_path")}


def find_free_port(start: int = 8876, end: int = 8910) -> int:
    for port in range(start, end + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError("没有可用的本地模型服务端口。")


class WorkerManager:
    def __init__(self) -> None:
        self.process: subprocess.Popen[str] | None = None
        self.port: int | None = None
        self.logs: list[str] = []
        self._lock = threading.Lock()

    def _append(self, line: str, callback: Callable[[str], None] | None = None) -> None:
        clean = _clean_log(line)
        if not clean:
            return
        with self._lock:
            self.logs.append(clean)
            if len(self.logs) > 500:
                del self.logs[:-400]
        if callback:
            callback(clean)

    def start(self, callback: Callable[[str], None] | None = None) -> None:
        self.stop()
        config = load_config()
        target = resolve_target_python(config)
        if not Path(target).exists():
            raise RuntimeError("目标 Python 不存在。")
        self.port = find_free_port()
        command = [target, str(ROOT / "inference_worker.py"), "--port", str(self.port)]
        self.process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=build_process_env(config),
            bufsize=1,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        assert self.process.stdout is not None

        def reader() -> None:
            assert self.process is not None and self.process.stdout is not None
            for raw in iter(self.process.stdout.readline, ""):
                for part in raw.replace("\r", "\n").splitlines():
                    self._append(part, callback)

        threading.Thread(target=reader, daemon=True).start()
        deadline = time.time() + 25
        while time.time() < deadline:
            if self.process.poll() is not None:
                raise RuntimeError("模型服务启动失败，请查看任务日志。")
            try:
                response = self.request("GET", "/health", timeout=2)
                if response.get("ok"):
                    return
            except Exception:
                time.sleep(0.4)
        raise RuntimeError("等待模型服务启动超时。")

    def stop(self) -> None:
        process = self.process
        if process is None:
            return
        if process.poll() is None and self.port:
            try:
                self.request("POST", "/shutdown", {}, timeout=2)
            except Exception:
                pass
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.terminate()
        self.process = None
        self.port = None

    def request(self, method: str, path: str, payload: dict[str, Any] | None = None, timeout: int = 1800) -> dict[str, Any]:
        if not self.port:
            raise RuntimeError("模型服务未启动。")
        data = None
        headers = {"Accept": "application/json"}
        if payload is not None:
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json; charset=utf-8"
        request = urllib.request.Request(
            f"http://127.0.0.1:{self.port}{path}",
            data=data,
            method=method,
            headers=headers,
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            try:
                message = json.loads(body).get("error", body)
            except json.JSONDecodeError:
                message = body
            raise RuntimeError(message or f"模型服务返回 HTTP {exc.code}") from exc

    def status(self) -> dict[str, Any]:
        process = self.process
        base = {
            "running": bool(process and process.poll() is None),
            "port": self.port,
            "logs": self.logs[-100:],
        }
        if not base["running"]:
            return {**base, "loaded": False, "state": "stopped"}
        try:
            return {**base, **self.request("GET", "/status", timeout=3)}
        except Exception as exc:
            return {**base, "loaded": False, "state": "unavailable", "error": str(exc)}


def load_model_job(manager: JobManager, worker: WorkerManager, job: Job) -> dict[str, Any]:
    manager.update(job, phase="启动模型服务", progress=5)
    worker.start(callback=lambda line: manager.append(job, line))
    manager.update(job, phase="加载 AirLLM 模型", progress=20)
    response = worker.request("POST", "/load", load_config(), timeout=24 * 60 * 60)
    if not response.get("ok"):
        raise RuntimeError(response.get("error") or "模型加载失败。")
    return response
