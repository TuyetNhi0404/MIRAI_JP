import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";

const isWin = process.platform === "win32";

function findFile(dir, name) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isFile() && entry.name === name) return path;
    if (entry.isDirectory()) {
      const found = findFile(path, name);
      if (found) return found;
    }
  }
  return null;
}

async function download(url, dest) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "mirai-jp-bootstrap" },
  });
  if (!response.ok || !response.body) {
    throw new Error(`Không thể tải ${url}: HTTP ${response.status}`);
  }
  await pipeline(response.body, createWriteStream(dest));
}

export async function ensureDownload({ url, destination, label }) {
  if (existsSync(destination)) return destination;
  console.log(`[speaking] Tải ${label} ...`);
  mkdirSync(dirname(destination), { recursive: true });
  const partial = `${destination}.part`;
  try {
    await download(url, partial);
    renameSync(partial, destination);
  } finally {
    rmSync(partial, { force: true });
  }
  return destination;
}

function verifySha256(path, digest) {
  if (!digest?.startsWith("sha256:")) return;
  const actual = createHash("sha256").update(readFileSync(path)).digest("hex");
  if (actual !== digest.slice("sha256:".length)) {
    throw new Error("File tải về không khớp SHA-256 do nhà phát hành cung cấp");
  }
}

function extract(archive, destination) {
  // Use the built-in `tar` (available on both Windows 10+ and Linux) instead of
  // PowerShell's Expand-Archive. This avoids ExecutionPolicy prompts and the need
  // to launch an elevated PowerShell console on Windows.
  execFileSync("tar", [archive.endsWith(".xz") ? "-xJf" : "-xf", archive, "-C", destination], {
    stdio: "inherit",
    shell: isWin,
  });
}

async function latestAsset(repo, matches) {
  const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "mirai-jp-bootstrap",
    },
  });
  if (!response.ok) throw new Error(`Không thể đọc bản phát hành ${repo}: HTTP ${response.status}`);
  const release = await response.json();
  const asset = release.assets?.find(({ name }) => matches.some(match => match.test(name)));
  if (!asset) throw new Error(`Không tìm thấy binary phù hợp cho ${process.platform}/${process.arch} trong ${repo}`);
  return asset;
}

export async function ensureReleaseBinary({ repo, destination, executable, assetPatterns }) {
  const binaryName = `${executable}${isWin ? ".exe" : ""}`;
  const existing = existsSync(destination) ? findFile(destination, binaryName) : null;
  if (existing) return existing;

  if (process.platform !== "win32" && process.platform !== "linux") {
    throw new Error(`AI Speaking hiện hỗ trợ bootstrap tự động trên Windows và Linux, không phải ${process.platform}.`);
  }
  if (process.arch !== "x64") {
    throw new Error(`AI Speaking hiện chỉ tự động tải binary CPU cho kiến trúc x64; máy này là ${process.arch}.`);
  }

  console.log(`\n[speaking] Tải ${repo} binary CPU cho ${isWin ? "Windows" : "Linux"} ...`);
  const asset = await latestAsset(repo, assetPatterns);
  const parent = join(destination, "..");
  const archive = join(parent, `.${executable}-${asset.name}`);
  const extractDir = join(parent, `.${executable}-extract`);
  mkdirSync(destination, { recursive: true });

  try {
    await download(asset.browser_download_url, archive);
    verifySha256(archive, asset.digest);
    mkdirSync(extractDir, { recursive: true });
    extract(archive, extractDir);
    const found = findFile(extractDir, binaryName);
    if (!found) throw new Error(`${repo} archive không chứa ${binaryName}`);
    // Keep the release layout intact so DLL/shared-library dependencies remain next to the executable.
    rmSync(destination, { recursive: true, force: true });
    mkdirSync(destination, { recursive: true });
    extract(archive, destination);
    const installed = findFile(destination, binaryName);
    if (!installed) throw new Error(`Không thể cài ${binaryName}`);
    if (!isWin) chmodSync(installed, 0o755);
    return installed;
  } finally {
    rmSync(extractDir, { recursive: true, force: true });
    rmSync(archive, { force: true });
  }
}
