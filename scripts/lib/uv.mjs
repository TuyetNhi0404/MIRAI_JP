import { execSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { uvBinPath, uvInstallDir } from "./paths.mjs";

const UV_VERSION = "0.6.17";

function uvTargetTriple() {
  const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
  if (process.platform === "win32") return `${arch}-pc-windows-msvc`;
  if (process.platform === "darwin") return `${arch}-apple-darwin`;
  return `${arch}-unknown-linux-gnu`;
}

async function downloadFile(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Tải thất bại ${url}: ${res.status}`);
  await pipeline(res.body, createWriteStream(dest));
}

function extractZip(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force"`,
      { stdio: "inherit" },
    );
    return;
  }
  execSync(`unzip -o -q "${zipPath}" -d "${destDir}"`, { stdio: "inherit" });
}

export async function ensureUv() {
  const bin = uvBinPath();
  if (existsSync(bin)) return bin;

  console.log("[run] Tải uv (quản lý Python, không cần cài Python trên máy)…");
  mkdirSync(uvInstallDir, { recursive: true });

  const triple = uvTargetTriple();
  const zipName = `uv-${triple}.zip`;
  const url = `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/${zipName}`;
  const zipPath = join(uvInstallDir, zipName);
  const extractDir = join(uvInstallDir, "_extract");

  await downloadFile(url, zipPath);
  rmSync(extractDir, { recursive: true, force: true });
  extractZip(zipPath, extractDir);

  const uvName = process.platform === "win32" ? "uv.exe" : "uv";
  const found = join(extractDir, uvName);
  if (!existsSync(found)) {
    const nested = readdirSync(extractDir).find((n) => n.startsWith("uv-"));
    if (!nested) throw new Error("Không tìm thấy uv trong file tải về");
    copyFileSync(join(extractDir, nested, uvName), bin);
  } else {
    copyFileSync(found, bin);
  }

  if (process.platform !== "win32") chmodSync(bin, 0o755);
  rmSync(extractDir, { recursive: true, force: true });
  rmSync(zipPath, { force: true });

  return bin;
}
