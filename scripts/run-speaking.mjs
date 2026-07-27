#!/usr/bin/env node
import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, isAbsolute, join, delimiter } from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ensureSpeakingPython } from "./lib/ensure-python.mjs";
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
const WHISPER_MODEL_SIZE = runtimeEnv.WHISPER_MODEL_SIZE || "small";
// Honor an explicit WHISPER_MODEL path from .env (e.g. a pre-downloaded model)
// instead of always computing one under .mirai/models.
const WHISPER_MODEL = runtimeEnv.WHISPER_MODEL && existsSync(runtimeEnv.WHISPER_MODEL)
  ? runtimeEnv.WHISPER_MODEL
  : join(root, ".mirai", "models", `ggml-${WHISPER_MODEL_SIZE}.bin`);
const LLAMA_GPU_LAYERS = runtimeEnv.LLAMA_GPU_LAYERS || "0";
const WHISPER_SERVER_PORT = runtimeEnv.WHISPER_SERVER_PORT || "8082";

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
    // Non-interactive: honor explicit USE_LOCAL_LLM, else auto-detect GGUF.
    if (Object.prototype.hasOwnProperty.call(runtimeEnv, "USE_LOCAL_LLM")) {
      return ["1", "true", "yes"].includes(String(runtimeEnv.USE_LOCAL_LLM).toLowerCase());
    }
    return autoDetected;
  }
  if (!input.isTTY) {
    console.log("[speaking] Không có TTY — dùng auto-detect GGUF cho chốt cuối.");
    return autoDetected;
  }

  const rl = readline.createInterface({ input, output });
  try {
    const detectedLabel = autoDetected
      ? "đã tìm thấy GGUF local"
      : "chưa có GGUF local";
    console.log(`
[speaking] LLM chain mặc định: Gemini → OpenRouter
[speaking] ${detectedLabel}.
  Y = bật local LLM làm CHỐT CUỐI (Gemini → OpenRouter → Local)
  N = chỉ Gemini → OpenRouter, dừng (không dùng local)`);
    const answer = await rl.question(
      `Dùng local LLM làm chốt cuối? (Y/N, mặc định ${autoDetected ? "Y" : "N"}): `,
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
    skipIfExists: true,
  });
  const whisperServer = await ensureReleaseBinary({
    repo: "ggml-org/whisper.cpp",
    destination: join(NATIVE_DIR, "whisper"),
    executable: "whisper-server",
    assetPatterns: isWin ? [/^whisper-bin-x64\.zip$/] : [/^whisper-bin-ubuntu-x64\.tar\.gz$/],
  });
  return { whisperBin, whisperServer };
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

// --- Main ---
async function main() {
  const children = [];

  // Python and FastAPI dependencies are installed automatically by uv.
  const speakingPython = await ensureSpeakingPython();

  // Bootstrap native runtimes (TTS now handled remotely by ElevenLabs).
  const { whisperBin, whisperServer } = await ensurePrebuiltWhisper();
  const ffmpegBin = await ensurePrebuiltFfmpeg();

  // llama.cpp is downloaded automatically, but this script NEVER downloads a GGUF.
  // Put exactly one fine-tuned .gguf in models/, or set LOCAL_LLM_MODEL_PATH.
  const llamaBin = await ensurePrebuiltLlama();
  const modelPath = resolveModelPath();
  const autoDetected = Boolean(modelPath && existsSync(modelPath));
  const useLocalLLM = await askUseLocalLLM(autoDetected);
  const localReady = Boolean(useLocalLLM && modelPath && existsSync(modelPath));
  const localModelName = modelPath ? basename(modelPath, ".gguf") : "mirai-jp";
  if (useLocalLLM && !localReady) {
    console.log(`[speaking] Đã chọn local làm chốt cuối nhưng không tìm thấy GGUF.`);
    console.log("           Chép model fine-tune vào models/ hoặc đặt LOCAL_LLM_MODEL_PATH.");
    console.log("           Chain sẽ chỉ còn Gemini → OpenRouter.\n");
  } else if (!useLocalLLM) {
    console.log(`[speaking] Local LLM TẮT — chain: Gemini → OpenRouter (dừng).`);
    if (autoDetected) {
      console.log("           (GGUF có sẵn nhưng bị bỏ qua theo lựa chọn của bạn.)\n");
    } else {
      console.log("");
    }
  } else {
    console.log(`[speaking] Local LLM BẬT làm chốt cuối: ${modelPath}`);
    console.log("           Chain: Gemini → OpenRouter → Local\n");
  }

  // 1. llama-server (only when local is enabled AND GGUF exists)
  if (localReady) {
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
      console.log("[speaking] llama-server unavailable — local chốt cuối không chạy được");
    }
  }

  // 2. Keep Whisper loaded between requests (persistent server). `-ng` prevents it
  // from competing with the Android emulator's GPU. Default model is small for a
  // good speed/accuracy balance on CPU; override with WHISPER_MODEL_SIZE.
  if (existsSync(whisperServer)) {
    console.log(`[speaking] Starting persistent Whisper :${WHISPER_SERVER_PORT} ...`);
    const whisper = spawn(whisperServer, [
      "-m", WHISPER_MODEL,
      "--host", "127.0.0.1",
      "--port", WHISPER_SERVER_PORT,
      "-t", runtimeEnv.WHISPER_THREADS || "4",
      "-ng",
      "-bs", runtimeEnv.WHISPER_BEAM_SIZE || "3",
      "--convert",
    ], {
      stdio: "pipe",
      env: { ...runtimeEnv, PATH: `${dirname(ffmpegBin)}${delimiter}${process.env.PATH || ""}` },
    });
    whisper.stdout.on("data", d => process.stdout.write(`[whisper] ${d}`));
    whisper.stderr.on("data", d => process.stderr.write(`[whisper] ${d}`));
    children.push(whisper);
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
      WHISPER_LANGUAGE: runtimeEnv.WHISPER_LANGUAGE || "ja",
      WHISPER_SERVER_URL: `http://127.0.0.1:${WHISPER_SERVER_PORT}`,
      PATH: `${dirname(ffmpegBin)}${delimiter}${process.env.PATH || ""}`,
      ELEVENLABS_API_KEY: runtimeEnv.ELEVENLABS_API_KEY || "",
      ELEVENLABS_VOICE_ID: runtimeEnv.ELEVENLABS_VOICE_ID || "",
      ELEVENLABS_MODEL_ID: runtimeEnv.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
      // Explicitly set so .env cannot accidentally flip the chain order.
      USE_LOCAL_LLM: localReady ? "true" : "false",
      ...(localReady ? {
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
