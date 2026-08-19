/* global lucide */

const state = {
  config: {},
  environment: null,
  system: null,
  model: { running: false, loaded: false, state: "stopped" },
  messages: [],
  activeJob: null,
  jobPoll: null,
  busy: false,
  chatAbort: null,
};

const translations = {
  "zh-CN": {
    mainNav: "主导航", brandCaption: "本地模型工作台", navConfig: "配置中心", navChat: "本地问答", sidebarOnline: "本地服务在线", sidebarConnecting: "正在连接本地服务", sidebarOffline: "服务连接失败", localOnly: "仅绑定 127.0.0.1", newChat: "新对话", recentChats: "最近对话", local: "本地", currentChat: "新的本地对话",
    eyebrow: "AIRLLM / LOCAL RUNTIME", configTitle: "配置中心", chatTitle: "本地问答", serviceOnline: "本地服务在线", serviceConnecting: "服务连接中", serviceOffline: "服务连接失败", refresh: "刷新状态", language: "界面语言", modelSource: "模型来源", choosePython: "选择 Python", chooseDirectory: "选择目录", chooseModelDirectory: "选择模型目录", shortcuts: "快捷提问", runtimeSetup: "RUNTIME SETUP", configIntro: "把本地环境准备到可以回答问题", saveConfig: "保存配置", saved: "配置已保存",
    pythonSection: "Python 环境", pythonDesc: "选择用来安装依赖和运行 AirLLM 的 Python。", notDetected: "未检测", failed: "检测失败", basePython: "基础 Python 可执行文件", pythonPlaceholder: "例如 C:\\Python311\\python.exe", browserPathHelp: "浏览器无法直接读取 exe 的完整路径，选择按钮会打开 Windows 文件选择器。", venvPath: "项目虚拟环境目录", venvPlaceholder: "项目目录/.venv", venvHelp: "推荐使用项目专用环境，避免修改系统 Python。", preferVenv: "优先使用项目虚拟环境", detect: "检测环境", detecting: "检测中…", createVenv: "创建虚拟环境", creating: "创建中…", detectPrompt: "选择 Python 后点击“检测环境”。", systemEnv: "系统环境", projectEnv: "项目虚拟环境", cudaAvailable: "可用", cudaNotAvailable: "不可用", needPytorch: "待安装 PyTorch", gpuNotDetected: "未检测到",
    dependencySection: "依赖安装", dependencyDesc: "按需安装运行本地模型所需的 Python 包。", waitingDetect: "等待检测", detected: "已检测", installed: "已安装", notInstalled: "未安装", optional: "可选", pytorch: "PyTorch", pytorchDesc: "模型运行时和 CUDA 支持", airllm: "AirLLM", airllmDesc: "逐层加载和本地推理", bnb: "bitsandbytes", bnbDesc: "启用 4bit / 8bit 压缩时需要", torchChannel: "PyTorch 安装渠道", torchHelp: "优先选择与显卡驱动兼容的 CUDA wheel；也可以保留自动安装。", autoPypi: "自动使用 PyPI", cuda128: "CUDA 12.8 官方源", cuda126: "CUDA 12.6 官方源", cuda124: "CUDA 12.4 官方源", cpuSource: "CPU 官方源", installTask: "安装任务", installSelected: "安装选中的依赖", installing: "安装中…",
    modelSection: "模型来源与下载", modelDesc: "模型下载和切分会在本地后台任务中执行。", notReady: "未准备", ready: "已就绪", serviceRunning: "服务运行中", hfModel: "Hugging Face 模型", localModel: "本地模型目录", modelId: "模型 ID", modelIdHelp: "AirLLM 通过 Hugging Face Hub 获取模型文件。", localModelPath: "本地模型目录", localModelPlaceholder: "选择包含 config.json 的目录", localModelHelp: "目录应包含 config.json 和模型权重文件。", hfEndpoint: "Hugging Face 镜像地址", hfEndpointHelp: "例如 https://hf-mirror.com；会设置 HF_ENDPOINT。", hfToken: "Hugging Face Token", tokenPlaceholder: "可选，gated 模型需要", tokenHelp: "Token 只保存在本机配置文件。", tokenSavedHelp: "已保存 Token；留空会保留现有值。", httpProxy: "HTTP 代理", httpsProxy: "HTTPS 代理", cacheDir: "Hugging Face 缓存目录", shardsDir: "AirLLM 分层目录", prepareModel: "下载并准备模型", preparing: "准备中…", loadModel: "加载模型", loading: "加载中…", stopModel: "停止模型", stopped: "模型服务已停止", modelTask: "模型任务", dependencyTask: "安装任务", queued: "排队中", running: "运行中", completed: "已完成", error: "失败", taskStarting: "正在启动", taskWaiting: "准备中",
    inferenceSection: "推理参数", inferenceDesc: "这些参数会应用到问答页的每次生成。", adjustable: "可随时调整", device: "运行设备", autoDevice: "自动选择", cudaDevice: "CUDA 0", cpuDevice: "CPU", maxSeqLen: "上下文长度", maxNewTokens: "最大新 token", compression: "分层压缩", compressionOff: "关闭", prefetch: "启用 prefetching", deleteOriginal: "切分后删除原始权重",
    chatModel: "本地模型", modelReady: "模型已就绪", chatModelUnloaded: "模型未加载", chatNew: "新的本地对话", chatLocalNote: "模型加载后，回答会留在这台电脑上。", chatNeedLoad: "请先在配置中心加载一个模型。", promptGpu: "解释 AirLLM 的显存机制", promptConfig: "检查模型配置", promptPython: "写一个 Python 示例", clearChat: "清空对话", send: "发送消息", stopGenerating: "停止生成", generationStopped: "已停止生成", streamDisconnected: "生成连接意外中断", chatLoad: "加载模型", composerPlaceholder: "给本地模型发消息…", localAirllm: "本地 AirLLM", composerHint: "Enter 发送 · Shift + Enter 换行", you: "你", assistant: "AirLLM", tokens: "tokens", seconds: "s", requestFailed: "请求失败：", pleaseLoad: "请先加载模型", noResponse: "（模型没有返回内容）", languageSaved: "语言设置已保存", environmentDetected: "Python 环境检测完成", statusRefreshed: "状态已刷新", cannotConnect: "无法连接本地 Python 服务，请关闭并重新运行 start.bat。",
  },
  "en-US": {
    mainNav: "Main navigation", brandCaption: "Local model workspace", navConfig: "Configuration", navChat: "Local chat", sidebarOnline: "Local service online", sidebarConnecting: "Connecting to local service", sidebarOffline: "Service connection failed", localOnly: "Bound to 127.0.0.1", newChat: "New chat", recentChats: "Recent chats", local: "Local", currentChat: "New local chat",
    eyebrow: "AIRLLM / LOCAL RUNTIME", configTitle: "Configuration", chatTitle: "Local chat", serviceOnline: "Local service online", serviceConnecting: "Connecting", serviceOffline: "Service connection failed", refresh: "Refresh status", language: "Interface language", modelSource: "Model source", choosePython: "Choose Python", chooseDirectory: "Choose directory", chooseModelDirectory: "Choose model directory", shortcuts: "Quick prompts", runtimeSetup: "RUNTIME SETUP", configIntro: "Prepare the local runtime for model conversations", saveConfig: "Save configuration", saved: "Configuration saved",
    pythonSection: "Python environment", pythonDesc: "Choose the Python executable used to install dependencies and run AirLLM.", notDetected: "Not detected", failed: "Detection failed", basePython: "Base Python executable", pythonPlaceholder: "For example C:\\Python311\\python.exe", browserPathHelp: "The browser cannot expose a full exe path; the button opens a Windows file picker.", venvPath: "Project virtual environment", venvPlaceholder: "project/.venv", venvHelp: "A project environment keeps the system Python untouched.", preferVenv: "Prefer the project virtual environment", detect: "Detect environment", detecting: "Detecting…", createVenv: "Create virtual environment", creating: "Creating…", detectPrompt: "Choose Python, then run environment detection.", systemEnv: "System Python", projectEnv: "Project environment", cudaAvailable: "Available", cudaNotAvailable: "Unavailable", needPytorch: "Install PyTorch first", gpuNotDetected: "Not detected",
    dependencySection: "Dependencies", dependencyDesc: "Install only the Python packages needed for the local runtime.", waitingDetect: "Waiting for detection", detected: "Detected", installed: "Installed", notInstalled: "Not installed", optional: "Optional", pytorch: "PyTorch", pytorchDesc: "Runtime and CUDA support", airllm: "AirLLM", airllmDesc: "Layer streaming and local inference", bnb: "bitsandbytes", bnbDesc: "Required for 4bit / 8bit compression", torchChannel: "PyTorch install channel", torchHelp: "Choose a CUDA wheel compatible with your driver, or keep automatic installation.", autoPypi: "Automatic PyPI", cuda128: "CUDA 12.8 official index", cuda126: "CUDA 12.6 official index", cuda124: "CUDA 12.4 official index", cpuSource: "CPU official index", installTask: "Install task", installSelected: "Install selected packages", installing: "Installing…",
    modelSection: "Model source and download", modelDesc: "Downloads and layer preparation run as local background jobs.", notReady: "Not prepared", ready: "Ready", serviceRunning: "Service running", hfModel: "Hugging Face model", localModel: "Local model directory", modelId: "Model ID", modelIdHelp: "AirLLM fetches model files through the Hugging Face Hub.", localModelPath: "Local model directory", localModelPlaceholder: "Choose a directory containing config.json", localModelHelp: "The directory should contain config.json and model weights.", hfEndpoint: "Hugging Face endpoint", hfEndpointHelp: "For example https://hf-mirror.com; sets HF_ENDPOINT.", hfToken: "Hugging Face token", tokenPlaceholder: "Optional; required for gated models", tokenHelp: "The token is stored only in the local config file.", tokenSavedHelp: "A token is saved; leave blank to keep it.", httpProxy: "HTTP proxy", httpsProxy: "HTTPS proxy", cacheDir: "Hugging Face cache directory", shardsDir: "AirLLM layer directory", prepareModel: "Download and prepare model", preparing: "Preparing…", loadModel: "Load model", loading: "Loading…", stopModel: "Stop model", stopped: "Model service stopped", modelTask: "Model task", dependencyTask: "Install task", queued: "Queued", running: "Running", completed: "Completed", error: "Failed", taskStarting: "Starting", taskWaiting: "Preparing",
    inferenceSection: "Generation parameters", inferenceDesc: "These values apply to each response in the chat view.", adjustable: "Adjustable", device: "Device", autoDevice: "Auto select", cudaDevice: "CUDA 0", cpuDevice: "CPU", maxSeqLen: "Context length", maxNewTokens: "Max new tokens", compression: "Layer compression", compressionOff: "Off", prefetch: "Enable prefetching", deleteOriginal: "Delete original weights after splitting",
    chatModel: "Local model", modelReady: "Model ready", chatModelUnloaded: "Model not loaded", chatNew: "New local chat", chatLocalNote: "Responses stay on this computer after the model is loaded.", chatNeedLoad: "Load a model from Configuration first.", promptGpu: "Explain AirLLM memory usage", promptConfig: "Check model configuration", promptPython: "Write a Python inference example", clearChat: "Clear chat", send: "Send message", stopGenerating: "Stop generating", generationStopped: "Generation stopped", streamDisconnected: "The generation stream ended unexpectedly", chatLoad: "Load model", composerPlaceholder: "Message the local model…", localAirllm: "Local AirLLM", composerHint: "Enter to send · Shift + Enter for a new line", you: "You", assistant: "AirLLM", tokens: "tokens", seconds: "s", requestFailed: "Request failed: ", pleaseLoad: "Load a model first", noResponse: "(The model returned no content)", languageSaved: "Language saved", environmentDetected: "Python environment detected", statusRefreshed: "Status refreshed", cannotConnect: "Cannot connect to the local Python service. Restart start.bat.",
  },
};

function currentLanguage() { return state.config.language === "en-US" ? "en-US" : "zh-CN"; }
function t(key) { return translations[currentLanguage()][key] || translations["zh-CN"][key] || key; }

const $ = (id) => document.getElementById(id);
const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => [...document.querySelectorAll(selector)];

function fieldNode(id, className) { return document.getElementById(id)?.closest(".field")?.querySelector(className); }
function setNode(getter, key) { const element = getter(); if (element) element.textContent = t(key); }
function setPlaceholder(id, key) { const element = $(id); if (element) element.placeholder = t(key); }
function setAttribute(selector, name, value) { const element = qs(selector); if (element) element.setAttribute(name, value); }
function setAttributes(selector, name, value) { qsa(selector).forEach((element) => element.setAttribute(name, value)); }

function applyLanguage() {
  document.documentElement.lang = currentLanguage() === "en-US" ? "en" : "zh-CN";
  document.title = currentLanguage() === "en-US" ? "AirLLM WebUI" : "AirLLM WebUI";
  const bindings = [
    [() => qs(".brand-caption"), "brandCaption"], [() => qs('.nav-item[data-view="config-view"] span'), "navConfig"], [() => qs('.nav-item[data-view="chat-view"] span'), "navChat"], [() => qs(".sidebar-footnote"), "localOnly"], [() => qs("#sidebar-new-chat span"), "newChat"], [() => qs(".history-heading span:first-child"), "recentChats"], [() => qs(".history-heading span:last-child"), "local"], [() => qs("#sidebar-current-chat span"), "currentChat"],
    [() => qs(".topbar .eyebrow"), "eyebrow"], [() => qs("#save-config-button span"), "saveConfig"], [() => qs("#config-view .section-kicker"), "runtimeSetup"], [() => qs("#config-view .page-intro h2"), "configIntro"],
    [() => qs("#python-section-status"), "notDetected"], [() => qs("#dependency-status"), "waitingDetect"], [() => qs("#model-section-status"), "notReady"], [() => qs("#config-view .config-section-last .section-status"), "adjustable"],
    [() => qs("#config-view .config-section:nth-of-type(1) h3"), "pythonSection"], [() => qs("#config-view .config-section:nth-of-type(1) .section-heading p"), "pythonDesc"], [() => qs("#config-view .config-section:nth-of-type(2) h3"), "dependencySection"], [() => qs("#config-view .config-section:nth-of-type(2) .section-heading p"), "dependencyDesc"], [() => qs("#config-view .config-section:nth-of-type(3) h3"), "modelSection"], [() => qs("#config-view .config-section:nth-of-type(3) .section-heading p"), "modelDesc"], [() => qs("#config-view .config-section:nth-of-type(4) h3"), "inferenceSection"], [() => qs("#config-view .config-section:nth-of-type(4) .section-heading p"), "inferenceDesc"],
    [() => fieldNode("python-path", ".field-label"), "basePython"], [() => fieldNode("python-path", ".field-help"), "browserPathHelp"], [() => fieldNode("venv-path", ".field-label"), "venvPath"], [() => fieldNode("venv-path", ".field-help"), "venvHelp"], [() => qs("#use-project-venv")?.closest(".switch-control")?.querySelector(".switch-label"), "preferVenv"], [() => qs("#detect-environment-button span"), "detect"], [() => qs("#create-venv-button span"), "createVenv"], [() => qs("#environment-grid .environment-empty"), "detectPrompt"],
    [() => qs("#install-pytorch")?.closest(".dependency-item")?.querySelector(".dependency-copy strong"), "pytorch"], [() => qs("#install-pytorch")?.closest(".dependency-item")?.querySelector(".dependency-copy small"), "pytorchDesc"], [() => qs("#install-airllm")?.closest(".dependency-item")?.querySelector(".dependency-copy strong"), "airllm"], [() => qs("#install-airllm")?.closest(".dependency-item")?.querySelector(".dependency-copy small"), "airllmDesc"], [() => qs("#install-bnb")?.closest(".dependency-item")?.querySelector(".dependency-copy strong"), "bnb"], [() => qs("#install-bnb")?.closest(".dependency-item")?.querySelector(".dependency-copy small"), "bnbDesc"], [() => fieldNode("torch-channel", ".field-label"), "torchChannel"], [() => fieldNode("torch-channel", ".field-help"), "torchHelp"], [() => qs("#install-dependencies-button span"), "installSelected"],
    [() => qs('[data-model-source="huggingface"] span'), "hfModel"], [() => qs('[data-model-source="local"] span'), "localModel"], [() => fieldNode("model-id", ".field-label"), "modelId"], [() => fieldNode("model-id", ".field-help"), "modelIdHelp"], [() => fieldNode("local-model-path", ".field-label"), "localModelPath"], [() => fieldNode("local-model-path", ".field-help"), "localModelHelp"], [() => fieldNode("hf-endpoint", ".field-label"), "hfEndpoint"], [() => fieldNode("hf-endpoint", ".field-help"), "hfEndpointHelp"], [() => fieldNode("hf-token", ".field-label"), "hfToken"], [() => fieldNode("http-proxy", ".field-label"), "httpProxy"], [() => fieldNode("https-proxy", ".field-label"), "httpsProxy"], [() => fieldNode("cache-dir", ".field-label"), "cacheDir"], [() => fieldNode("shards-dir", ".field-label"), "shardsDir"], [() => qs("#prepare-model-button span"), "prepareModel"], [() => qs("#load-model-button span"), "loadModel"], [() => qs("#unload-model-button span"), "stopModel"],
    [() => fieldNode("device", ".field-label"), "device"], [() => fieldNode("max-seq-len", ".field-label"), "maxSeqLen"], [() => fieldNode("max-new-tokens", ".field-label"), "maxNewTokens"], [() => fieldNode("compression", ".field-label"), "compression"], [() => qs("#prefetching")?.closest(".switch-control")?.querySelector(".switch-label"), "prefetch"], [() => qs("#delete-original")?.closest(".switch-control")?.querySelector(".switch-label"), "deleteOriginal"],
    [() => qs("#chat-model-select .chat-model-label"), "chatModel"], [() => qs("#chat-load-button span"), "chatLoad"], [() => qs("#chat-empty h2"), "chatNew"], [() => qs("#chat-empty-subtitle"), "chatNeedLoad"], [() => qs('[data-prompt="解释一下 AirLLM 是如何节省显存的"] span'), "promptGpu"], [() => qs('[data-prompt="帮我检查一下本地模型应该如何配置"] span'), "promptConfig"], [() => qs('[data-prompt="写一个最小的 Python 推理示例"] span'), "promptPython"], [() => qs("#chat-footnote"), "composerHint"], [() => qs(".composer-meta span:first-child"), "localAirllm"],
    [() => qs("#pytorch-state"), "waitingDetect"], [() => qs("#airllm-state"), "waitingDetect"], [() => qs("#bnb-state"), "optional"], [() => qs(".field-action-field .field-label"), "installTask"],
    [() => qs("#dependency-job-title"), "installTask"], [() => qs("#dependency-job-phase"), "taskWaiting"], [() => qs("#dependency-job-status"), "queued"], [() => qs("#model-job-title"), "modelTask"], [() => qs("#model-job-phase"), "taskWaiting"], [() => qs("#model-job-status"), "queued"],
  ];
  bindings.forEach(([getter, key]) => setNode(getter, key));
  setAttribute(".sidebar", "aria-label", t("mainNav"));
  setPlaceholder("python-path", "pythonPlaceholder"); setPlaceholder("venv-path", "venvPlaceholder"); setPlaceholder("local-model-path", "localModelPlaceholder"); setPlaceholder("hf-token", "tokenPlaceholder"); setPlaceholder("chat-input", "composerPlaceholder");
  const torchOptions = [["", "autoPypi"], ["https://download.pytorch.org/whl/cu128", "cuda128"], ["https://download.pytorch.org/whl/cu126", "cuda126"], ["https://download.pytorch.org/whl/cu124", "cuda124"], ["https://download.pytorch.org/whl/cpu", "cpuSource"]];
  torchOptions.forEach(([value, key]) => { const option = qs(`#torch-channel option[value="${value}"]`); if (option) option.textContent = t(key); });
  const deviceOptions = [["auto", "autoDevice"], ["cuda:0", "cudaDevice"], ["cpu", "cpuDevice"]]; deviceOptions.forEach(([value, key]) => { const option = qs(`#device option[value="${value}"]`); if (option) option.textContent = t(key); });
  const compressionOptions = [["none", "compressionOff"], ["4bit", "4bit"], ["8bit", "8bit"]]; compressionOptions.forEach(([value, key]) => { const option = qs(`#compression option[value="${value}"]`); if (option) option.textContent = key === "4bit" || key === "8bit" ? key : t(key); });
  $("page-title").textContent = $("chat-view")?.classList.contains("is-active") ? t("chatTitle") : t("configTitle");
  setAttribute(".language-control", "title", t("language")); setAttribute("#language-select", "aria-label", t("language")); setAttribute("#refresh-button", "title", t("refresh")); setAttribute("#refresh-button", "aria-label", t("refresh")); setAttribute(".segmented-control", "aria-label", t("modelSource")); setAttribute(".prompt-suggestions", "aria-label", t("shortcuts"));
  setAttribute("#choose-python-button", "title", t("choosePython")); setAttribute("#choose-python-button", "aria-label", t("choosePython")); setAttribute("#choose-venv-button", "title", t("chooseDirectory")); setAttribute("#choose-venv-button", "aria-label", t("chooseDirectory")); setAttribute("#choose-model-button", "title", t("chooseModelDirectory")); setAttribute("#choose-model-button", "aria-label", t("chooseModelDirectory")); setAttributes("[data-pick-target]", "title", t("chooseDirectory")); setAttributes("[data-pick-target]", "aria-label", t("chooseDirectory"));
  setAttribute("#chat-model-select", "title", t("chatModel")); setAttribute("#clear-chat-button", "title", t("clearChat")); setAttribute("#clear-chat-button", "aria-label", t("clearChat")); setAttribute("#chat-input", "aria-label", t("send"));
  $("token-help").textContent = state.config.hf_token_saved ? t("tokenSavedHelp") : t("tokenHelp");
  const serviceText = $("service-state")?.querySelector("span:last-child"); if (serviceText) serviceText.textContent = state.model.running ? t("serviceRunning") : t("serviceOnline");
  setChatRunning(state.busy);
  refreshIcons();
}

function refreshIcons() {
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
  });
  const data = await response.json().catch(() => ({ ok: false, error: "服务器没有返回 JSON" }));
  if (!response.ok || data.ok === false) throw new Error(data.error || `请求失败（${response.status}）`);
  return data;
}

function toast(message, tone = "info") {
  const item = document.createElement("div");
  item.className = `toast${tone === "error" ? " is-error" : tone === "warn" ? " is-warn" : ""}`;
  item.innerHTML = `<i data-lucide="${tone === "error" ? "circle-alert" : tone === "warn" ? "triangle-alert" : "check-circle-2"}"></i><span></span>`;
  item.querySelector("span").textContent = message;
  $("toast-region").append(item);
  refreshIcons();
  window.setTimeout(() => item.remove(), 4200);
}

function setBusy(button, busy, busyLabel = "处理中…") {
  if (!button) return;
  if (busy) {
    button.dataset.originalLabel = button.innerHTML;
    button.innerHTML = `<i data-lucide="loader-circle" class="spin"></i><span>${busyLabel}</span>`;
    button.disabled = true;
  } else if (button.dataset.originalLabel) {
    button.innerHTML = button.dataset.originalLabel;
    delete button.dataset.originalLabel;
    button.disabled = false;
  }
  refreshIcons();
}

function formatStatus(value) { return value ? t("installed") : t("notInstalled"); }

function setDot(element, tone) {
  if (!element) return;
  const dot = element.querySelector(".status-dot");
  if (!dot) return;
  dot.className = `status-dot status-dot-${tone}`;
}

function updateServiceState(connected = true) {
  const stateEl = $("service-state");
  const sidebarEl = $("sidebar-runtime");
  if (connected) {
    stateEl.querySelector("span:last-child").textContent = t("serviceOnline");
    sidebarEl.querySelector("span:last-child").textContent = t("sidebarOnline");
    setDot(stateEl, "success"); setDot(sidebarEl, "success");
  } else {
    stateEl.querySelector("span:last-child").textContent = t("serviceOffline");
    sidebarEl.querySelector("span:last-child").textContent = t("sidebarOffline");
    setDot(stateEl, "danger"); setDot(sidebarEl, "danger");
  }
}

function bindForm(config) {
  const map = {
    "language": "language-select",
    "python_path": "python-path", "venv_path": "venv-path", "model_id": "model-id", "local_model_path": "local-model-path",
    "hf_endpoint": "hf-endpoint", "http_proxy": "http-proxy", "https_proxy": "https-proxy", "cache_dir": "cache-dir", "shards_dir": "shards-dir",
    "device": "device", "max_seq_len": "max-seq-len", "max_new_tokens": "max-new-tokens", "temperature": "temperature", "top_p": "top-p",
    "repetition_penalty": "repetition-penalty", "compression": "compression", "use_project_venv": "use-project-venv", "prefetching": "prefetching", "delete_original": "delete-original",
  };
  Object.entries(map).forEach(([key, id]) => {
    const control = $(id);
    if (!control || config[key] === undefined) return;
    if (control.type === "checkbox") control.checked = Boolean(config[key]);
    else control.value = config[key];
  });
  $("hf-token").value = "";
  $("token-help").textContent = config.hf_token_saved ? t("tokenSavedHelp") : t("tokenHelp");
  qsa("[data-model-source]").forEach((button) => button.classList.toggle("is-active", button.dataset.modelSource === (config.model_source || "huggingface")));
  updateModelSourceFields(config.model_source || "huggingface");
  applyLanguage();
}

function readForm() {
  const value = (id) => $(id).value.trim();
  return {
    language: $("language-select").value, python_path: value("python-path"), venv_path: value("venv-path"), use_project_venv: $("use-project-venv").checked,
    model_source: qs("[data-model-source].is-active")?.dataset.modelSource || "huggingface", model_id: value("model-id"), local_model_path: value("local-model-path"),
    hf_endpoint: value("hf-endpoint") || "https://huggingface.co", hf_token: value("hf-token"), http_proxy: value("http-proxy"), https_proxy: value("https-proxy"),
    cache_dir: value("cache-dir"), shards_dir: value("shards-dir"), device: value("device"), max_seq_len: Number(value("max-seq-len")), max_new_tokens: Number(value("max-new-tokens")),
    temperature: Number(value("temperature")), top_p: Number(value("top-p")), repetition_penalty: Number(value("repetition-penalty")), compression: value("compression"),
    prefetching: $("prefetching").checked, delete_original: $("delete-original").checked, torch_index_url: $("torch-channel").value,
  };
}

function updateModelSourceFields(source) {
  const local = source === "local";
  $("model-id-field").classList.toggle("is-hidden", local);
  $("local-model-field").classList.toggle("is-hidden", !local);
}

function renderEnvironment(info) {
  state.environment = info;
  const grid = $("environment-grid");
  if (!info) { grid.innerHTML = `<div class="environment-empty">${escapeHtml(t("detectPrompt"))}</div>`; return; }
  if (!info.ok) { grid.innerHTML = `<div class="environment-empty">${escapeHtml(info.error || t("failed"))}</div>`; $("python-section-status").textContent = t("failed"); return; }
  $("python-section-status").textContent = info.is_venv ? t("projectEnv") : t("systemEnv");
  const cells = [
    ["Python", `${info.python_version} · ${info.architecture}`, ""], ["pip", formatStatus(info.pip?.installed), info.pip?.version || ""],
    ["PyTorch", formatStatus(info.torch?.installed), info.torch?.version || ""], ["AirLLM", formatStatus(info.airllm?.installed), info.airllm?.version || ""],
    ["CUDA", info.cuda_available ? t("cudaAvailable") : info.torch?.installed ? t("cudaNotAvailable") : t("needPytorch"), info.cuda_version || ""], ["GPU", info.gpu_name || state.system?.gpu?.name || t("gpuNotDetected"), info.gpu_memory_gb ? `${info.gpu_memory_gb} GB` : ""],
    [currentLanguage() === "en-US" ? "Environment" : "环境位置", info.is_venv ? t("projectEnv") : t("systemEnv"), info.prefix], [currentLanguage() === "en-US" ? "Python path" : "Python 路径", info.python_path, ""],
  ];
  grid.innerHTML = cells.map(([label, value, extra]) => `<div class="environment-cell"><div class="environment-label">${escapeHtml(label)}</div><div class="environment-value ${value === t("installed") || value === t("cudaAvailable") ? "is-good" : ""}" title="${escapeHtml(`${value} ${extra}`)}">${escapeHtml(value)}</div>${extra ? `<div class="environment-label">${escapeHtml(extra)}</div>` : ""}</div>`).join("");
  $("dependency-status").textContent = t("detected");
  setDependencyState("pytorch-state", info.torch, info.torch?.installed ? `${info.torch.version}` : t("notInstalled"));
  setDependencyState("airllm-state", info.airllm, info.airllm?.installed ? `${info.airllm.version}` : t("notInstalled"));
  setDependencyState("bnb-state", info.bitsandbytes, info.bitsandbytes?.installed ? `${info.bitsandbytes.version}` : t("optional"));
}

function setDependencyState(id, packageInfo, label) {
  const element = $(id); element.textContent = label; element.classList.toggle("is-good", Boolean(packageInfo?.installed)); element.classList.toggle("is-warn", !packageInfo?.installed);
}

function escapeHtml(text) {
  const node = document.createElement("div"); node.textContent = text ?? ""; return node.innerHTML;
}

function showNotice(message) { const notice = $("config-notice"); notice.hidden = !message; notice.querySelector("span").textContent = message || ""; refreshIcons(); }

async function saveConfig(showMessage = true) {
  const result = await api("/api/config", { method: "POST", body: readForm() });
  state.config = result.config; bindForm(state.config); if (showMessage) toast(t("saved")); return result.config;
}

async function choosePath(kind, targetId) {
  try {
    const result = await api("/api/path/select", { method: "POST", body: { kind } });
    if (result.path) $(targetId).value = result.path;
  } catch (error) { toast(error.message, "error"); }
}

async function detectEnvironment() {
  const button = $("detect-environment-button"); setBusy(button, true, t("detecting"));
  try {
    await saveConfig(false);
    const result = await api("/api/environment/detect", { method: "POST", body: { python_path: $("python-path").value.trim() } });
    renderEnvironment(result); toast(t("environmentDetected"));
  } catch (error) { renderEnvironment({ ok: false, error: error.message }); toast(error.message, "error"); }
  finally { setBusy(button, false); }
}

async function createVenv() {
  const button = $("create-venv-button"); setBusy(button, true, t("creating"));
  try {
    await saveConfig(false);
    const result = await api("/api/environment/create-venv", { method: "POST", body: { python_path: $("python-path").value.trim(), venv_path: $("venv-path").value.trim() } });
    await trackJob(result.job, "dependency");
  } catch (error) { toast(error.message, "error"); }
  finally { setBusy(button, false); }
}

async function installDependencies() {
  const button = $("install-dependencies-button"); setBusy(button, true, t("installing"));
  try {
    await saveConfig(false);
    const result = await api("/api/environment/install", { method: "POST", body: { pytorch: $("install-pytorch").checked, airllm: $("install-airllm").checked, bitsandbytes: $("install-bnb").checked, torch_index_url: $("torch-channel").value } });
    await trackJob(result.job, "dependency");
  } catch (error) { toast(error.message, "error"); }
  finally { setBusy(button, false); }
}

async function prepareModel() {
  const button = $("prepare-model-button"); setBusy(button, true, t("preparing"));
  try {
    await saveConfig(false);
    const result = await api("/api/model/prepare", { method: "POST", body: { config: readForm() } });
    await trackJob(result.job, "model");
  } catch (error) { toast(error.message, "error"); }
  finally { setBusy(button, false); }
}

async function loadModel() {
  const button = $("load-model-button"); const chatButton = $("chat-load-button"); setBusy(button, true, t("loading")); setBusy(chatButton, true, t("loading"));
  try {
    await saveConfig(false);
    const result = await api("/api/model/load", { method: "POST", body: { config: readForm() } });
    await trackJob(result.job, "model");
    await refreshModelStatus();
  } catch (error) { toast(error.message, "error"); }
  finally { setBusy(button, false); setBusy(chatButton, false); }
}

async function unloadModel() {
  try { await api("/api/model/unload", { method: "POST", body: {} }); await refreshModelStatus(); toast(t("stopped")); }
  catch (error) { toast(error.message, "error"); }
}

function jobElements(kind) {
  return kind === "dependency" ? { panel: $("dependency-job-panel"), title: $("dependency-job-title"), phase: $("dependency-job-phase"), bar: $("dependency-progress-bar"), label: $("dependency-progress-label"), status: $("dependency-job-status"), log: $("dependency-job-log") } : { panel: $("model-job-panel"), title: $("model-job-title"), phase: $("model-job-phase"), bar: $("model-progress-bar"), label: $("model-progress-label"), status: $("model-job-status"), log: $("model-job-log") };
}

function localizedJobTitle(kind, fallback) { return kind === "install" || kind === "create_venv" ? t("dependencyTask") : kind === "prepare_model" || kind === "load_model" ? t("modelTask") : fallback; }
function localizedJobPhase(phase) {
  if (currentLanguage() === "zh-CN") return phase;
  const map = { "正在启动": "Starting", "创建虚拟环境": "Creating virtual environment", "初始化 pip": "Initializing pip", "安装 PyTorch": "Installing PyTorch", "安装 AirLLM": "Installing AirLLM", "安装 bitsandbytes": "Installing bitsandbytes", "下载并准备模型": "Downloading and preparing model", "启动模型服务": "Starting model service", "加载 AirLLM 模型": "Loading AirLLM model", "已完成": "Completed", "执行失败": "Failed" };
  return map[phase] || phase;
}

async function trackJob(job, panelKind) {
  state.activeJob = job; const elements = jobElements(panelKind); elements.panel.hidden = false; elements.title.textContent = localizedJobTitle(job.kind, job.title);
  if (state.jobPoll) clearInterval(state.jobPoll);
  const update = async () => {
    try {
      const result = await api(`/api/jobs/${job.id}`); const current = result.job;
      elements.title.textContent = localizedJobTitle(current.kind, current.title); elements.phase.textContent = localizedJobPhase(current.phase); elements.bar.style.width = `${current.progress || 0}%`; elements.label.textContent = `${current.progress || 0}%`; elements.status.textContent = jobStatus(current.status); elements.log.textContent = current.logs.join("\n"); elements.log.scrollTop = elements.log.scrollHeight;
      if (["completed", "failed"].includes(current.status)) {
        clearInterval(state.jobPoll); state.jobPoll = null;
        if (current.status === "completed") { toast(`${localizedJobTitle(current.kind, current.title)} ${t("completed")}`); if (current.kind === "create_venv" || current.kind === "install") { const env = await api("/api/environment/detect", { method: "POST", body: { python_path: "" } }).catch(() => null); if (env) renderEnvironment(env); } }
        else toast(current.error || `${localizedJobTitle(current.kind, current.title)} ${t("error")}`, "error");
      }
    } catch (error) { clearInterval(state.jobPoll); state.jobPoll = null; toast(error.message, "error"); }
  };
  await update(); state.jobPoll = setInterval(update, 900);
}

function jobStatus(status) { return ({ queued: t("queued"), running: t("running"), completed: t("completed"), failed: t("error") })[status] || status; }

async function refreshModelStatus() {
  try {
    const result = await api("/api/model/status"); state.model = result.model; const label = state.model.loaded ? `${t("modelReady")} · ${state.model.model_name || t("chatModel")}` : state.model.running ? `${t("serviceRunning")} · ${state.model.state || ""}` : t("chatModelUnloaded");
    $("chat-model-state").querySelector("span:last-child").textContent = label; $("chat-model-label").textContent = state.model.model_name || t("chatModel"); setDot($("chat-model-state"), state.model.loaded ? "success" : state.model.running ? "warn" : "neutral"); $("model-section-status").textContent = state.model.loaded ? t("ready") : state.model.running ? t("serviceRunning") : t("notReady"); $("chat-empty-subtitle").textContent = state.model.loaded ? t("chatLocalNote") : t("chatNeedLoad");
  } catch (error) { setDot($("chat-model-state"), "danger"); }
}

function renderMessage(role, content, meta = "") {
  const row = document.createElement("div"); row.className = `message-row ${role}`;
  row.innerHTML = `<div class="message-avatar">${role === "user" ? (currentLanguage() === "en-US" ? "You" : "你") : "AI"}</div><div class="message-content"><div class="message-name">${role === "user" ? t("you") : t("assistant")}</div><div class="message-bubble"></div>${meta ? `<div class="message-meta">${escapeHtml(meta)}</div>` : ""}</div>`;
  row.querySelector(".message-bubble").textContent = content;
  $("chat-stage").append(row); $("chat-empty").hidden = true; $("chat-stage").scrollTop = $("chat-stage").scrollHeight; return row;
}

function setChatRunning(running) {
  state.busy = running;
  const send = $("send-button");
  const input = $("chat-input");
  const clear = $("clear-chat-button");
  if (send) {
    send.classList.toggle("is-stop", running);
    send.innerHTML = `<i data-lucide="${running ? "square" : "arrow-up"}"></i>`;
    send.title = t(running ? "stopGenerating" : "send");
    send.setAttribute("aria-label", t(running ? "stopGenerating" : "send"));
  }
  if (input) input.disabled = running;
  if (clear) clear.disabled = running;
  refreshIcons();
}

function setMessageMeta(row, text) {
  let meta = row.querySelector(".message-meta");
  if (!meta) {
    meta = document.createElement("div");
    meta.className = "message-meta";
    row.querySelector(".message-content").append(meta);
  }
  meta.textContent = text;
}

function scrollChat() {
  const stage = $("chat-stage");
  stage.scrollTop = stage.scrollHeight;
}

async function streamChat(payload, onEvent, signal) {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/x-ndjson" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `${t("requestFailed")}${response.status}`);
  }
  if (!response.body) {
    await api("/api/chat/cancel", { method: "POST", body: {} }).catch(() => null);
    return false;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  const handleLine = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === "error") throw new Error(event.error || t("streamDisconnected"));
    if (event.type === "done") completed = true;
    onEvent(event);
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    lines.forEach(handleLine);
    if (done) break;
  }
  handleLine(buffer);
  if (!completed) throw new Error(t("streamDisconnected"));
  return true;
}

async function stopChat() {
  if (!state.busy) return;
  state.chatAbort?.abort();
  await api("/api/chat/cancel", { method: "POST", body: {} }).catch(() => null);
}

function clearChat() {
  if (state.busy) return;
  state.messages = []; $("chat-stage").querySelectorAll(".message-row").forEach((row) => row.remove()); $("chat-empty").hidden = false;
}

async function sendChat(event) {
  event.preventDefault();
  if (state.busy) { await stopChat(); return; }
  const input = $("chat-input"); const text = input.value.trim(); if (!text) return;
  if (!state.model.loaded) { toast(t("pleaseLoad"), "warn"); return; }
  input.value = ""; input.style.height = "auto"; state.messages.push({ role: "user", content: text }); renderMessage("user", text);
  const assistantRow = renderMessage("assistant", ""); assistantRow.querySelector(".message-bubble").innerHTML = `<span class="typing-indicator"><span></span><span></span><span></span></span>`;
  const assistantBubble = assistantRow.querySelector(".message-bubble");
  const controller = new AbortController();
  let assistantText = "";
  let metadata = null;
  let intentionallyStopped = false;
  state.chatAbort = controller;
  setChatRunning(true);
  try {
    const payload = { messages: state.messages };
    const streamed = await streamChat(payload, (streamEvent) => {
      if (streamEvent.type === "delta") {
        assistantText += streamEvent.text || "";
        assistantBubble.textContent = assistantText;
        scrollChat();
      } else if (streamEvent.type === "done") {
        metadata = streamEvent;
      }
    }, controller.signal);
    if (!streamed) {
      const result = await api("/api/chat", { method: "POST", body: payload });
      assistantText = result.text || "";
      metadata = result;
      assistantBubble.textContent = assistantText || t("noResponse");
    } else if (!assistantText) {
      assistantBubble.textContent = t("noResponse");
    }
    const elapsed = metadata?.elapsed_seconds ?? 0;
    const tokenCount = metadata?.usage?.completion_tokens ?? 0;
    const metaText = metadata?.cancelled ? t("generationStopped") : `${elapsed}${t("seconds")} · ${tokenCount} ${t("tokens")}`;
    setMessageMeta(assistantRow, metaText);
  } catch (error) {
    intentionallyStopped = error.name === "AbortError";
    if (intentionallyStopped) {
      if (!assistantText) assistantBubble.textContent = t("generationStopped");
      setMessageMeta(assistantRow, t("generationStopped"));
    } else {
      if (!assistantText) assistantBubble.textContent = `${t("requestFailed")}${error.message}`;
      else setMessageMeta(assistantRow, `${t("requestFailed")}${error.message}`);
      toast(error.message, "error");
    }
  } finally {
    if (assistantText) state.messages.push({ role: "assistant", content: assistantText });
    if (state.chatAbort === controller) state.chatAbort = null;
    setChatRunning(false);
    scrollChat();
  }
}

function showView(viewId) {
  qsa(".view").forEach((view) => { view.hidden = view.id !== viewId; view.classList.toggle("is-active", view.id === viewId); }); qsa(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === viewId)); $("sidebar-chat-tools").hidden = viewId !== "chat-view"; $("page-title").textContent = viewId === "chat-view" ? t("chatTitle") : t("configTitle"); if (viewId === "chat-view") refreshModelStatus();
}

async function boot() {
  refreshIcons();
  qsa(".nav-item").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
  qsa("[data-model-source]").forEach((button) => button.addEventListener("click", () => { qsa("[data-model-source]").forEach((item) => item.classList.remove("is-active")); button.classList.add("is-active"); updateModelSourceFields(button.dataset.modelSource); }));
  $("save-config-button").addEventListener("click", () => saveConfig().catch((error) => toast(error.message, "error")));
  $("language-select").addEventListener("change", async () => { state.config.language = $("language-select").value; applyLanguage(); updateServiceState(true); await saveConfig(false).catch((error) => toast(error.message, "error")); await refreshModelStatus(); toast(t("languageSaved")); });
  $("refresh-button").addEventListener("click", () => refreshAll(true));
  $("choose-python-button").addEventListener("click", () => choosePath("python", "python-path")); $("choose-venv-button").addEventListener("click", () => choosePath("folder", "venv-path")); $("choose-model-button").addEventListener("click", () => choosePath("folder", "local-model-path"));
  qsa("[data-pick-target]").forEach((button) => button.addEventListener("click", () => choosePath("folder", button.dataset.pickTarget)));
  $("detect-environment-button").addEventListener("click", detectEnvironment); $("create-venv-button").addEventListener("click", createVenv); $("install-dependencies-button").addEventListener("click", installDependencies); $("prepare-model-button").addEventListener("click", prepareModel); $("load-model-button").addEventListener("click", loadModel); $("chat-load-button").addEventListener("click", loadModel); $("unload-model-button").addEventListener("click", unloadModel); $("clear-chat-button").addEventListener("click", clearChat); $("chat-form").addEventListener("submit", sendChat);
  $("sidebar-new-chat").addEventListener("click", () => { clearChat(); showView("chat-view"); $("chat-input").focus(); }); $("sidebar-current-chat").addEventListener("click", () => showView("chat-view"));
  qsa("[data-prompt]").forEach((button) => button.addEventListener("click", () => { $("chat-input").value = button.dataset.prompt; $("chat-input").dispatchEvent(new Event("input")); $("chat-input").focus(); }));
  $("chat-input").addEventListener("input", (event) => { const target = event.currentTarget; target.style.height = "auto"; target.style.height = `${Math.min(target.scrollHeight, 160)}px`; });
  $("chat-input").addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey && !state.busy) { event.preventDefault(); $("chat-form").requestSubmit(); } });
  await refreshAll(false);
}

async function refreshAll(showMessage) {
  try {
    const [configResult, systemResult, modelResult] = await Promise.all([api("/api/config"), api("/api/system"), api("/api/model/status")]); state.config = configResult.config; state.system = systemResult.system; state.model = modelResult.model; if (!state.config.python_path && state.system.backend_python) state.config.python_path = state.system.backend_python; bindForm(state.config); updateServiceState(true); await refreshModelStatus(); if (showMessage) toast(t("statusRefreshed"));
  } catch (error) { updateServiceState(false); showNotice(t("cannotConnect")); toast(error.message, "error"); }
}

document.addEventListener("DOMContentLoaded", boot);
