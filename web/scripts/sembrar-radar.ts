/**
 * Siembra una lista inicial de temas a vigilar.
 *
 *   npx tsx --env-file=.env scripts/sembrar-radar.ts
 *
 * Es un punto de partida para discutir, no una lista definitiva: ampliar el
 * radar es añadir filas a `TemaSeguido`, no tocar código.
 */
import { db } from "../src/lib/db";

const TEMAS: { fuente: string; termino: string; etiqueta?: string; vertical?: string; idioma?: string }[] = [
  // --- Wikipedia: interés cultural por tema ---
  { fuente: "WIKIPEDIA", termino: "Moda", vertical: "MODA", idioma: "es" },
  { fuente: "WIKIPEDIA", termino: "Streetwear", vertical: "MODA", idioma: "en" },
  { fuente: "WIKIPEDIA", termino: "Diseño gráfico", vertical: "DISENO", idioma: "es" },
  { fuente: "WIKIPEDIA", termino: "Internet meme", vertical: "MEME", idioma: "en" },
  { fuente: "WIKIPEDIA", termino: "Inteligencia artificial", vertical: "TECNOLOGIA", idioma: "es" },
  { fuente: "WIKIPEDIA", termino: "Cine español", vertical: "CINE", idioma: "es" },

  // --- RSS: medios con criterio editorial ---
  { fuente: "RSS", termino: "https://www.dezeen.com/feed/", etiqueta: "Dezeen", vertical: "DISENO" },
  { fuente: "RSS", termino: "https://www.itsnicethat.com/feed", etiqueta: "It's Nice That", vertical: "DISENO" },
  { fuente: "RSS", termino: "https://www.thisiscolossal.com/feed/", etiqueta: "Colossal", vertical: "CULTURA" },
  { fuente: "RSS", termino: "https://www.highsnobiety.com/feed/", etiqueta: "Highsnobiety", vertical: "MODA" },
  { fuente: "RSS", termino: "https://www.creativebloq.com/feeds/all", etiqueta: "Creative Bloq", vertical: "DISENO" },

  // --- RSS: ronda de fuentes españolas, verificadas con curl antes de sembrar
  // (código 200 + content-type real + títulos de contenido actual, no una
  // página de error servida con 200) ---
  { fuente: "RSS", termino: "https://www.highxtar.com/feed/", etiqueta: "HIGHXTAR", vertical: "MODA" },
  { fuente: "RSS", termino: "https://fuckingyoung.es/feed/", etiqueta: "Fucking Young!", vertical: "DISENO" },
  { fuente: "RSS", termino: "https://www.iabspain.es/feed/", etiqueta: "IAB Spain", vertical: "INTERNET" },
  { fuente: "RSS", termino: "https://prnoticias.com/feed", etiqueta: "PR Noticias", vertical: "INTERNET" },
  { fuente: "RSS", termino: "https://cinemascomics.com/feed/", etiqueta: "Cinemascomics", vertical: "CINE" },
  { fuente: "RSS", termino: "https://www.meneame.net/rss", etiqueta: "Menéame", vertical: "INTERNET" },

  // --- Bluesky: cuentas curadas (el handle va en `termino`) ---
  { fuente: "BLUESKY", termino: "dezeen.bsky.social", etiqueta: "Dezeen", vertical: "DISENO" },
  { fuente: "BLUESKY", termino: "theverge.com", etiqueta: "The Verge", vertical: "TECNOLOGIA" },

  // --- Hacker News: sin términos entra la portada entera ---

  // --- Telegram: vista previa pública (t.me/s/), verificada canal a canal —
  // varios @handles obvios están okupados y devuelven mensajes reales pero
  // irrelevantes ("Channel created"), así que solo entran los que se
  // comprobó que traen contenido genuino del canal que dicen ser ---
  { fuente: "TELEGRAM", termino: "chollometro", etiqueta: "Chollometro", vertical: "INTERNET" },
  { fuente: "TELEGRAM", termino: "xataka", etiqueta: "Xataka", vertical: "TECNOLOGIA" },
  { fuente: "TELEGRAM", termino: "microsiervos", etiqueta: "Microsiervos", vertical: "TECNOLOGIA" },

  // --- Telegram: segunda ronda, tras un rastreo a fondo por categorías
  // (directorios de canales + verificación de contenido real uno a uno).
  // Se descartó adrede toda la categoría de "noticias/actualidad": los
  // directorios de canales en español para esa categoría están dominados por
  // medios de propaganda estatal (RT, HispanTV) y conspiranoia (rafapal,
  // ReVelión), nada que case con "buen gusto, curado". También se descartaron
  // varios canales de humor con volumen real (canalhumor, memesyotros,
  // MemesTgm, mimimianimal): son solo imagen sin texto, y este ingestor lee
  // texto — no hay nada que extraer, no es un problema de calidad.
  { fuente: "TELEGRAM", termino: "ofertaszone", etiqueta: "OfertasZone", vertical: "INTERNET" },
  { fuente: "TELEGRAM", termino: "compradiccion", etiqueta: "Compradicción", vertical: "INTERNET" },
  { fuente: "TELEGRAM", termino: "gangagato", etiqueta: "GangaGato", vertical: "INTERNET" },
  { fuente: "TELEGRAM", termino: "viajerospiratas", etiqueta: "Viajeros Piratas", vertical: "INTERNET" },
  { fuente: "TELEGRAM", termino: "OfertasxJuegos", etiqueta: "Ofertas x Juegos", vertical: "TECNOLOGIA" },
  { fuente: "TELEGRAM", termino: "OfertasJuegosPlayStation", etiqueta: "Ofertas PlayStation", vertical: "TECNOLOGIA" },
  { fuente: "TELEGRAM", termino: "confesionarioanonimo", etiqueta: "Confesionario Anónimo", vertical: "MEME" },
  { fuente: "TELEGRAM", termino: "memesxtra", etiqueta: "Memesxtra", vertical: "MEME" },
  { fuente: "TELEGRAM", termino: "curiositix", etiqueta: "Curiositix", vertical: "CULTURA" },
  { fuente: "TELEGRAM", termino: "aullidos", etiqueta: "Aullidos", vertical: "CINE" },
  { fuente: "TELEGRAM", termino: "infoestrenos", etiqueta: "Info Estrenos", vertical: "CINE" },

  // --- Telegram: canales de meme puro (imagen/vídeo sin texto). Se
  // descartaron en la primera pasada porque el ingestor solo leía texto;
  // ahora que también lee imagen + vistas, son justo lo que alimenta el
  // módulo de memes por volumen e interacción ---
  { fuente: "TELEGRAM", termino: "canalhumor", etiqueta: "Canal Humor", vertical: "MEME" },
  { fuente: "TELEGRAM", termino: "memesyotros", etiqueta: "Memes y Otros", vertical: "MEME" },
  { fuente: "TELEGRAM", termino: "MemesTgm", etiqueta: "MemesTgm", vertical: "MEME" },
  { fuente: "TELEGRAM", termino: "mimimianimal", etiqueta: "Mimimianimal", vertical: "MEME" },

  // --- GDELT: sin verificar todavía ---
  { fuente: "GDELT", termino: "advertising campaign", vertical: "CULTURA" },
];

(async () => {
  let creados = 0;
  let ya = 0;

  for (const t of TEMAS) {
    const existe = await db.temaSeguido.findUnique({
      where: { fuente_termino: { fuente: t.fuente, termino: t.termino } },
    });
    if (existe) { ya++; continue; }
    await db.temaSeguido.create({
      data: {
        fuente: t.fuente,
        termino: t.termino,
        etiqueta: t.etiqueta ?? null,
        vertical: t.vertical ?? null,
        idioma: t.idioma ?? null,
      },
    });
    creados++;
  }

  console.log(`temas creados: ${creados} · ya existían: ${ya}`);
  await db.$disconnect();
})();
