import { pedirJson, type Ingestor, type SenalNueva } from "./tipos";

/**
 * Vídeos en tendencia en España, vía la YouTube Data API v3 (oficial).
 *
 * A diferencia de RSS o Telegram, esto no es scraping: es una API documentada
 * con cuota gratuita (10.000 unidades/día; esta consulta cuesta 1). Necesita
 * una clave en `YOUTUBE_API_KEY` — sin ella, falla con un error claro en vez
 * de devolver cero resultados en silencio.
 *
 * En `termino` va el ID de categoría de YouTube para acotar el top (24
 * Entretenimiento, 1 Cine y animación, 28 Ciencia y tecnología, 26 Estilo de
 * vida...). Vacío = top general de España sin acotar por categoría.
 */

type ItemYoutube = {
  id: string;
  snippet?: { title?: string; channelTitle?: string; publishedAt?: string; categoryId?: string };
  statistics?: { viewCount?: string };
};

export const ingerirYoutube: Ingestor = async (vigilados) => {
  const clave = process.env.YOUTUBE_API_KEY;
  if (!clave) throw new Error("Falta YOUTUBE_API_KEY en el entorno.");

  const senales: SenalNueva[] = [];
  // Sin categorías vigiladas, se trae el top general una sola vez.
  const categorias = vigilados.length > 0 ? vigilados : [{ termino: "", etiqueta: null, vertical: null, idioma: null }];

  for (const v of categorias) {
    const params = new URLSearchParams({
      part: "snippet,statistics",
      chart: "mostPopular",
      regionCode: "ES",
      maxResults: "25",
      key: clave,
    });
    if (v.termino) params.set("videoCategoryId", v.termino);

    try {
      const data = (await pedirJson(
        `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`,
      )) as { items?: ItemYoutube[] };

      for (const it of data.items ?? []) {
        if (!it.snippet?.title) continue;
        senales.push({
          fuente: "YOUTUBE",
          claveExterna: it.id,
          titulo: it.snippet.title,
          url: `https://www.youtube.com/watch?v=${it.id}`,
          autor: it.snippet.channelTitle ?? null,
          idioma: "es",
          metrica: it.statistics?.viewCount ? Number(it.statistics.viewCount) : null,
          tema: v.etiqueta ?? null,
          vertical: v.vertical,
          publicadaEn: it.snippet.publishedAt ? new Date(it.snippet.publishedAt) : null,
        });
      }
    } catch (e) {
      console.error(`[youtube] categoría "${v.termino}":`, (e as Error).message);
    }
  }

  return senales;
};
