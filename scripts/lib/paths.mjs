import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
export const root = join(scriptsDir, "..", "..");
export const speakingDir = join(root, "services", "speaking-practice");
export const miraiDir = join(root, ".mirai");
export const uvInstallDir = join(miraiDir, "tools");
export const pythonInstallDir = join(miraiDir, "pythons");

export function venvPythonPath() {
  const rel =
    process.platform === "win32" ? "venv\\Scripts\\python.exe" : "venv/bin/python";
  return join(speakingDir, rel);
}

export function uvBinPath() {
  return join(uvInstallDir, process.platform === "win32" ? "uv.exe" : "uv");
}
