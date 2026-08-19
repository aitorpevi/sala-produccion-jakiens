import { pedirTexto, esperar, type Ingestor, type SenalNueva } from "./tipos";
import { parsearFeed } from "./rss";

/**
 * Subreddits, vía el RSS público.
 *
 * Reddit cerró el alta automática de aplicaciones a finales de 2025 con su
 * Responsible Builder Policy: ya no se puede crear una app de API por cuenta
 * propia, hay que solicitarlo y la mayoría se deniegan. El RSS público sigue en
 * pie y no pide clave, así que es la única puerta que queda.
 *
 * PERO limita muy agresivamente por IP: con 8 segundos entre peticiones sigue
 * devolviendo 429 la mayoría de las veces. Por eso esta fuente se trata como
 * "si cae, cae": espaciado amplio, sin reintentos y sin dar por rota la pasada
 * cuando falla. Puede que desde producción vaya mejor, o peor — los rangos de
 * datacenter suelen estar más vigilados.
 *
 * En `termino` va el nombre del subreddit, con o sin "r/".
 */

const ESPERA_MS = 9000;
const POR_SUB = 25;

export const ingerirReddit: Ingestor = async (vigilados) => {
  const senales: SenalNueva[] = [];

  for (const v of vigilados) {
    const sub = v.termino.trim().replace(/^\/?r\//i, "").replace(/\/$/, "");
    const url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/.rss`;

    try {
      const xml = await pedirTexto(url, 25000);
      senales.push(
        ...parsearFeed(
          xml,
          { fuente: "REDDIT", tema: v.etiqueta ?? `r/${sub}`, vertical: v.vertical },
          POR_SUB,
        ),
      );
    } catch (e) {
      // El 429 es lo normal aquí, no una avería: se anota y se sigue.
      console.error(`[reddit] r/${sub}:`, (e as Error).message);
    }

    await esperar(ESPERA_MS);
  }

  return senales;
};
