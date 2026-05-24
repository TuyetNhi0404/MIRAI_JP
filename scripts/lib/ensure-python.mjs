import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  pythonInstallDir,
  speakingDir,
  venvPythonPath,
} from "./paths.mjs";
import { ensureUv } from "./uv.mjs";

const PYTHON_VERSION = "3.12";

function venvReady() {
  const py = venvPythonPath();
  if (!existsSync(py)) return false;
  try {
    execSync(`"${py}" -c "import uvicorn"`, { stdio: "ignore", shell: true });
    return true;
  } catch {
    return false;
  }
}

function uvEnv() {
  return {
    ...process.env,
    UV_PYTHON_INSTALL_DIR: pythonInstallDir,
  };
}

function runUv(uv, args, cwd = speakingDir) {
  execSync(`"${uv}" ${args}`, {
    cwd,
    env: uvEnv(),
    stdio: "inherit",
    shell: true,
  });
}

export async function ensureSpeakingPython() {
  if (venvReady()) return venvPythonPath();

  console.log("[run] Chuẩn bị Python cho AI service…");
  const uv = await ensureUv();

  runUv(uv, `python install ${PYTHON_VERSION}`);
  runUv(uv, `venv venv --python ${PYTHON_VERSION}`);
  runUv(uv, `pip install -r requirements.txt --python venv`);

  if (!venvReady()) {
    throw new Error("Không thể tạo môi trường Python cho speaking-practice");
  }

  return venvPythonPath();
}
