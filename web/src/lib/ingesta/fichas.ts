import type { Fuente } from "./tipos";

/**
 * Ficha de cada fuente: valoración cualitativa, coste y fiabilidad observada.
 *
 * Es texto editorial y no un dato de la base de datos, a propósito. Refleja un
 * juicio de ingeniería hecho al conectar cada fuente —qué falló, qué límites
 * tiene de verdad, si haría falta pagar para escalarla—. Cambiarlo es una
 * decisión que merece pasar por código y quedar en el historial, no un campo
 * que cualquiera edite sin que quede constancia de por qué.
 *
 * Lo cuantitativo (volumen, fiabilidad reciente) SÍ se calcula en vivo — ver
 * `metricasDeFuente` en `@/lib/radar`.
 */

export const NOMBRE_FUENTE: Record<Fuente, string> = {
  WIKIPEDIA: "Wikipedia",
  GDELT: "GDELT",
  BLUESKY: "Bluesky · cuentas",
  BLUESKY_FEED: "Bluesky · feeds",
  BLUESKY_TRENDS: "Bluesky · tendencias",
  HACKERNEWS: "Hacker News",
  RSS: "Medios y newsletters",
  REDDIT: "Reddit",
};

export type FichaFuente = {
  cualitativo: string;
  coste: string;
  fiabilidad: string;
  riesgo?: string;
  /** false = esta fuente no admite términos vigilados (p. ej. tendencias globales). */
  admiteVigilados: boolean;
};

export const FICHAS: Record<Fuente, FichaFuente> = {
  WIKIPEDIA: {
    cualitativo:
      "El termómetro cultural más limpio de la lista: interés real de la gente, sin bots ni marcas pujando. Trae 30 días de histórico desde la primera pasada, así que aporta contexto desde el minuto uno.",
    coste: "Gratis, sin clave, sin límite duro conocido. Cortesía de 250 ms entre peticiones.",
    fiabilidad: "Alta. No ha fallado en ninguna prueba.",
    admiteVigilados: true,
  },
  GDELT: {
    cualitativo:
      "Noticias globales cada 15 minutos con análisis de tono. Sobre el papel, de las fuentes más potentes de toda la lista.",
    coste: "Gratis, sin clave.",
    fiabilidad:
      "Baja hasta ahora: 0 señales en todas las pruebas, incluso espaciando las peticiones por encima de lo que pide la propia API.",
    riesgo:
      "Limita agresivamente por IP desde entornos de desarrollo compartidos. Puede que desde producción funcione — o que los rangos de datacenter estén igual de vigilados. Sin confirmar todavía.",
    admiteVigilados: true,
  },
  BLUESKY: {
    cualitativo:
      "La voz de gente concreta con criterio, no un hashtag genérico. Diez cuentas bien elegidas dan mejor señal que buscar una palabra y comerse el ruido.",
    coste:
      "Gratis, sin clave. La búsqueda por palabra (searchPosts) ya exige login; leer el feed de una cuenta (getAuthorFeed) sigue abierto.",
    fiabilidad: "Alta.",
    admiteVigilados: true,
  },
  BLUESKY_FEED: {
    cualitativo:
      "Feeds ya curados —por palabra clave o por comunidad, vía SkyFeed y similares— en vez de perfiles sueltos. Mejor señal con menos mantenimiento.",
    coste: "Gratis. El endpoint getFeed no exige autenticación, verificado en pruebas.",
    fiabilidad: "Alta, con algún 502 puntual de la propia API (transitorio, no rompe la pasada).",
    admiteVigilados: true,
  },
  BLUESKY_TRENDS: {
    cualitativo:
      "La única fuente que dice por sí sola si un tema SUBE o se ENFRÍA. El resto obliga a comparar dos periodos para saberlo.",
    coste: "Gratis, sin clave.",
    fiabilidad: "Alta hasta ahora.",
    riesgo:
      "Vive en un endpoint \"unspecced\": no documentado ni garantizado. Bluesky puede cambiarlo o retirarlo sin aviso. Si pasa, se apaga sola sin arrastrar a las demás fuentes.",
    admiteVigilados: false,
  },
  HACKERNEWS: {
    cualitativo:
      "Señal temprana de tecnología e internet. Lo que sube aquí hoy suele llegar a prensa generalista una o dos semanas después.",
    coste: "Gratis, sin clave. API oficial (Firebase), estable desde hace años.",
    fiabilidad: "Alta.",
    admiteVigilados: true,
  },
  RSS: {
    cualitativo:
      "Criterio editorial ya filtrado por medios y newsletters con nombre. El filtrado más barato de mantener de toda la lista, porque lo hace otro.",
    coste:
      "Gratis. Depende de que cada medio siga publicando RSS — It's Nice That lo quitó a mitad de este proyecto.",
    fiabilidad: "Alta, con mantenimiento ocasional cuando una URL deja de responder.",
    admiteVigilados: true,
  },
  REDDIT: {
    cualitativo: "Conversación de nicho muy específica — cuando llega a entrar.",
    coste:
      "Gratis en el papel (RSS público, sin API de pago). Reddit cerró el alta automática de aplicaciones a finales de 2025 (Responsible Builder Policy): ya no hay vía de API propia, ni gratis ni pagando, sin aprobación manual.",
    fiabilidad:
      "Baja: 403 y 429 en todas las pruebas desde este entorno, incluso con 9 segundos entre peticiones.",
    riesgo:
      "Puede que desde producción responda mejor, o peor — los rangos de datacenter suelen estar más vigilados que una IP residencial. Queda montado con tolerancia total al fallo: si no trae nada, no rompe ni avisa de más de lo justo.",
    admiteVigilados: true,
  },
};
