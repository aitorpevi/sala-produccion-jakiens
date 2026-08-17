import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

export function humanFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1).replace(".0", "")} ${units[i]}`;
}

export async function saveUploadedFile(file: File, projectId: string) {
  await fs.mkdir(path.join(STORAGE_ROOT, projectId), { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const relPath = path.join(projectId, `${crypto.randomUUID()}-${safeName}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(STORAGE_ROOT, relPath), buffer);
  return { relPath, size: buffer.byteLength };
}

export async function readUploadedFile(relPath: string) {
  return fs.readFile(path.join(STORAGE_ROOT, relPath));
}
