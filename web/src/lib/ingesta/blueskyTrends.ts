import { pedirJson, type Ingestor, type SenalNueva } from "./tipos";

/**
 * Temas en tendencia de Bluesky.
 *
 * Es la única fuente que dice por sí sola si algo SUBE o BAJA (`status`:
 * trending / cooling). El resto obliga a comparar periodos para saberlo; aquí
 * viene resuelto.
 *
 * Endpoint `unspecced`: sin autenticación pero sin garantía de estabilidad —
 * Bluesky puede cambiarlo o retirarlo sin avisar. Si un día deja de responder,
 * el radar lo marcará como fuente caída y no se lleva nada por delante.
 *
 * No usa `vigilados`: son las tendencias globales de la red. Se guarda una
 * señal por tema y hora, para poder reconstruir después la curva de un tema
 * aunque la API solo enseñe la foto del momento.
 */

const CUANTAS = 25;

/** La categoría que da Bluesky se traduce a nuestros verticales. */
const A_VERTICAL: Record<string, string> = {
  "science-tech": "TECNOLOGIA",
  entertainment: "CULTURA",
  sports: "CULTURA",
  politics: "CULTURA",
  business: "CULTURA",
  other: "INTERNET",
};

type Trend = {
  topic?: string;
  displayName?: string;
  description?: string;
  link?: string;
  startedAt?: string;
  postCount?: number;
  status?: string;
  category?: string;
};

export const ingerirBlueskyTrends: Ingestor = async () => {
  const datos = (await pedirJson(
    `https://public.api.bsky.app/xrpc/app.bsky.unspecced.getTrends?limit=${CUANTAS}`,
  )) as { trends?: Trend[] };

  // Se redondea a la hora para no crear una señal por cada pasada del día: con
  // tres pasadas diarias, tres puntos por tema bastan para ver la evolución.
  const ahora = new Date();
  ahora.setMinutes(0, 0, 0);
  const sello = ahora.toISOString().slice(0, 13);

  const senales: SenalNueva[] = [];

  for (const t of datos.trends ?? []) {
    if (!t.topic || !t.displayName) continue;

    senales.push({
      fuente: "BLUESKY_TRENDS",
      claveExterna: `${t.topic}:${sello}`,
      titulo: t.displayName,
      texto: [t.description, t.status ? `Estado: ${t.status}` : null].filter(Boolean).join(" · "),
      url: t.link ? `https://bsky.app${t.link}` : null,
      metrica: t.postCount ?? null,
      // El tema lleva el estado para poder separar lo que sube de lo que se apaga
      // sin tener que volver a consultar la API.
      tema: t.status === "cooling" ? "enfriándose" : "subiendo",
      vertical: A_VERTICAL[t.category ?? "other"] ?? "INTERNET",
      publicadaEn: t.startedAt ? new Date(t.startedAt) : ahora,
    });
  }

  return senales;
};
