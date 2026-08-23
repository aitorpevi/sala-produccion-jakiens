import "server-only";
import { db } from "@/lib/db";
import { FUENTES, type Fuente, type Ingestor, type SenalNueva } from "./tipos";
import { ingerirWikipedia } from "./wikipedia";
import { ingerirHackerNews } from "./hackernews";
import { ingerirBluesky } from "./bluesky";
import { ingerirBlueskyFeed } from "./blueskyFeed";
import { ingerirRss } from "./rss";
import { ingerirGdelt } from "./gdelt";
import { ingerirReddit } from "./reddit";
import { ingerirBlueskyTrends } from "./blueskyTrends";
import { ingerirTelegram } from "./telegram";
import { ingerirYoutube } from "./youtube";

export { FUENTES, VERTICALES } from "./tipos";
export type { Fuente, Vertical } from "./tipos";
export { FICHAS, NOMBRE_FUENTE } from "./fichas";
export type { FichaFuente } from "./fichas";

const INGESTORES: Record<Fuente, Ingestor> = {
  WIKIPEDIA: ingerirWikipedia,
  HACKERNEWS: ingerirHackerNews,
  BLUESKY: ingerirBluesky,
  BLUESKY_FEED: ingerirBlueskyFeed,
  RSS: ingerirRss,
  GDELT: ingerirGdelt,
  REDDIT: ingerirReddit,
  BLUESKY_TRENDS: ingerirBlueskyTrends,
  TELEGRAM: ingerirTelegram,
  YOUTUBE: ingerirYoutube,
};

export type Resultado = {
  fuente: Fuente;
  nuevas: number;
  revisadas: number;
  error: string | null;
  duracionMs: number;
};

/**
 * Ejecuta la ingesta de una fuente y guarda lo que traiga.
 *
 * Las señales se insertan con `skipDuplicates` sobre (fuente, claveExterna), así
 * que repetir una pasada no duplica nada. Eso permite correr esto tan a menudo
 * como haga falta sin miedo, y volver a lanzarlo si falló a medias.
 *
 * Cada pasada queda registrada en `PasadaIngesta`: sin eso, un ingestor que
 * lleva tres semanas fallando en silencio no se detecta hasta que alguien nota
 * que el cerebro está desactualizado.
 */
export async function ingerir(fuente: Fuente): Promise<Resultado> {
  const arranque = Date.now();

  const vigilados = await db.temaSeguido.findMany({
    where: { fuente, activo: true },
    select: { termino: true, etiqueta: true, vertical: true, idioma: true },
    orderBy: { creadoEn: "asc" },
  });

  let senales: SenalNueva[] = [];
  let error: string | null = null;

  try {
    senales = await INGESTORES[fuente](vigilados);
  } catch (e) {
    error = (e as Error).message;
  }

  // Los ingestores capturan los fallos de cada término para que uno roto no
  // tire la pasada entera. El efecto secundario es que una fuente totalmente
  // caída terminaba "sin error" y con cero resultados, y el panel la daba por
  // buena. Si había algo que vigilar y no ha vuelto nada, es un fallo.
  if (!error && vigilados.length > 0 && senales.length === 0) {
    error = `Sin resultados pese a tener ${vigilados.length} término(s) vigilado(s). Revisa los registros del servidor.`;
  }

  let nuevas = 0;
  if (senales.length > 0) {
    const res = await db.senal.createMany({
      data: senales.map((s) => ({
        fuente: s.fuente,
        claveExterna: s.claveExterna.slice(0, 500),
        titulo: s.titulo.slice(0, 500),
        texto: s.texto ?? null,
        url: s.url ?? null,
        autor: s.autor ?? null,
        imagenUrl: s.imagenUrl ?? null,
        idioma: s.idioma ?? null,
        metrica: s.metrica ?? null,
        tema: s.tema ?? null,
        vertical: s.vertical ?? null,
        publicadaEn: s.publicadaEn ?? null,
      })),
      skipDuplicates: true,
    });
    nuevas = res.count;
  }

  const duracionMs = Date.now() - arranque;

  await db.pasadaIngesta.create({
    data: { fuente, nuevas, revisadas: senales.length, error, duracionMs },
  });

  return { fuente, nuevas, revisadas: senales.length, error, duracionMs };
}

/** Todas las fuentes, una detrás de otra. Secuencial a propósito: varias piden espaciado. */
export async function ingerirTodo(): Promise<Resultado[]> {
  const resultados: Resultado[] = [];
  for (const f of FUENTES) {
    resultados.push(await ingerir(f));
  }
  return resultados;
}
