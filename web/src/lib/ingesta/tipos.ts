/**
 * Contrato común de los ingestores.
 *
 * Cada fuente devuelve señales ya normalizadas y el orquestador se encarga de
 * guardarlas. Así añadir una fuente nueva es escribir una función, no tocar la
 * base de datos ni el resto del sistema.
 */

export const FUENTES = [
  "WIKIPEDIA",
  "GDELT",
  "BLUESKY",
  "BLUESKY_FEED",
  "HACKERNEWS",
  "RSS",
  "REDDIT",
  "BLUESKY_TRENDS",
] as const;
export type Fuente = (typeof FUENTES)[number];

export const VERTICALES = [
  "MODA",
  "DISENO",
  "CULTURA",
  "MEME",
  "CINE",
  "TECNOLOGIA",
  "INTERNET",
] as const;
export type Vertical = (typeof VERTICALES)[number];

export type SenalNueva = {
  fuente: Fuente;
  /** Identificador estable en el origen. Es lo que evita duplicar al repetir la pasada. */
  claveExterna: string;
  titulo: string;
  texto?: string | null;
  url?: string | null;
  autor?: string | null;
  idioma?: string | null;
  metrica?: number | null;
  tema?: string | null;
  vertical?: string | null;
  publicadaEn?: Date | null;
  crudo?: unknown;
};

export type Vigilado = {
  termino: string;
  etiqueta: string | null;
  vertical: string | null;
  idioma: string | null;
};

export type Ingestor = (vigilados: Vigilado[]) => Promise<SenalNueva[]>;

/**
 * Identifica a la herramienta ante las APIs públicas.
 *
 * Wikimedia y otros piden un User-Agent con contacto real y bloquean a quien no
 * lo manda. No es una formalidad: es la diferencia entre que te sirvan y que te
 * corten.
 */
export const USER_AGENT = "JakiensCreativeBrain/0.1 (https://jakiens.com; aitor@jakiens.com)";

export async function pedirJson(url: string, timeoutMs = 20000): Promise<unknown> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: control.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
    return await res.json();
  } finally {
    clearTimeout(reloj);
  }
}

export async function pedirTexto(url: string, timeoutMs = 20000): Promise<string> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: control.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
    return await res.text();
  } finally {
    clearTimeout(reloj);
  }
}

/** Espaciado entre peticiones, para fuentes que lo exigen. */
export function esperar(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
