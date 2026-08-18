from __future__ import annotations

import json
import mimetypes
import os
import threading
import time
import urllib.parse
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from app_core import (
    FRONTEND_DIR,
    JobManager,
    WorkerManager,
    choose_path,
    create_venv_job,
    detect_environment,
    install_dependencies_job,
    load_config,
    load_model_job,
    prepare_model_job,
    public_config,
    save_config,
    system_info,
)


JOBS = JobManager()
WORKER = WorkerManager()


class AppHandler(BaseHTTPRequestHandler):
    server_version = "LocalAirLLM/1.0"

    def log_message(self, format_string: str, *args: Any) -> None:
        print(f"[{self.log_date_time_string()}] {format_string % args}")

    def _send_json(self, status: int, payload: dict[str, Any] | list[Any]) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0:
            return {}
        if length > 2 * 1024 * 1024:
            raise ValueError("Request body is too large.")
        data = self.rfile.read(length).decode("utf-8")
        parsed = json.loads(data)
        if not isinstance(parsed, dict):
            raise ValueError("JSON body must be an object.")
        return parsed

    def _serve_static(self, request_path: str) -> None:
        relative = urllib.parse.unquote(request_path.split("?", 1)[0]).lstrip("/") or "index.html"
        candidate = (FRONTEND_DIR / relative).resolve()
        try:
            candidate.relative_to(FRONTEND_DIR.resolve())
        except ValueError:
            self._send_json(HTTPStatus.FORBIDDEN, {"ok": False, "error": "Forbidden"})
            return
        if not candidate.is_file():
            candidate = FRONTEND_DIR / "index.html"
        data = candidate.read_bytes()
        content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in {"application/javascript", "application/json"}:
            content_type += "; charset=utf-8"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        try:
            if path == "/api/health":
                self._send_json(HTTPStatus.OK, {"ok": True, "time": time.time()})
            elif path == "/api/config":
                self._send_json(HTTPStatus.OK, {"ok": True, "config": public_config()})
            elif path == "/api/system":
                self._send_json(HTTPStatus.OK, {"ok": True, "system": system_info()})
            elif path == "/api/jobs":
                self._send_json(HTTPStatus.OK, {"ok": True, "jobs": JOBS.list()})
            elif path.startswith("/api/jobs/"):
                job_id = path.rsplit("/", 1)[-1]
                job = JOBS.get(job_id)
                if not job:
                    self._send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Job not found"})
                else:
                    self._send_json(HTTPStatus.OK, {"ok": True, "job": job.public()})
            elif path == "/api/model/status":
                self._send_json(HTTPStatus.OK, {"ok": True, "model": WORKER.status()})
            else:
                self._serve_static(path)
        except Exception as exc:
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": str(exc)})

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        try:
            body = self._read_json()
            if path == "/api/config":
                config = save_config(body)
                self._send_json(HTTPStatus.OK, {"ok": True, "config": public_config(config)})
            elif path == "/api/path/select":
                selected = choose_path(str(body.get("kind") or "folder"))
                self._send_json(HTTPStatus.OK, {"ok": True, "path": selected})
            elif path == "/api/environment/detect":
                result = detect_environment(str(body.get("python_path") or "") or None)
                self._send_json(HTTPStatus.OK if result.get("ok") else HTTPStatus.BAD_REQUEST, result)
            elif path == "/api/environment/create-venv":
                base_python = str(body.get("python_path") or load_config().get("python_path") or "")
                venv_path = str(body.get("venv_path") or load_config().get("venv_path") or "")
                job = JOBS.create(
                    "create_venv",
                    "创建项目虚拟环境",
                    lambda item: create_venv_job(JOBS, item, base_python, venv_path),
                )
                self._send_json(HTTPStatus.ACCEPTED, {"ok": True, "job": job.public()})
            elif path == "/api/environment/install":
                job = JOBS.create(
                    "install",
                    "安装运行依赖",
                    lambda item: install_dependencies_job(JOBS, item, body),
                )
                self._send_json(HTTPStatus.ACCEPTED, {"ok": True, "job": job.public()})
            elif path == "/api/model/prepare":
                save_config(body.get("config") or {})
                job = JOBS.create("prepare_model", "下载并准备模型", lambda item: prepare_model_job(JOBS, item))
                self._send_json(HTTPStatus.ACCEPTED, {"ok": True, "job": job.public()})
            elif path == "/api/model/load":
                save_config(body.get("config") or {})
                job = JOBS.create("load_model", "加载本地模型", lambda item: load_model_job(JOBS, WORKER, item))
                self._send_json(HTTPStatus.ACCEPTED, {"ok": True, "job": job.public()})
            elif path == "/api/model/unload":
                WORKER.stop()
                self._send_json(HTTPStatus.OK, {"ok": True})
            elif path == "/api/chat":
                config = load_config()
                payload = {
                    "messages": body.get("messages") or [],
                    "max_seq_len": config.get("max_seq_len"),
                    "max_new_tokens": config.get("max_new_tokens"),
                    "temperature": config.get("temperature"),
                    "top_p": config.get("top_p"),
                    "repetition_penalty": config.get("repetition_penalty"),
                }
                result = WORKER.request("POST", "/chat", payload, timeout=24 * 60 * 60)
                self._send_json(HTTPStatus.OK, result)
            else:
                self._send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Not found"})
        except ValueError as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": str(exc)})


def find_server() -> ThreadingHTTPServer:
    for port in range(8765, 8791):
        try:
            return ThreadingHTTPServer(("127.0.0.1", port), AppHandler)
        except OSError:
            continue
    raise RuntimeError("No local port is available between 8765 and 8790.")


def main() -> None:
    server = find_server()
    host, port = server.server_address
    url = f"http://{host}:{port}"
    print(f"Local AirLLM is running at {url}")
    print("Close this window or press Ctrl+C to stop it.")

    def open_browser() -> None:
        time.sleep(0.8)
        webbrowser.open(url)

    threading.Thread(target=open_browser, daemon=True).start()
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print("Stopping Local AirLLM...")
    finally:
        WORKER.stop()
        server.server_close()


if __name__ == "__main__":
    main()

