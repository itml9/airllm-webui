from __future__ import annotations

import argparse
import json
import os
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from queue import Empty
from typing import Any


STATE: dict[str, Any] = {
    "state": "idle",
    "loaded": False,
    "model_name": "",
    "error": "",
    "loaded_at": None,
}
MODEL: Any = None
TORCH: Any = None
DEVICE = "cpu"
SERVER: ThreadingHTTPServer | None = None
LOAD_LOCK = threading.Lock()
GENERATE_LOCK = threading.Lock()
CANCEL_EVENT = threading.Event()


class CancelGeneration:
    def __call__(self, input_ids: Any, scores: Any, **kwargs: Any) -> Any:
        if TORCH is None:
            return CANCEL_EVENT.is_set()
        return TORCH.full((input_ids.shape[0],), CANCEL_EVENT.is_set(), dtype=TORCH.bool, device=input_ids.device)


def configure_environment(config: dict[str, Any]) -> None:
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


def load_model(config: dict[str, Any]) -> dict[str, Any]:
    global MODEL, TORCH, DEVICE
    with LOAD_LOCK:
        STATE.update({"state": "loading", "loaded": False, "error": ""})
        configure_environment(config)
        try:
            import torch
            from airllm import AutoModel

            TORCH = torch
            source = (
                str(config.get("local_model_path") or "").strip()
                if config.get("model_source") == "local"
                else str(config.get("model_id") or "").strip()
            )
            if not source:
                raise RuntimeError("没有配置模型 ID 或本地模型目录。")
            DEVICE = str(config.get("device") or "auto")
            if DEVICE == "auto":
                DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"

            shards_dir = str(config.get("shards_dir") or "").strip()
            if shards_dir:
                Path(shards_dir).mkdir(parents=True, exist_ok=True)
            kwargs = {
                "device": DEVICE,
                "max_seq_len": int(config.get("max_seq_len") or 512),
                "layer_shards_saving_path": shards_dir or None,
                "profiling_mode": False,
                "compression": None if config.get("compression") in (None, "", "none") else config.get("compression"),
                "hf_token": str(config.get("hf_token") or "") or None,
                "prefetching": bool(config.get("prefetching", True)),
                "delete_original": bool(config.get("delete_original", False)),
            }
            print(f"Loading model: {source} on {DEVICE}", flush=True)
            MODEL = AutoModel.from_pretrained(source, **kwargs)
            STATE.update({
                "state": "ready",
                "loaded": True,
                "model_name": source,
                "error": "",
                "loaded_at": time.time(),
                "device": DEVICE,
            })
            print("Model is ready.", flush=True)
            return {"ok": True, **STATE}
        except Exception as exc:
            MODEL = None
            STATE.update({"state": "error", "loaded": False, "error": str(exc)})
            print(f"ERROR: {exc}", flush=True)
            raise


def format_prompt(tokenizer: Any, messages: list[dict[str, Any]]) -> str:
    cleaned = [
        {"role": str(item.get("role") or "user"), "content": str(item.get("content") or "")}
        for item in messages
        if str(item.get("content") or "").strip()
    ]
    if hasattr(tokenizer, "apply_chat_template"):
        try:
            return tokenizer.apply_chat_template(cleaned, tokenize=False, add_generation_prompt=True)
        except Exception:
            pass
    labels = {"system": "System", "user": "User", "assistant": "Assistant"}
    lines = [f"{labels.get(item['role'], item['role'].title())}: {item['content']}" for item in cleaned]
    lines.append("Assistant:")
    return "\n\n".join(lines)


def build_generation(payload: dict[str, Any], streamer: Any = None, stopping_criteria: Any = None) -> tuple[Any, Any, dict[str, Any], int]:
    if not STATE.get("loaded") or MODEL is None or TORCH is None:
        raise RuntimeError("模型尚未加载。")
    messages = payload.get("messages") or []
    if not isinstance(messages, list) or not messages:
        raise RuntimeError("对话内容不能为空。")

    max_new_tokens = max(1, min(8192, int(payload.get("max_new_tokens") or 256)))
    temperature = max(0.0, min(2.0, float(payload.get("temperature", 0.7))))
    top_p = max(0.01, min(1.0, float(payload.get("top_p", 0.9))))
    repetition_penalty = max(0.1, min(3.0, float(payload.get("repetition_penalty", 1.05))))

    tokenizer = MODEL.tokenizer
    prompt = format_prompt(tokenizer, messages)
    max_seq_len = int(payload.get("max_seq_len") or 512)
    encoded = tokenizer(
        prompt,
        return_tensors="pt",
        return_attention_mask=True,
        truncation=True,
        max_length=max_seq_len,
        padding=False,
    )
    input_ids = encoded["input_ids"].to(DEVICE)
    attention_mask = encoded.get("attention_mask")
    if attention_mask is not None:
        attention_mask = attention_mask.to(DEVICE)

    generation_args = {
        "input_ids": input_ids,
        "max_new_tokens": max_new_tokens,
        "use_cache": True,
        "return_dict_in_generate": True,
        "do_sample": temperature > 0,
        "repetition_penalty": repetition_penalty,
    }
    if attention_mask is not None:
        generation_args["attention_mask"] = attention_mask
    if temperature > 0:
        generation_args["temperature"] = max(temperature, 0.01)
        generation_args["top_p"] = top_p
    if streamer is not None:
        generation_args["streamer"] = streamer
    if stopping_criteria is not None:
        generation_args["stopping_criteria"] = stopping_criteria
    return tokenizer, input_ids, generation_args, int(input_ids.shape[-1])


def chat(payload: dict[str, Any]) -> dict[str, Any]:
    tokenizer, input_ids, generation_args, prompt_tokens = build_generation(payload)

    started = time.time()
    with GENERATE_LOCK:
        with TORCH.inference_mode():
            output = MODEL.generate(**generation_args)
    sequence = output.sequences[0]
    generated = sequence[prompt_tokens:]
    text = tokenizer.decode(generated, skip_special_tokens=True).strip()
    elapsed = round(time.time() - started, 2)
    return {
        "ok": True,
        "text": text,
        "elapsed_seconds": elapsed,
        "usage": {
            "prompt_tokens": int(prompt_tokens),
            "completion_tokens": int(generated.shape[-1]),
        },
    }


def stream_chat(payload: dict[str, Any]):
    try:
        from transformers import StoppingCriteriaList, TextIteratorStreamer
    except ImportError as exc:
        raise RuntimeError("当前 Transformers 不支持流式输出，请升级到 4.49 或更高版本。") from exc

    CANCEL_EVENT.clear()
    tokenizer, input_ids, generation_args, prompt_tokens = build_generation(payload)
    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True, timeout=0.25)
    generation_args["streamer"] = streamer
    generation_args["stopping_criteria"] = StoppingCriteriaList([CancelGeneration()])
    result: dict[str, Any] = {}
    generation_done = threading.Event()
    started = time.time()

    def generate() -> None:
        try:
            with GENERATE_LOCK:
                with TORCH.inference_mode():
                    result["output"] = MODEL.generate(**generation_args)
        except BaseException as exc:
            result["error"] = exc
            streamer.end()
        finally:
            generation_done.set()

    thread = threading.Thread(target=generate, daemon=True)
    thread.start()
    try:
        while True:
            try:
                piece = next(streamer)
            except Empty:
                if generation_done.is_set():
                    break
                continue
            except StopIteration:
                break
            if piece:
                yield {"type": "delta", "text": piece}

        thread.join()
        if result.get("error") is not None:
            raise result["error"]
        output = result.get("output")
        sequence = getattr(output, "sequences", None)
        generated_tokens = int(sequence.shape[-1] - prompt_tokens) if sequence is not None else 0
        yield {
            "type": "done",
            "elapsed_seconds": round(time.time() - started, 2),
            "usage": {"prompt_tokens": int(prompt_tokens), "completion_tokens": generated_tokens},
            "cancelled": CANCEL_EVENT.is_set(),
        }
    finally:
        if thread.is_alive():
            CANCEL_EVENT.set()
            thread.join(timeout=5)
        CANCEL_EVENT.clear()


class WorkerHandler(BaseHTTPRequestHandler):
    server_version = "LocalAirLLMWorker/1.0"

    def log_message(self, format_string: str, *args: Any) -> None:
        return

    def _json(self, status: int, payload: dict[str, Any]) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _stream(self, events: Any) -> None:
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
        self.send_header("Cache-Control", "no-cache, no-store")
        self.send_header("Connection", "close")
        self.end_headers()
        self.close_connection = True
        try:
            for event in events:
                data = json.dumps(event, ensure_ascii=False).encode("utf-8") + b"\n"
                self.wfile.write(data)
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            CANCEL_EVENT.set()
        except Exception as exc:
            try:
                data = json.dumps({"type": "error", "error": str(exc)}, ensure_ascii=False).encode("utf-8") + b"\n"
                self.wfile.write(data)
                self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                CANCEL_EVENT.set()

    def _body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if not length:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def do_GET(self) -> None:
        if self.path == "/health":
            self._json(HTTPStatus.OK, {"ok": True})
        elif self.path == "/status":
            self._json(HTTPStatus.OK, {"ok": True, **STATE})
        else:
            self._json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Not found"})

    def do_POST(self) -> None:
        try:
            body = self._body()
            if self.path == "/load":
                self._json(HTTPStatus.OK, load_model(body))
            elif self.path == "/chat":
                self._json(HTTPStatus.OK, chat(body))
            elif self.path == "/chat/stream":
                self._stream(stream_chat(body))
            elif self.path == "/cancel":
                CANCEL_EVENT.set()
                self._json(HTTPStatus.OK, {"ok": True})
            elif self.path == "/shutdown":
                self._json(HTTPStatus.OK, {"ok": True})
                if SERVER:
                    threading.Thread(target=SERVER.shutdown, daemon=True).start()
            else:
                self._json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Not found"})
        except Exception as exc:
            self._json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": str(exc)})


def main() -> None:
    global SERVER
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    args = parser.parse_args()
    SERVER = ThreadingHTTPServer(("127.0.0.1", args.port), WorkerHandler)
    print(f"Worker listening on http://127.0.0.1:{args.port}", flush=True)
    SERVER.serve_forever(poll_interval=0.25)


if __name__ == "__main__":
    main()
