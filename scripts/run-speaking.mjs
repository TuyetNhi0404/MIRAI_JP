#!/usr/bin/env node
import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join } from "node:path";
import { homedir } from "node:os";
import { ensureSpeakingPython } from "./lib/ensure-python.mjs";
import { root, speakingDir } from "./lib/paths.mjs";

const isWin = process.platform === "win32";

function readDotEnv(path) {
  if (!existsSync(path)) return {};
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || line.trimStart().startsWith("#")) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

// Values in services/speaking-practice/.env work for this bootstrap too.
// Shell environment takes precedence, so temporary PowerShell overrides work.
const speakingEnv = readDotEnv(join(speakingDir, ".env"));
const runtimeEnv = { ...speakingEnv, ...process.env };

const WHISPER_DIR = join(homedir(), "whisper.cpp");
const WHISPER_BIN = join(WHISPER_DIR, "build", "bin", isWin ? "whisper-cli.exe" : "whisper-cli");
const WHISPER_MODEL_SIZE = runtimeEnv.WHISPER_MODEL_SIZE || "medium";
const WHISPER_MODEL = join(WHISPER_DIR, "models", `ggml-${WHISPER_MODEL_SIZE}.bin`);
const LLAMA_DIR = join(homedir(), "llama.cpp-src");
const LLAMA_BIN = join(LLAMA_DIR, "build", "bin", isWin ? "llama-server.exe" : "llama-server");
const MELO_DIR = join(root, "services", "melo-tts");
const MELO_PYTHON = isWin
  ? join(MELO_DIR, "venv", "Scripts", "python.exe")
  : join(MELO_DIR, "venv", "bin", "python");
const LLAMA_GPU_LAYERS = runtimeEnv.LLAMA_GPU_LAYERS || "0";
const JOBS = isWin ? "" : `-j$(nproc)`;

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", shell: true, ...opts });
}

function requireCommand(command, installHint) {
  try {
    execSync(isWin ? `where ${command}` : `command -v ${command}`, {
      stdio: "ignore",
      shell: true,
    });
  } catch {
    throw new Error(`${command} chưa có trong PATH. ${installHint}`);
  }
}

function resolveModelPath() {
  const configured = runtimeEnv.LOCAL_LLM_MODEL_PATH;
  if (configured) return isAbsolute(configured) ? configured : join(root, configured);

  const modelsDir = join(root, "models");
  if (!existsSync(modelsDir)) return null;
  const preferred = join(modelsDir, "mirai-jp.gguf");
  if (existsSync(preferred)) return preferred;
  const models = readdirSync(modelsDir)
    .filter(name => name.toLowerCase().endsWith(".gguf"))
    .map(name => join(modelsDir, name));

  if (models.length === 1) return models[0];
  if (models.length > 1) {
    console.log("[speaking] Có nhiều file GGUF trong models/. Đặt LOCAL_LLM_MODEL_PATH để chọn model cần chạy.");
  }
  return null;
}

// --- Bootstrap whisper.cpp ---
function ensureWhisper() {
  if (existsSync(WHISPER_BIN) && existsSync(WHISPER_MODEL)) return;

  console.log("\n=== Installing whisper.cpp (STT) ===");
  if (!existsSync(WHISPER_BIN)) {
    requireCommand("git", "Cài Git for Windows: https://git-scm.com/download/win");
    requireCommand("cmake", "Cài CMake và chọn 'Add CMake to PATH': https://cmake.org/download/");
    if (!existsSync(WHISPER_DIR)) {
      console.log("Cloning whisper.cpp ...");
      run(`git clone --depth=1 https://github.com/ggerganov/whisper.cpp.git "${WHISPER_DIR}"`);
    }
    console.log("Building whisper.cpp ...");
    run(`cmake -B "${join(WHISPER_DIR, "build")}" -DLLAMA_BUILD_TESTS=OFF`, { cwd: WHISPER_DIR });
    run(`cmake --build "${join(WHISPER_DIR, "build")}" --config Release ${JOBS}`, { cwd: WHISPER_DIR });
  }
  if (!existsSync(WHISPER_MODEL)) {
    console.log(`Downloading ggml-${WHISPER_MODEL_SIZE} model ...`);
    if (isWin) {
      run(`cmd /c "${join(WHISPER_DIR, "models", "download-ggml-model.cmd")}" ${WHISPER_MODEL_SIZE}`, { cwd: WHISPER_DIR });
    } else {
      run(`bash "${join(WHISPER_DIR, "models", "download-ggml-model.sh")}" ${WHISPER_MODEL_SIZE}`, { cwd: WHISPER_DIR });
    }
  }
}

// --- Bootstrap llama-server. Model GGUF do người dùng tự cung cấp. ---
function ensureLlama() {
  if (!existsSync(LLAMA_BIN)) {
    console.log("\n=== Building llama-server (LLM) ===");
    requireCommand("git", "Cài Git for Windows: https://git-scm.com/download/win");
    requireCommand("cmake", "Cài CMake và chọn 'Add CMake to PATH': https://cmake.org/download/");
    if (!existsSync(LLAMA_DIR)) {
      run(`git clone --depth=1 https://github.com/ggerganov/llama.cpp.git "${LLAMA_DIR}"`);
    }
    run(`cmake -S "${LLAMA_DIR}" -B "${join(LLAMA_DIR, "build")}" \
      -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_SERVER=ON -DLLAMA_BUILD_CLI=OFF`);
    run(`cmake --build "${join(LLAMA_DIR, "build")}" --config Release ${JOBS}`);
  }
}

// --- Bootstrap MeloTTS ---
function ensureMeloTTS(basePython) {
  const MELO_TAG = join(MELO_DIR, ".melo-installed");

  if (!existsSync(MELO_TAG) && existsSync(MELO_PYTHON)) {
    try {
      execSync(`"${MELO_PYTHON}" -c "import melo; print('ok')"${isWin ? "" : " 2>/dev/null"}`, { stdio: "pipe" });
      writeFileSync(MELO_TAG, "");
      return;
    } catch {
      // MeloTTS not importable — fall through to full install
    }
  }

  if (existsSync(MELO_TAG)) return;

  console.log("\n=== Installing MeloTTS (TTS) — this may take a while ===");
  // Use the Python provisioned by uv for the main service. This keeps Windows
  // setup self-contained: no globally installed Python is required.
  run(`"${basePython}" -m venv "${join(MELO_DIR, "venv")}"`);

  try {
    // Install PyTorch from its CPU index first; remaining Melo dependencies
    // continue to resolve from PyPI (not from the PyTorch index).
    run(`"${MELO_PYTHON}" -m pip install --upgrade pip setuptools wheel`, { cwd: MELO_DIR });
    run(`"${MELO_PYTHON}" -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu`, { cwd: MELO_DIR });
    run(`"${MELO_PYTHON}" -m pip install fastapi uvicorn -r requirements.txt`, { cwd: MELO_DIR });

    try {
      execSync(`"${MELO_PYTHON}" -m unidic download`, { stdio: "pipe", timeout: 600000 });
    } catch {
      console.log("  (unidic download incomplete — TTS may fail at runtime)");
    }

    writeFileSync(MELO_TAG, "");
    console.log("  MeloTTS installed OK");
  } catch (e) {
    console.log("[speaking] MeloTTS install failed — TTS will be disabled");
  }
}

// --- Main ---
async function main() {
  const children = [];

  // Python and FastAPI dependencies are installed automatically by uv.
  const speakingPython = await ensureSpeakingPython();

  // Bootstrap native runtimes and TTS.
  ensureWhisper();
  ensureMeloTTS(speakingPython);

  // llama.cpp is always bootstrapped, but this script NEVER downloads a GGUF.
  // Put exactly one fine-tuned .gguf in models/, or set LOCAL_LLM_MODEL_PATH.
  ensureLlama();
  const modelPath = resolveModelPath();
  const useLocalLLM = Boolean(modelPath && existsSync(modelPath));
  const localModelName = modelPath ? basename(modelPath, ".gguf") : "mirai-jp";
  if (useLocalLLM) {
    console.log(`[speaking] Dùng GGUF local: ${modelPath}`);
  } else {
    console.log("[speaking] Chưa có GGUF local. Bỏ qua llama-server và dùng Gemini/OpenRouter fallback.");
    console.log("           Chép model fine-tune vào models/ hoặc đặt LOCAL_LLM_MODEL_PATH.\n");
  }

  // 1. llama-server
  if (useLocalLLM) {
    if (existsSync(LLAMA_BIN) && modelPath) {
      console.log("\n[speaking] Starting llama-server :8080 ...");
      const llama = spawn(LLAMA_BIN, [
        "-m", modelPath,
        "--port", "8080",
        "-ngl", LLAMA_GPU_LAYERS,
        "-c", "4096",
        "--jinja",
      ], { stdio: "pipe" });
      llama.stdout.on("data", d => process.stdout.write(`[llama] ${d}`));
      llama.stderr.on("data", d => process.stderr.write(`[llama] ${d}`));
      children.push(llama);
    } else {
      console.log("[speaking] llama-server unavailable — LLM fallback to Gemini/OpenRouter");
    }
  }

  // 2. MeloTTS
  if (existsSync(MELO_PYTHON)) {
    console.log("[speaking] Starting MeloTTS :8001 ...");
    const melo = spawn(MELO_PYTHON, [
      "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8001",
    ], { cwd: MELO_DIR, stdio: "pipe" });
    melo.stdout.on("data", d => process.stdout.write(`[melo] ${d}`));
    melo.stderr.on("data", d => process.stderr.write(`[melo] ${d}`));
    children.push(melo);
  } else {
    console.log("[speaking] MeloTTS unavailable — TTS disabled");
  }

  // 3. Speaking-practice
  console.log("[speaking] Starting uvicorn :8000 ...");
  const uvicorn = spawn(speakingPython, [
    "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload",
  ], {
    cwd: speakingDir,
    stdio: "inherit",
    env: {
      ...runtimeEnv,
      PYTHONIOENCODING: "utf-8",
      WHISPER_BIN,
      WHISPER_MODEL,
      MELO_TTS_URL: "http://localhost:8001",
      ...(useLocalLLM ? {
        LOCAL_LLM_URL: "http://localhost:8080",
        LOCAL_LLM_MODEL: localModelName,
      } : {}),
    },
  });
  children.push(uvicorn);

  const cleanup = () => { for (const c of children) c.kill(); };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  if (isWin) process.on("SIGBREAK", cleanup);
  uvicorn.on("exit", (code) => { cleanup(); process.exit(code ?? 1); });
}

main().catch(err => {
  console.error("[speaking]", err.message);
  process.exit(1);
});
