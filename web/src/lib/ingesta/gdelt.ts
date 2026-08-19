import { pedirJson, esperar, type Ingestor, type SenalNueva } from "./tipos";

/**
 * GDELT: noticias de todo el mundo, actualizadas cada 15 minutos, con análisis
 * de tono. Gratis y sin clave.
 *
 * AVISO: no está verificado en funcionamiento. Desde el entorno de desarrollo
 * devuelve su mensaje de límite de peticiones en vez de datos, incluso
 * espaciando las llamadas — probablemente por IP compartida. Debería funcionar
 * desde producción, pero hasta que se confirme, trátalo como fuente dudosa.
 *
 * GDELT pide expresamente no más de una petición cada 5 segundos.
 */

const ESPERA_MS = 5500;
const MAX_POR_CONSULTA = 40;

type Articulo = {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
  language?: string;
  socialimage?: string;
};

/** GDELT devuelve las fechas como 20260819T143000Z. */
function aFecha(s: string | undefined): Date | null {
  if (!s || s.length < 15) return null;
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const ingerirGdelt: Ingestor = async (vigilados) => {
  const senales: SenalNueva[] = [];

  for (const v of vigilados) {
    const url =
      `https://api.gdeltproject.org/api/v2/doc/doc` +
      `?query=${encodeURIComponent(v.termino)}` +
      `&mode=ArtList&maxrecords=${MAX_POR_CONSULTA}&format=json&timespan=1d`;

    try {
      const datos = (await pedirJson(url, 30000)) as { articles?: Articulo[] };

      for (const a of datos.articles ?? []) {
        if (!a.url || !a.title) continue;
        senales.push({
          fuente: "GDELT",
          claveExterna: a.url,
          titulo: a.title,
          url: a.url,
          autor: a.domain ?? null,
          idioma: a.language ?? null,
          tema: v.termino,
          vertical: v.vertical,
          publicadaEn: aFecha(a.seendate),
        });
      }
    } catch (e) {
      // Cuando limita, GDELT responde texto plano y el parseo de JSON revienta.
      // Ese error es esperable, no una avería.
      console.error(`[gdelt] "${v.termino}":`, (e as Error).message);
    }

    await esperar(ESPERA_MS);
  }

  return senales;
};
