import { pedirTexto, esperar, type Ingestor, type SenalNueva } from "./tipos";

/**
 * Canales públicos de Telegram, vía su vista previa web (`t.me/s/<canal>`).
 *
 * Telegram no tiene una API REST abierta para leer un canal sin autenticarse
 * como cliente (MTProto, con sesión). Pero la vista previa que usa para
 * compartir enlaces en redes sociales es HTML normal, sin login, y trae los
 * últimos mensajes con fecha y enlace estables. Es scraping, no una API: se
 * rompe si Telegram cambia el marcado, igual que RSS se rompe si un medio
 * cambia de plantilla. La diferencia con Forocoches (descartado) es que aquí
 * SÍ hay contenido real detrás del HTML, verificado antes de sembrar nada.
 *
 * Ojo con los @handles: muchos están "aparcados" (cuentas okupadas que venden
 * el nombre) y devuelven HTML con mensajes reales pero irrelevantes tipo
 * "Channel created" o "im only sell this username". Hay que mirar el
 * contenido, no solo el HTTP 200, antes de dar un canal por bueno.
 *
 * En `termino` va el @handle público, sin arroba.
 *
 * Los canales de meme puro (imagen o vídeo sin texto) también se leen aquí:
 * antes se descartaban por no tener nada que meter en `titulo`, pero la
 * imagen y las vistas SÍ son señal — solo había que dejar de exigir texto.
 */

const POR_CANAL = 20;

/** "7.09K" / "1.2M" / "523" → número. Vacío o irreconocible → null. */
function parsearVistas(texto: string | undefined): number | null {
  if (!texto) return null;
  const m = texto.trim().match(/^([\d.,]+)\s*([KM])?$/i);
  if (!m) return null;
  const base = Number(m[1].replace(",", "."));
  if (Number.isNaN(base)) return null;
  const mult = m[2]?.toUpperCase() === "M" ? 1_000_000 : m[2]?.toUpperCase() === "K" ? 1_000 : 1;
  return Math.round(base * mult);
}

function limpiarTexto(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsearCanalTelegram(
  html: string,
  meta: { canal: string; etiqueta: string | null; vertical: string | null },
  maximo = POR_CANAL,
): SenalNueva[] {
  const senales: SenalNueva[] = [];

  // Cada mensaje empieza con su propio `data-post="canal/123"`: partir el HTML
  // por esas posiciones da un bloque acotado por mensaje sin tener que casar
  // divs anidados (los mensajes solo anidan etiquetas en línea, pero el
  // reproductor de vídeo o el álbum de fotos sí meten divs de sobra).
  const marcas = [...html.matchAll(/data-post="([^"]+\/(\d+))"/g)];

  for (let i = 0; i < marcas.length && senales.length < maximo; i++) {
    const inicio = marcas[i].index ?? 0;
    const fin = i + 1 < marcas.length ? marcas[i + 1].index ?? html.length : html.length;
    const bloque = html.slice(inicio, fin);
    const id = marcas[i][1];

    const textoHtml = bloque.match(
      /tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/,
    )?.[1];
    const texto = textoHtml ? limpiarTexto(textoHtml) : null;

    // Foto real primero; si no hay, la miniatura de vídeo (el desenfoque que se
    // ve en la web de Telegram es un filtro CSS de su página, no del archivo:
    // la imagen de fondo en sí llega nítida).
    const imagenUrl =
      bloque.match(/tgme_widget_message_photo_wrap[^"]*"[^>]*style="[^"]*background-image:url\('([^']+)'\)/)?.[1] ??
      bloque.match(/tgme_widget_message_video_thumb"[^>]*style="background-image:url\('([^']+)'\)/)?.[1] ??
      null;

    // Sin texto y sin imagen no hay nada que mostrar (mensajes de servicio
    // como "Channel created", o publicaciones movidas/borradas).
    if (!texto && !imagenUrl) continue;

    const vistas = parsearVistas(bloque.match(/tgme_widget_message_views">([^<]+)/)?.[1]);
    const fechaTexto = bloque.match(/<time datetime="([^"]+)"/)?.[1];
    const fecha = fechaTexto ? new Date(fechaTexto) : null;

    senales.push({
      fuente: "TELEGRAM",
      claveExterna: id,
      titulo: texto ? texto.slice(0, 140) : `${meta.etiqueta ?? meta.canal} · imagen`,
      texto,
      url: `https://t.me/${id}`,
      autor: meta.etiqueta ?? meta.canal,
      idioma: "es",
      imagenUrl,
      metrica: vistas,
      tema: meta.etiqueta ?? meta.canal,
      vertical: meta.vertical,
      publicadaEn: fecha && !Number.isNaN(fecha.getTime()) ? fecha : null,
    });
  }

  return senales;
}

export const ingerirTelegram: Ingestor = async (vigilados) => {
  const senales: SenalNueva[] = [];

  for (const v of vigilados) {
    const canal = v.termino.trim().replace(/^@/, "");

    try {
      const html = await pedirTexto(`https://t.me/s/${encodeURIComponent(canal)}`, 20000);
      senales.push(...parsearCanalTelegram(html, { canal, etiqueta: v.etiqueta, vertical: v.vertical }));
    } catch (e) {
      console.error(`[telegram] ${canal}:`, (e as Error).message);
    }

    await esperar(500);
  }

  return senales;
};
