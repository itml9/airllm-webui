# AirLLM WebUI

[English](README.md) | **简体中文**

一个面向 Windows 的本地 [AirLLM](https://github.com/lyogavin/airllm) 管理与问答界面。通过浏览器完成 Python 环境检测、虚拟环境创建、PyTorch/AirLLM 安装、Hugging Face 模型准备和本地对话。

![AirLLM WebUI 预览](docs/preview.png)

> AirLLM WebUI 是独立的社区项目，不隶属于或代表 AirLLM 官方项目。

## 特性

- 双击 `start.bat` 启动本地服务并自动打开浏览器。
- 选择 Python 可执行文件，检测 Python、pip、PyTorch、AirLLM、CUDA 和 GPU。
- 创建项目专用 `.venv`，避免修改系统 Python 环境。
- 按需安装 PyTorch、AirLLM 和 bitsandbytes，并显示后台任务日志。
- 配置 Hugging Face 镜像、HTTP/HTTPS 代理、访问 Token、缓存目录和 AirLLM 分层目录。
- 显示模型下载、分层准备和模型加载进度。
- GPT 风格本地问答页面，支持新对话、快捷提问、Enter 发送和 Shift+Enter 换行。
- 配置页和问答页支持中文 / English，语言选择会自动保存到本机。
- 主服务和推理 worker 默认只绑定 `127.0.0.1`。

## 快速开始

1. 安装 Windows Python 3.10 或更新版本。
2. 双击 `start.bat`。
3. 在“配置中心”选择 Python 并点击“检测环境”。
4. 可选：点击“创建虚拟环境”。
5. 选择需要的依赖并点击“安装选中的依赖”。
6. 配置模型 ID，例如 `Qwen/Qwen3-0.6B`，然后点击“下载并准备模型”。
7. 点击“加载模型”，进入“本地问答”。

首次下载模型可能需要较长时间和大量磁盘空间。AirLLM 会先下载 Hugging Face 权重，再在本地生成逐层分片。

## 目录结构

```text
airllm-webui/
├─ start.bat                 # Windows 启动入口
├─ server.py                 # 配置 API、静态文件服务和任务管理
├─ app_core.py               # 环境检测、安装任务和 worker 管理
├─ model_prepare.py          # 使用目标 Python 准备模型
├─ inference_worker.py       # AirLLM 推理 worker
├─ frontend/                 # 浏览器界面
├─ docs/preview.png          # GitHub 预览图
└─ data/                     # 本地运行时数据，模型和 Token 会被排除
```

## 运行要求

- Windows 10/11
- Python 3.10+
- NVIDIA GPU 可选；CPU 模式也可以运行，但速度通常较慢
- 使用 CUDA 时，需要兼容的 NVIDIA 驱动和 PyTorch wheel
- 运行依赖由配置页安装到选定的 Python 环境中

## 安全与隐私

- 服务默认只监听 `127.0.0.1`，不会主动暴露到局域网。
- Hugging Face Token 保存在本机 `data/config.json`，前端不会将其发送到第三方服务。
- `.gitignore` 会排除 Token、虚拟环境、模型缓存、分层文件和任务运行数据。
- 不要把 `data/config.json`、模型目录或 `.venv` 提交到公开仓库。

## 许可

本项目使用 Apache License 2.0，见 [LICENSE](LICENSE)。第三方依赖和资源说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
