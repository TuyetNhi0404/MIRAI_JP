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

const UV_VERSION = "0.11.19";

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

function extractArchive(archivePath, destDir) {
  mkdirSync(destDir, { recursive: true });
  // Use the built-in `tar` on every platform (Windows 10+ ships tar.exe) to avoid
  // PowerShell ExecutionPolicy prompts and elevated consoles.
  execSync(`tar -xf "${archivePath}" -C "${destDir}"`, { stdio: "inherit" });
}

export async function ensureUv() {
  const bin = uvBinPath();
  if (existsSync(bin)) return bin;

  console.log("[run] Tải uv (quản lý Python, không cần cài Python trên máy)…");
  mkdirSync(uvInstallDir, { recursive: true });

  const triple = uvTargetTriple();
  const ext = process.platform === "win32" ? "zip" : "tar.gz";
  const archiveName = `uv-${triple}.${ext}`;
  const url = `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/${archiveName}`;
  const archivePath = join(uvInstallDir, archiveName);
  const extractDir = join(uvInstallDir, "_extract");

  await downloadFile(url, archivePath);
  rmSync(extractDir, { recursive: true, force: true });
  extractArchive(archivePath, extractDir);

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
  rmSync(archivePath, { force: true });

  return bin;
}
