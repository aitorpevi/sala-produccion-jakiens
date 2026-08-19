import "server-only";
import { put, del } from "@vercel/blob";

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

export class ErrorDeSubida extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeSubida";
  }
}

/**
 * Tope de subida cuando no hay Blob configurado y el archivo tiene que viajar
 * como cuerpo de una Server Action. Vercel corta esas peticiones en 4,5 MB;
 * cortamos en 4 para dejar margen al resto del formulario.
 */
export const LIMITE_SIN_BLOB = 4 * 1024 * 1024;

export function blobDisponible() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export type ArchivoGuardado = {
  fileUrl: string | null;
  // `Uint8Array<ArrayBuffer>` y no `Buffer`: es exactamente lo que pide el tipo
  // Bytes de Prisma. Un Buffer, o un Uint8Array sin acotar el búfer, no encajan
  // porque podrían respaldarse en un SharedArrayBuffer.
  fileData: Uint8Array<ArrayBuffer> | null;
  fileName: string;
  size: number;
};

/**
 * Guarda el archivo subido y devuelve lo que hay que escribir en `Material`.
 *
 * Con `BLOB_READ_WRITE_TOKEN` configurado el contenido va a Vercel Blob y en la
 * base de datos solo queda la URL, que es lo que queremos: un dossier de arte o
 * una planta de iluminación pesan más de lo que conviene meter en una fila.
 *
 * Sin token cae al modo anterior (bytes en Postgres) para no dejar las subidas
 * inservibles en un entorno sin Blob, pero rechaza por adelantado lo que no
 * vaya a caber, en vez de fallar con un error opaco a mitad de subida.
 */
export async function guardarArchivo(file: File): Promise<ArchivoGuardado> {
  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const size = file.size;

  if (blobDisponible()) {
    // `addRandomSuffix` evita que dos proyectos con un "briefing.pdf" se pisen.
    const { url } = await put(fileName, file, { access: "private", addRandomSuffix: true });
    return { fileUrl: url, fileData: null, fileName, size };
  }

  if (size > LIMITE_SIN_BLOB) {
    throw new ErrorDeSubida(
      `El archivo pesa ${humanFileSize(size)} y sin almacenamiento externo el máximo son ` +
        `${humanFileSize(LIMITE_SIN_BLOB)}. Configura BLOB_READ_WRITE_TOKEN para archivos grandes.`,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  return { fileUrl: null, fileData: bytes, fileName, size };
}

/** Borra el contenido en Blob, si el material lo tenía allí. */
export async function borrarArchivo(fileUrl: string | null) {
  if (!fileUrl || !blobDisponible()) return;
  await del(fileUrl);
}

/**
 * Lee un archivo privado de Blob desde el servidor.
 *
 * El store es privado: una petición sin credenciales devuelve 403, que es
 * justamente lo que queremos (un enlace filtrado no da acceso). Para servirlo
 * hay que pedirlo con el token, y eso solo puede pasar aquí — nunca en el
 * navegador, donde el token quedaría expuesto.
 *
 * Por eso cada archivo se sirve a través de una ruta propia que antes comprueba
 * quién lo pide, en vez de mandar al usuario directamente a la URL del blob.
 */
export async function leerArchivo(fileUrl: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;

  const res = await fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok || !res.body) {
    console.error(`[blob] no se pudo leer ${fileUrl}: ${res.status}`);
    return null;
  }
  return {
    body: res.body,
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}
