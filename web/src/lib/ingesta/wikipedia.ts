import { pedirJson, esperar, type Ingestor, type SenalNueva } from "./tipos";

/**
 * Visitas diarias de artículos de Wikipedia.
 *
 * Es el termómetro cultural más limpio que hay: si algo empieza a interesar de
 * verdad, la gente lo busca para enterarse, y eso pasa por Wikipedia. A
 * diferencia de las redes, no hay bots inflando ni marcas pujando: es curiosidad
 * pura, por día y por idioma.
 *
 * Además tiene histórico, así que la primera pasada ya trae contexto en vez de
 * empezar de cero.
 */

const DIAS_ATRAS = 30;

function aAAAAMMDD(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

type RespuestaPageviews = {
  items?: { article: string; timestamp: string; views: number; project: string }[];
};

export const ingerirWikipedia: Ingestor = async (vigilados) => {
  const senales: SenalNueva[] = [];

  const hasta = new Date();
  hasta.setUTCDate(hasta.getUTCDate() - 1); // el día de hoy aún no está cerrado
  const desde = new Date(hasta);
  desde.setUTCDate(desde.getUTCDate() - DIAS_ATRAS);

  for (const v of vigilados) {
    const idioma = v.idioma ?? "es";
    // El artículo va con guiones bajos y codificado: "Cultura pop" -> "Cultura_pop".
    const articulo = encodeURIComponent(v.termino.trim().replace(/\s+/g, "_"));
    const url =
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/` +
      `${idioma}.wikipedia/all-access/all-agents/${articulo}/daily/` +
      `${aAAAAMMDD(desde)}/${aAAAAMMDD(hasta)}`;

    try {
      const datos = (await pedirJson(url)) as RespuestaPageviews;
      for (const it of datos.items ?? []) {
        // El timestamp viene como AAAAMMDDHH.
        const t = it.timestamp;
        const fecha = new Date(
          Date.UTC(Number(t.slice(0, 4)), Number(t.slice(4, 6)) - 1, Number(t.slice(6, 8))),
        );

        senales.push({
          fuente: "WIKIPEDIA",
          // Una señal por artículo y día: repetir la pasada no duplica.
          claveExterna: `${it.project}:${it.article}:${t.slice(0, 8)}`,
          titulo: it.article.replace(/_/g, " "),
          url: `https://${idioma}.wikipedia.org/wiki/${it.article}`,
          idioma,
          metrica: it.views,
          tema: v.termino,
          vertical: v.vertical,
          publicadaEn: fecha,
        });
      }
    } catch (e) {
      // Un artículo que no existe devuelve 404. No es motivo para tirar la pasada
      // entera: se anota y se sigue con el resto.
      console.error(`[wikipedia] "${v.termino}" (${idioma}):`, (e as Error).message);
    }

    await esperar(250); // cortesía con la API
  }

  return senales;
};
