#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { ensureSpeakingPython } from "./lib/ensure-python.mjs";
import { speakingDir, venvPythonPath } from "./lib/paths.mjs";

async function main() {
  let python = venvPythonPath();
  if (!existsSync(python)) {
    console.log("[speaking] Chưa có venv — chạy bootstrap…");
    python = await ensureSpeakingPython();
  }

  const child = spawn(
    python,
    ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
    { cwd: speakingDir, stdio: "inherit", shell: process.platform === "win32" },
  );

  child.on("exit", (code) => process.exit(code ?? 1));
}

main().catch((err) => {
  console.error("[speaking]", err.message);
  console.error("Chạy trước: npm run run");
  process.exit(1);
});
