import { pedirJson, esperar, type Ingestor, type SenalNueva } from "./tipos";

/**
 * Publicaciones de cuentas concretas de Bluesky.
 *
 * Se leen cuentas curadas y no búsquedas por palabra clave porque `searchPosts`
 * ya exige autenticación (devuelve 403 sin credenciales), mientras que
 * `getAuthorFeed` sigue siendo abierto. Y para lo que queremos probablemente sea
 * mejor: seguir a diez personas con criterio da más señal que buscar un hashtag
 * y comerse el ruido entero.
 *
 * En `TemaSeguido.termino` va el handle: "dezeen.bsky.social".
 */

const POR_CUENTA = 25;

type Post = {
  post?: {
    uri?: string;
    cid?: string;
    author?: { handle?: string; displayName?: string };
    record?: { text?: string; createdAt?: string; langs?: string[] };
    likeCount?: number;
    repostCount?: number;
  };
};

export const ingerirBluesky: Ingestor = async (vigilados) => {
  const senales: SenalNueva[] = [];

  for (const v of vigilados) {
    const handle = v.termino.trim().replace(/^@/, "");
    const url =
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed` +
      `?actor=${encodeURIComponent(handle)}&limit=${POR_CUENTA}`;

    try {
      const datos = (await pedirJson(url)) as { feed?: Post[] };

      for (const item of datos.feed ?? []) {
        const p = item.post;
        const texto = p?.record?.text?.trim();
        if (!p?.uri || !texto) continue;

        senales.push({
          fuente: "BLUESKY",
          claveExterna: p.uri,
          // El post no tiene título: se usa el arranque del texto como tal.
          titulo: texto.slice(0, 140),
          texto,
          url: `https://bsky.app/profile/${p.author?.handle ?? handle}/post/${p.uri.split("/").pop()}`,
          autor: p.author?.handle ?? handle,
          idioma: p.record?.langs?.[0] ?? null,
          // Interacción total como medida de fuerza.
          metrica: (p.likeCount ?? 0) + (p.repostCount ?? 0),
          tema: handle,
          vertical: v.vertical,
          publicadaEn: p.record?.createdAt ? new Date(p.record.createdAt) : null,
        });
      }
    } catch (e) {
      console.error(`[bluesky] @${handle}:`, (e as Error).message);
    }

    await esperar(300);
  }

  return senales;
};
