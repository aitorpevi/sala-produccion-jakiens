import { pedirTexto, esperar, type Ingestor, type SenalNueva } from "./tipos";

/**
 * Feeds RSS de medios de tendencia: Dezeen, It's Nice That, Colossal...
 *
 * Es la fuente menos glamurosa y una de las más útiles: son medios con criterio
 * editorial, así que el filtrado lo hacen ellos. Y RSS sigue siendo abierto,
 * gratis y estable, que en 2026 ya es casi exótico.
 *
 * El parseo va a mano con expresiones regulares en vez de con una librería. Es
 * suficiente para los cuatro campos que necesitamos y evita una dependencia más
 * en el bundle del servidor. Si algún feed viene raro, se le anota y se sigue.
 */

const POR_FEED = 30;

function entreEtiquetas(bloque: string, etiqueta: string): string | null {
  // Las barras van dobladas a propósito: dentro de una plantilla de texto, "\s"
  // se convierte en la letra "s" antes de llegar al regex, y el patrón acabaría
  // buscando eses en lugar de espacios. Silencioso y difícil de ver.
  const re = new RegExp(`<${etiqueta}[^>]*>([\\s\\S]*?)</${etiqueta}>`, "i");
  const m = bloque.match(re);
  if (!m) return null;
  return limpiar(m[1]);
}

/** Quita CDATA, etiquetas HTML y descodifica las entidades más comunes. */
function limpiar(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Entidades numéricas: &#8217; (apóstrofo tipográfico), &#x2014; (raya)...
    // Los feeds están llenos de ellas y sin esto llegan crudas al título.
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    // El & va al final: si se descodifica antes, convierte "&amp;#8217;" en basura.
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export const ingerirRss: Ingestor = async (vigilados) => {
  const senales: SenalNueva[] = [];

  for (const v of vigilados) {
    const url = v.termino.startsWith("http") ? v.termino : `https://${v.termino}`;

    try {
      const xml = await pedirTexto(url, 25000);

      // Sirve para RSS (<item>) y para Atom (<entry>).
      const bloques = [
        ...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi),
        ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi),
      ]
        .map((m) => m[0])
        .slice(0, POR_FEED);

      for (const b of bloques) {
        const titulo = entreEtiquetas(b, "title");
        if (!titulo) continue;

        const enlace =
          entreEtiquetas(b, "link") ??
          b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ??
          null;

        const fechaTexto =
          entreEtiquetas(b, "pubDate") ??
          entreEtiquetas(b, "published") ??
          entreEtiquetas(b, "updated");
        const fecha = fechaTexto ? new Date(fechaTexto) : null;

        const guid = entreEtiquetas(b, "guid") ?? entreEtiquetas(b, "id") ?? enlace ?? titulo;

        senales.push({
          fuente: "RSS",
          claveExterna: guid,
          titulo,
          texto: entreEtiquetas(b, "description") ?? entreEtiquetas(b, "summary"),
          url: enlace,
          autor: entreEtiquetas(b, "dc:creator") ?? entreEtiquetas(b, "author"),
          tema: v.etiqueta ?? new URL(url).hostname,
          vertical: v.vertical,
          publicadaEn: fecha && !Number.isNaN(fecha.getTime()) ? fecha : null,
        });
      }
    } catch (e) {
      console.error(`[rss] ${url}:`, (e as Error).message);
    }

    await esperar(400);
  }

  return senales;
};
