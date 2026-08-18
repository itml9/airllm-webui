from __future__ import annotations

import gc
import json
import os
import sys
from pathlib import Path


def emit(progress: int, message: str) -> None:
    print(f"{progress}% {message}", flush=True)


def configure_environment(config: dict) -> None:
    endpoint = str(config.get("hf_endpoint") or "").strip()
    if endpoint and endpoint != "https://huggingface.co":
        os.environ["HF_ENDPOINT"] = endpoint.rstrip("/")
    cache_dir = str(config.get("cache_dir") or "").strip()
    if cache_dir:
        Path(cache_dir).mkdir(parents=True, exist_ok=True)
        os.environ["HF_HOME"] = cache_dir
        os.environ["HF_HUB_CACHE"] = str(Path(cache_dir) / "hub")
    for key, config_key in (("HTTP_PROXY", "http_proxy"), ("HTTPS_PROXY", "https_proxy")):
        value = str(config.get(config_key) or "").strip()
        if value:
            os.environ[key] = value
            os.environ[key.lower()] = value


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: model_prepare.py CONFIG_JSON", file=sys.stderr)
        return 2
    config_path = Path(sys.argv[1])
    with config_path.open("r", encoding="utf-8") as handle:
        config = json.load(handle)
    configure_environment(config)

    emit(2, "正在检查 AirLLM 环境")
    try:
        from airllm import AutoModel
    except ImportError as exc:
        raise RuntimeError("当前 Python 未安装 AirLLM，请先在配置页安装。") from exc

    source = (
        str(config.get("local_model_path") or "").strip()
        if config.get("model_source") == "local"
        else str(config.get("model_id") or "").strip()
    )
    if not source:
        raise RuntimeError("没有配置模型 ID 或本地模型目录。")

    shards_dir = str(config.get("shards_dir") or "").strip()
    if shards_dir:
        Path(shards_dir).mkdir(parents=True, exist_ok=True)

    kwargs = {
        "device": str(config.get("device") or "cuda:0"),
        "max_seq_len": int(config.get("max_seq_len") or 512),
        "layer_shards_saving_path": shards_dir or None,
        "profiling_mode": False,
        "compression": None if config.get("compression") in (None, "", "none") else config.get("compression"),
        "hf_token": str(config.get("hf_token") or "") or None,
        "prefetching": bool(config.get("prefetching", True)),
        "delete_original": bool(config.get("delete_original", False)),
    }
    if kwargs["device"] == "auto":
        import torch

        kwargs["device"] = "cuda:0" if torch.cuda.is_available() else "cpu"

    emit(5, f"开始准备模型 {source}")
    model = AutoModel.from_pretrained(source, **kwargs)
    emit(98, "模型下载和分层准备完成")
    del model
    gc.collect()
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr, flush=True)
        raise

