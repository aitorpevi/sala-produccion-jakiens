import "server-only";
import crypto from "node:crypto";

/**
 * Cifrado de los datos personales que la app está obligada a proteger: DNI,
 * NAF, IBAN, domicilio y fecha de nacimiento del equipo.
 *
 * Se cifra en la aplicación, no solo en la base de datos, a propósito. El
 * cifrado en reposo del proveedor protege frente a que alguien se lleve el
 * disco; no protege frente a una credencial de base de datos filtrada, a un
 * volcado de backup, ni frente al propio proveedor. Cifrando aquí, lo que hay
 * en Postgres es ilegible sin una clave que vive en otro sitio.
 *
 * AES-256-GCM: además de cifrar, autentica. Si alguien manipula un valor en la
 * base de datos, el descifrado falla en vez de devolver basura silenciosamente.
 *
 * La clave va en `DATOS_PERSONALES_KEY` (32 bytes en hexadecimal, 64 caracteres).
 * Se genera con:  openssl rand -hex 32
 */

const PREFIJO = "v1";
const ALGORITMO = "aes-256-gcm";

let cacheClave: Buffer | null = null;

function clave(): Buffer {
  if (cacheClave) return cacheClave;
  const hex = process.env.DATOS_PERSONALES_KEY;
  if (!hex) {
    throw new Error(
      "Falta DATOS_PERSONALES_KEY. Sin ella no se pueden guardar datos personales cifrados. " +
        "Genérala con: openssl rand -hex 32",
    );
  }
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== 32) {
    throw new Error("DATOS_PERSONALES_KEY debe ser de 32 bytes (64 caracteres hexadecimales).");
  }
  cacheClave = buf;
  return buf;
}

export function hayClaveDeCifrado() {
  return !!process.env.DATOS_PERSONALES_KEY;
}

export function estaCifrado(valor: string) {
  return valor.startsWith(`${PREFIJO}.`);
}

export function cifrar(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (estaCifrado(valor)) return valor; // ya venía cifrado, no lo ciframos dos veces
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, clave(), iv);
  const ct = Buffer.concat([cipher.update(valor, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIJO, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

export function descifrar(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  // Los registros anteriores al cifrado siguen en claro: se devuelven tal cual
  // para no romper la app mientras se migran.
  if (!estaCifrado(valor)) return valor;

  const partes = valor.split(".");
  if (partes.length !== 4) return null;
  const [, ivB64, tagB64, ctB64] = partes;

  try {
    const decipher = crypto.createDecipheriv(ALGORITMO, clave(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Clave equivocada o dato manipulado. Devolver null es preferible a
    // reventar la página entera y mejor que devolver texto corrupto.
    return null;
  }
}

// ---------- Enmascarado para pantalla ----------

/** `ES5300754675690705561005` → `ES53 **** **** 1005` */
export function iban(valor: string | null): string {
  if (!valor) return "—";
  const v = valor.replace(/\s/g, "");
  if (v.length < 8) return "····";
  return `${v.slice(0, 4)} **** **** ${v.slice(-4)}`;
}

/** `72809586G` → `*****86G` */
export function dni(valor: string | null): string {
  if (!valor) return "—";
  return valor.length <= 3 ? "···" : "*".repeat(valor.length - 3) + valor.slice(-3);
}

/** `311011258533` → `********8533` */
export function naf(valor: string | null): string {
  if (!valor) return "—";
  return valor.length <= 4 ? "····" : "*".repeat(valor.length - 4) + valor.slice(-4);
}

/** Para domicilio y cualquier texto largo: solo se confirma que existe. */
export function presente(valor: string | null): string {
  return valor ? "registrado" : "—";
}
