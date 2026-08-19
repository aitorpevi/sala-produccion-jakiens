import { pedirJson, type Ingestor, type SenalNueva } from "./tipos";

/**
 * Portada de Hacker News.
 *
 * Sirve como señal temprana de tecnología y cultura de internet: lo que aquí
 * sube hoy suele aparecer en prensa generalista una o dos semanas después. La
 * puntuación funciona bien como medida de fuerza porque es difícil de inflar.
 *
 * No usa `vigilados`: se trae la portada entera y luego se filtra por término si
 * hay alguno configurado. Pedir la portada cuesta lo mismo con o sin filtro.
 */

const CUANTAS = 60;

type Item = {
  id: number;
  title?: string;
  url?: string;
  by?: string;
  score?: number;
  time?: number;
  text?: string;
  type?: string;
};

export const ingerirHackerNews: Ingestor = async (vigilados) => {
  const ids = (await pedirJson("https://hacker-news.firebaseio.com/v0/topstories.json")) as number[];
  const senales: SenalNueva[] = [];

  const terminos = vigilados.map((v) => v.termino.toLowerCase()).filter(Boolean);

  for (const id of ids.slice(0, CUANTAS)) {
    try {
      const it = (await pedirJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)) as Item;
      if (!it || !it.title) continue;

      const titulo = it.title;
      // Si hay términos configurados, solo interesa lo que los menciona. Sin
      // términos, entra toda la portada.
      const encaja =
        terminos.length === 0 ||
        terminos.some((t) => titulo.toLowerCase().includes(t) || (it.text ?? "").toLowerCase().includes(t));
      if (!encaja) continue;

      const cual = vigilados.find((v) => titulo.toLowerCase().includes(v.termino.toLowerCase()));

      senales.push({
        fuente: "HACKERNEWS",
        claveExterna: String(it.id),
        titulo,
        texto: it.text ?? null,
        url: it.url ?? `https://news.ycombinator.com/item?id=${it.id}`,
        autor: it.by ?? null,
        idioma: "en",
        metrica: it.score ?? null,
        tema: cual?.termino ?? null,
        vertical: cual?.vertical ?? "TECNOLOGIA",
        publicadaEn: it.time ? new Date(it.time * 1000) : null,
      });
    } catch (e) {
      console.error(`[hackernews] item ${id}:`, (e as Error).message);
    }
  }

  return senales;
};
