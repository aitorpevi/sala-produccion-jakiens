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

  // --- Bluesky: cuentas curadas (el handle va en `termino`) ---
  { fuente: "BLUESKY", termino: "dezeen.bsky.social", etiqueta: "Dezeen", vertical: "DISENO" },
  { fuente: "BLUESKY", termino: "theverge.com", etiqueta: "The Verge", vertical: "TECNOLOGIA" },

  // --- Hacker News: sin términos entra la portada entera ---

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
