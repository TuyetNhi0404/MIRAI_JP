import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root, speakingDir } from "./paths.mjs";

function log(msg) {
  console.log(`[run] ${msg}`);
}

export function ensureEnvFiles() {
  ensureEnv(join(root, "BE", ".env"), join(root, "BE", ".env.example"), {
    ENABLE_SPEAKING_PRACTICE: "true",
  });
  ensureEnv(join(root, "FE", ".env"), join(root, "FE", ".env.example"), {
    VITE_ENABLE_SPEAKING_PRACTICE: "true",
  });

  ensureSpeakingEnvFile();
}

export function ensureSpeakingEnvFile() {
  const speakingEnv = join(speakingDir, ".env");
  const speakingExample = join(speakingDir, ".env.example");
  if (!existsSync(speakingEnv) && existsSync(speakingExample)) {
    copyFileSync(speakingExample, speakingEnv);
    log(`Đã tạo ${speakingEnv} — điền API keys`);
  } else if (existsSync(speakingEnv)) {
    log(`Giữ nguyên ${speakingEnv}`);
  }
}

function ensureEnv(target, example, patches = {}) {
  if (existsSync(target)) {
    log(`Giữ nguyên ${target}`);
    return;
  }
  if (!existsSync(example)) return;

  let content = readFileSync(example, "utf8");
  for (const [key, value] of Object.entries(patches)) {
    const re = new RegExp(`^(${key}=).*$`, "m");
    content = re.test(content)
      ? content.replace(re, `$1${value}`)
      : `${content.trimEnd()}\n${key}=${value}\n`;
  }
  writeFileSync(target, content);
  log(`Đã tạo ${target}`);
}
