import { pedirJson, esperar, type Ingestor, type SenalNueva } from "./tipos";

/**
 * Feeds de Bluesky (los de SkyFeed y cualquier otro generador).
 *
 * Va aparte de las cuentas porque son cosas distintas: una cuenta es "qué dice
 * esta persona", un feed es "qué se dice sobre esto". Un feed bien montado —por
 * palabras clave o agrupando cincuenta cuentas— da mejor señal que seguir
 * perfiles uno a uno, y `getFeed` es accesible sin autenticación.
 *
 * En `TemaSeguido.termino` vale tanto la URL que se copia del navegador como el
 * URI at:// interno; se normaliza aquí.
 */

const POR_FEED = 60;

type Post = {
  post?: {
    uri?: string;
    author?: { handle?: string };
    record?: { text?: string; createdAt?: string; langs?: string[] };
    likeCount?: number;
    repostCount?: number;
    replyCount?: number;
  };
};

/**
 * Acepta lo que el usuario tenga a mano y devuelve el URI que quiere la API:
 *   https://bsky.app/profile/did:plc:abc/feed/loquesea  →  at://did:plc:abc/app.bsky.feed.generator/loquesea
 */
export function normalizarUriFeed(entrada: string): string | null {
  const s = entrada.trim();
  if (s.startsWith("at://")) return s;

  const m = s.match(/bsky\.app\/profile\/([^/]+)\/feed\/([^/?#]+)/i);
  if (m) return `at://${m[1]}/app.bsky.feed.generator/${m[2]}`;

  return null;
}

export const ingerirBlueskyFeed: Ingestor = async (vigilados) => {
  const senales: SenalNueva[] = [];

  for (const v of vigilados) {
    const uri = normalizarUriFeed(v.termino);
    if (!uri) {
      console.error(`[bluesky-feed] no reconozco "${v.termino}" como feed`);
      continue;
    }

    const url =
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getFeed` +
      `?feed=${encodeURIComponent(uri)}&limit=${POR_FEED}`;

    try {
      const datos = (await pedirJson(url, 25000)) as { feed?: Post[] };

      for (const item of datos.feed ?? []) {
        const p = item.post;
        const texto = p?.record?.text?.trim();
        if (!p?.uri || !texto) continue;

        senales.push({
          fuente: "BLUESKY_FEED",
          claveExterna: p.uri,
          titulo: texto.slice(0, 140),
          texto,
          url: `https://bsky.app/profile/${p.author?.handle}/post/${p.uri.split("/").pop()}`,
          autor: p.author?.handle ?? null,
          idioma: p.record?.langs?.[0] ?? null,
          // Se suman también las respuestas: en un feed temático, que algo genere
          // conversación importa tanto como que guste.
          metrica: (p.likeCount ?? 0) + (p.repostCount ?? 0) + (p.replyCount ?? 0),
          tema: v.etiqueta ?? uri.split("/").pop() ?? null,
          vertical: v.vertical,
          publicadaEn: p.record?.createdAt ? new Date(p.record.createdAt) : null,
        });
      }
    } catch (e) {
      console.error(`[bluesky-feed] ${v.etiqueta ?? uri}:`, (e as Error).message);
    }

    await esperar(400);
  }

  return senales;
};
