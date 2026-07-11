#!/usr/bin/env node
import { spawn, execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { createInterface } from "node:readline";
import { ensureSpeakingPython } from "./lib/ensure-python.mjs";
import { root, speakingDir } from "./lib/paths.mjs";

async function ask(query) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(query, ans => { rl.close(); resolve(ans.trim().toLowerCase()); });
  });
}

const isWin = process.platform === "win32";

const WHISPER_DIR = join(homedir(), "whisper.cpp");
const WHISPER_BIN = join(WHISPER_DIR, "build", "bin", isWin ? "whisper-cli.exe" : "whisper-cli");
const WHISPER_MODEL = join(WHISPER_DIR, "models", "ggml-small.bin");
const LLAMA_DIR = join(homedir(), "llama.cpp-src");
const LLAMA_BIN = join(LLAMA_DIR, "build", "bin", isWin ? "llama-server.exe" : "llama-server");
const MODEL_PATH = join(root, "models", "qwen3-1.7b.Q4_K_M.gguf");
const MELO_DIR = join(root, "services", "melo-tts");
const MELO_PYTHON = isWin
  ? join(MELO_DIR, "venv", "Scripts", "python.exe")
  : join(MELO_DIR, "venv", "bin", "python");
const MELO_TEMP = join(isWin ? tmpdir() : "/tmp", "MeloTTS");

const JOBS = isWin ? "" : `-j$(nproc)`;

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", shell: true, ...opts });
}

// --- Bootstrap whisper.cpp ---
function ensureWhisper() {
  if (existsSync(WHISPER_BIN) && existsSync(WHISPER_MODEL)) return;

  console.log("\n=== Installing whisper.cpp (STT) ===");
  if (!existsSync(WHISPER_BIN)) {
    if (!existsSync(WHISPER_DIR)) {
      console.log("Cloning whisper.cpp ...");
      run(`git clone --depth=1 https://github.com/ggerganov/whisper.cpp.git "${WHISPER_DIR}"`);
    }
    console.log("Building whisper.cpp ...");
    run(`cmake -B "${join(WHISPER_DIR, "build")}" -DLLAMA_BUILD_TESTS=OFF`, { cwd: WHISPER_DIR });
    run(`cmake --build "${join(WHISPER_DIR, "build")}" --config Release ${JOBS}`, { cwd: WHISPER_DIR });
  }
  if (!existsSync(WHISPER_MODEL)) {
    console.log("Downloading ggml-small model (~466MB) ...");
    if (isWin) {
      run(`cmd /c "${join(WHISPER_DIR, "models", "download-ggml-model.cmd")}" small`, { cwd: WHISPER_DIR });
    } else {
      run(`bash "${join(WHISPER_DIR, "models", "download-ggml-model.sh")}" small`, { cwd: WHISPER_DIR });
    }
  }
}

// --- Bootstrap llama-server + model ---
function ensureLlama() {
  if (!existsSync(LLAMA_BIN)) {
    console.log("\n=== Building llama-server (LLM) ===");
    if (!existsSync(LLAMA_DIR)) {
      run(`git clone --depth=1 https://github.com/ggerganov/llama.cpp.git "${LLAMA_DIR}"`);
    }
    run(`cmake -S "${LLAMA_DIR}" -B "${join(LLAMA_DIR, "build")}" \
      -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_SERVER=ON -DLLAMA_BUILD_CLI=OFF`);
    run(`cmake --build "${join(LLAMA_DIR, "build")}" --config Release ${JOBS}`);
  }

  if (!existsSync(MODEL_PATH)) {
    console.log("\n=== Downloading Qwen3 GGUF model (~1.2GB) ===");
    mkdirSync(join(root, "models"), { recursive: true });
    if (isWin) {
      run(`curl.exe -Lo "${MODEL_PATH}" \
        https://huggingface.co/Antigma/Qwen3-1.7B-GGUF/resolve/main/qwen3-1.7b-q4_k_m.gguf`);
    } else {
      run(`wget -O "${MODEL_PATH}" \
        https://huggingface.co/Antigma/Qwen3-1.7B-GGUF/resolve/main/qwen3-1.7b-q4_k_m.gguf`);
    }
  }
}

// --- Bootstrap MeloTTS ---
function ensureMeloTTS() {
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
  const pythonCmd = isWin ? "python" : "python3";
  run(`${pythonCmd} -m venv "${join(MELO_DIR, "venv")}"`);

  try {
    if (!existsSync(join(MELO_TEMP, ".git"))) {
      execSync(`git clone --depth=1 https://github.com/myshell-ai/MeloTTS.git "${MELO_TEMP}"`, { stdio: "pipe" });
    }

    run(`"${MELO_PYTHON}" -m pip install --quiet setuptools wheel cython`);
    run(`"${MELO_PYTHON}" -m pip install --quiet --no-build-isolation --no-deps "${MELO_TEMP}"`);

    const deps = [
      "fugashi", "txtsplit", "cached_path", "num2words",
      "pykakasi", "unidic-lite", "unidic", "librosa",
      "soundfile", "scipy", "cn2an", "pypinyin", "jieba",
      "transformers", "torch", "torchaudio",
      "g2p_en", "anyascii", "eng_to_ipa", "g2pkk",
      "gruut", "inflect", "jamo", "langid", "loguru",
      "pydub", "unidecode", "tensorboard",
    ];
    run(`"${MELO_PYTHON}" -m pip install --quiet ${deps.join(" ")} --index-url https://download.pytorch.org/whl/cpu`);

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

  // Bootstrap
  ensureWhisper();

  ensureMeloTTS();

  console.log("\n⚠️  Local LLM (llama-server + 1.2GB Qwen3 model) rất nặng.");
  console.log("   Nếu chưa có, sẽ phải build llama.cpp + download model (~2GB).");
  console.log("   Backend đã hỗ trợ Gemini → OpenRouter fallback — có thể bỏ qua.\n");
  const runLLM = await ask("➡️  Run local LLM? (y/N): ");
  const useLocalLLM = runLLM === "y" || runLLM === "yes";
  if (useLocalLLM) {
    console.log("[speaking] Đang chuẩn bị local LLM ...");
    ensureLlama();
  } else {
    console.log("[speaking] Bỏ qua local LLM — dùng Gemini/OpenRouter fallback\n");
  }

  const speakingPython = await ensureSpeakingPython();

  // 1. llama-server
  if (useLocalLLM) {
    if (existsSync(LLAMA_BIN) && existsSync(MODEL_PATH)) {
      console.log("\n[speaking] Starting llama-server :8080 ...");
      const llama = spawn(LLAMA_BIN, [
        "-m", MODEL_PATH,
        "--port", "8080",
        "-ngl", "999",
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
      ...process.env,
      PYTHONIOENCODING: "utf-8",
      WHISPER_BIN,
      WHISPER_MODEL,
      MELO_TTS_URL: "http://localhost:8001",
      ...(useLocalLLM ? {
        LOCAL_LLM_URL: "http://localhost:8080",
        LOCAL_LLM_MODEL: "qwen3-1.7b.Q4_K_M",
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
