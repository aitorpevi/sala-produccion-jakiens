import "server-only";

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

// Los archivos se guardan como bytes en Postgres, no en disco: el filesystem de
// Vercel es de solo lectura en producción salvo /tmp (efímero y no compartido
// entre invocaciones), así que un guardado en disco local no sobrevive.
export async function readFileAsBuffer(file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const buffer = Buffer.from(await file.arrayBuffer());
  return { buffer, fileName: safeName, size: buffer.byteLength };
}
