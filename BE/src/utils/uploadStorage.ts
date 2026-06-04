import fs from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

export async function ensureUploadsDir(): Promise<string> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  return UPLOADS_DIR;
}

export async function saveUploadFile(
  documentId: string,
  originalName: string,
  buffer: Buffer
): Promise<string> {
  await ensureUploadsDir();
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(UPLOADS_DIR, `${documentId}_${safeName}`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export function getOcrResultPath(documentId: string): string {
  return path.join(UPLOADS_DIR, `${documentId}.ocr.json`);
}

export async function writeOcrResult(documentId: string, data: unknown): Promise<string> {
  const filePath = getOcrResultPath(documentId);
  await fs.writeFile(filePath, JSON.stringify(data), "utf-8");
  return filePath;
}

export async function readOcrResult<T>(documentId: string): Promise<T> {
  const raw = await fs.readFile(getOcrResultPath(documentId), "utf-8");
  return JSON.parse(raw) as T;
}

export async function deleteUploadArtifacts(documentId: string): Promise<void> {
  await ensureUploadsDir();
  const entries = await fs.readdir(UPLOADS_DIR);
  const prefix = `${documentId}_`;
  const ocrFile = `${documentId}.ocr.json`;
  await Promise.all(
    entries
      .filter(name => name.startsWith(prefix) || name === ocrFile)
      .map(name => fs.unlink(path.join(UPLOADS_DIR, name)).catch(() => undefined))
  );
}
