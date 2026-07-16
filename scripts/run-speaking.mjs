#!/usr/bin/env node
import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, delimiter } from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ensureSpeakingPython } from "./lib/ensure-python.mjs";
import { ensureUv } from "./lib/uv.mjs";
import { ensureSpeakingEnvFile } from "./lib/ensure-env.mjs";
import { ensureDownload, ensureReleaseBinary } from "./lib/ensure-native-binaries.mjs";
import { pythonInstallDir, root, speakingDir } from "./lib/paths.mjs";

const isWin = process.platform === "win32";

ensureSpeakingEnvFile();

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

const NATIVE_DIR = join(root, ".mirai", "native");
const WHISPER_MODEL_SIZE = runtimeEnv.WHISPER_MODEL_SIZE || "medium";
const WHISPER_MODEL = join(root, ".mirai", "models", `ggml-${WHISPER_MODEL_SIZE}.bin`);
const MELO_DIR = join(root, "services", "melo-tts");
const MELO_PYTHON = isWin
  ? join(MELO_DIR, "venv", "Scripts", "python.exe")
  : join(MELO_DIR, "venv", "bin", "python");
const LLAMA_GPU_LAYERS = runtimeEnv.LLAMA_GPU_LAYERS || "0";
const MELO_PYTHON_VERSION = "3.10";

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", shell: true, ...opts });
}

function resolveModelPath() {
  const configured = runtimeEnv.LOCAL_LLM_MODEL_PATH;
  if (configured) {
    const configuredPath = isAbsolute(configured) ? configured : join(root, configured);
    if (existsSync(configuredPath)) return configuredPath;
    console.log(`[speaking] Không tìm thấy GGUF đã cấu hình: ${configuredPath}. Tự dò models/.`);
  }

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

async function askUseLocalLLM(autoDetected) {
  if (runtimeEnv.SKIP_LOCAL_LLM_PROMPT === "1") {
    return autoDetected;
  }
  if (!input.isTTY) {
    console.log("[speaking] Không có TTY — dùng auto-detect.");
    return autoDetected;
  }

  const rl = readline.createInterface({ input, output });
  try {
    const detectedLabel = autoDetected
      ? "đã tìm thấy GGUF local"
      : "chưa có GGUF local";
    const answer = await rl.question(
      `\n[speaking] ${detectedLabel}. Dùng local LLM fallback? (Y/N, mặc định ${autoDetected ? "Y" : "N"}): `,
    );
    const trimmed = answer.trim().toLowerCase();
    if (trimmed === "y" || trimmed === "yes") return true;
    if (trimmed === "n" || trimmed === "no") return false;
    return autoDetected;
  } finally {
    rl.close();
  }
}

// --- Bootstrap prebuilt CPU runtimes (no CMake, compiler, or Git required). ---
async function ensurePrebuiltWhisper() {
  const whisperBin = await ensureReleaseBinary({
    repo: "ggml-org/whisper.cpp",
    destination: join(NATIVE_DIR, "whisper"),
    executable: "whisper-cli",
    assetPatterns: isWin ? [/^whisper-bin-x64\.zip$/] : [/^whisper-bin-ubuntu-x64\.tar\.gz$/],
  });
  await ensureDownload({
    url: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${WHISPER_MODEL_SIZE}.bin?download=true`,
    destination: WHISPER_MODEL,
    label: `Whisper model ggml-${WHISPER_MODEL_SIZE}`,
  });
  return whisperBin;
}

async function ensurePrebuiltLlama() {
  return ensureReleaseBinary({
    repo: "ggml-org/llama.cpp",
    destination: join(NATIVE_DIR, "llama"),
    executable: "llama-server",
    assetPatterns: isWin ? [/^llama-.*-bin-win-cpu-x64\.zip$/] : [/^llama-.*-bin-ubuntu-x64\.tar\.gz$/],
  });
}

async function ensurePrebuiltFfmpeg() {
  return ensureReleaseBinary({
    repo: "BtbN/FFmpeg-Builds",
    destination: join(NATIVE_DIR, "ffmpeg"),
    executable: "ffmpeg",
    assetPatterns: isWin
      ? [/^ffmpeg-master-latest-win64-gpl\.zip$/]
      : [/^ffmpeg-master-latest-linux64-gpl\.tar\.xz$/],
  });
}

// --- Bootstrap MeloTTS ---
function meloPythonEnv() {
  return { ...process.env, UV_PYTHON_INSTALL_DIR: pythonInstallDir };
}

async function ensureMeloTTS() {
  const MELO_TAG = join(MELO_DIR, ".melo-installed");

  if (existsSync(MELO_PYTHON)) {
    try {
      execSync(
        `"${MELO_PYTHON}" -c "import sys, melo; assert sys.version_info[:2] == (3, 10); print('ok')"${isWin ? "" : " 2>/dev/null"}`,
        { stdio: "pipe", env: { ...process.env, HF_HUB_OFFLINE: "1" } },
      );
      writeFileSync(MELO_TAG, "");
      return;
    } catch {
      // MeloTTS not importable — fall through to full install
    }
  }

  console.log("\n=== Installing MeloTTS (TTS) — this may take a while ===");
  // Use the Python provisioned by uv for the main service. This keeps Windows
  // setup self-contained: no globally installed Python is required.
  // Python 3.12 would build old tokenizers/fugashi dependencies from source.
  // Use uv's portable Python 3.10, which has compatible Windows wheels.
  const uv = await ensureUv();
  const venvDir = join(MELO_DIR, "venv");
  rmSync(venvDir, { recursive: true, force: true });
  run(`"${uv}" python install ${MELO_PYTHON_VERSION}`, { env: meloPythonEnv() });
  run(`"${uv}" venv "${venvDir}" --seed --python ${MELO_PYTHON_VERSION}`, {
    cwd: MELO_DIR,
    env: meloPythonEnv(),
  });

  try {
    // Install PyTorch from its CPU index first; remaining Melo dependencies
    // continue to resolve from PyPI (not from the PyTorch index).
    run(`"${MELO_PYTHON}" -m pip install --upgrade pip "setuptools<81" wheel`, { cwd: MELO_DIR });
    run(`"${MELO_PYTHON}" -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu`, { cwd: MELO_DIR });
    run(`"${MELO_PYTHON}" -m pip install fastapi uvicorn -r requirements.txt`, { cwd: MELO_DIR });

    try {
      execSync(`"${MELO_PYTHON}" -m unidic download`, { stdio: "pipe", timeout: 600000 });
    } catch (e) {
      throw e;
    }

    // Download and validate the Japanese voice model during setup, not on the
    // first user request.
    run(`"${MELO_PYTHON}" -c "from melo.api import TTS; TTS(language='JP', device='cpu')"`, {
      cwd: MELO_DIR,
    });

    writeFileSync(MELO_TAG, "");
    console.log("  MeloTTS installed OK");
  } catch (e) {
    throw new Error("Không thể cài MeloTTS; AI Speaking chưa sẵn sàng.", { cause: e });
  }
}

// --- Main ---
async function main() {
  const children = [];

  // Python and FastAPI dependencies are installed automatically by uv.
  const speakingPython = await ensureSpeakingPython();

  // Bootstrap native runtimes and TTS.
  const whisperBin = await ensurePrebuiltWhisper();
  const ffmpegBin = await ensurePrebuiltFfmpeg();
  await ensureMeloTTS();

  // llama.cpp is downloaded automatically, but this script NEVER downloads a GGUF.
  // Put exactly one fine-tuned .gguf in models/, or set LOCAL_LLM_MODEL_PATH.
  const llamaBin = await ensurePrebuiltLlama();
  const modelPath = resolveModelPath();
  const autoDetected = Boolean(modelPath && existsSync(modelPath));
  const useLocalLLM = await askUseLocalLLM(autoDetected);
  const localModelName = modelPath ? basename(modelPath, ".gguf") : "mirai-jp";
  if (!autoDetected && useLocalLLM) {
    console.log(`[speaking] Người dùng đã chọn dùng local LLM nhưng không tìm thấy GGUF.`);
    console.log("           Chép model fine-tune vào models/ hoặc đặt LOCAL_LLM_MODEL_PATH.");
    console.log("           Fallback qua Gemini / OpenRouter.\n");
  } else if (autoDetected && !useLocalLLM) {
    console.log(`[speaking] Người dùng đã chọn KHÔNG dùng local LLM. Bỏ qua llama-server.`);
    console.log("           LLM sẽ chạy qua Gemini / OpenRouter fallback.\n");
  } else if (useLocalLLM) {
    console.log(`[speaking] Dùng GGUF local: ${modelPath}`);
  } else {
    console.log("[speaking] Chưa có GGUF local. Bỏ qua llama-server và dùng Gemini/OpenRouter fallback.");
    console.log("           Chép model fine-tune vào models/ hoặc đặt LOCAL_LLM_MODEL_PATH.\n");
  }

  // 1. llama-server
  if (useLocalLLM && modelPath && existsSync(modelPath)) {
    if (existsSync(llamaBin)) {
      console.log("\n[speaking] Starting llama-server :8080 ...");
      const llama = spawn(llamaBin, [
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
    ], {
      cwd: MELO_DIR,
      stdio: "pipe",
      env: { ...runtimeEnv, HF_HUB_OFFLINE: "1" },
    });
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
      WHISPER_BIN: whisperBin,
      WHISPER_MODEL,
      PATH: `${dirname(ffmpegBin)}${delimiter}${process.env.PATH || ""}`,
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
