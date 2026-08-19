import "server-only";
import { db } from "@/lib/db";

/**
 * Lecturas del radar.
 *
 * El principio que ordena todo esto: **las métricas de distintas fuentes no son
 * comparables.** 40.000 visitas en Wikipedia, 400 likes en Bluesky y 300 puntos
 * en Hacker News son unidades distintas de cosas distintas. Mezclarlas en un
 * único ranking produce un número que parece significar algo y no significa
 * nada — que es peor que no tener número.
 *
 * Por eso aquí no hay un "top general". Hay lecturas separadas, cada una en sus
 * propias unidades, y la comparación la hace la persona.
 */

/** Un tema con su interés en dos periodos, para saber si sube o baja. */
export type Movimiento = {
  tema: string;
  reciente: number;
  anterior: number;
  variacion: number | null; // porcentaje; null si antes no había nada con lo que comparar
};

/**
 * Qué sube y qué baja en Wikipedia, comparando los últimos 7 días con los 7
 * anteriores.
 *
 * Es la única fuente con serie diaria limpia, así que la única con la que tiene
 * sentido calcular una variación. Y la variación es lo que de verdad importa:
 * que "moda" tenga muchas visitas no dice nada, porque siempre las tiene. Que
 * suba un 40% en una semana sí.
 */
export async function movimientoWikipedia(): Promise<Movimiento[]> {
  const hoy = new Date();
  const hace7 = new Date(hoy.getTime() - 7 * 24 * 3600 * 1000);
  const hace14 = new Date(hoy.getTime() - 14 * 24 * 3600 * 1000);

  const [reciente, anterior] = await Promise.all([
    db.senal.groupBy({
      by: ["tema"],
      where: { fuente: "WIKIPEDIA", publicadaEn: { gte: hace7 } },
      _sum: { metrica: true },
    }),
    db.senal.groupBy({
      by: ["tema"],
      where: { fuente: "WIKIPEDIA", publicadaEn: { gte: hace14, lt: hace7 } },
      _sum: { metrica: true },
    }),
  ]);

  const antes = new Map(anterior.map((a) => [a.tema, a._sum.metrica ?? 0]));

  return reciente
    .map((r) => {
      const ahora = r._sum.metrica ?? 0;
      const previo = antes.get(r.tema) ?? 0;
      return {
        tema: r.tema ?? "—",
        reciente: ahora,
        anterior: previo,
        variacion: previo > 0 ? ((ahora - previo) / previo) * 100 : null,
      };
    })
    .sort((a, b) => (b.variacion ?? -Infinity) - (a.variacion ?? -Infinity));
}

/** Lo más fuerte de una fuente concreta, en sus propias unidades. */
export async function destacadoDe(fuente: string, cuantas = 6, vertical?: string) {
  return db.senal.findMany({
    where: { fuente, ...(vertical ? { vertical } : {}) },
    orderBy: [{ metrica: { sort: "desc", nulls: "last" } }, { publicadaEn: "desc" }],
    take: cuantas,
  });
}

/** Lo más reciente, sin ordenar por fuerza: para fuentes sin métrica, como RSS. */
export async function recienteDe(fuente: string, cuantas = 6, vertical?: string) {
  return db.senal.findMany({
    where: { fuente, ...(vertical ? { vertical } : {}) },
    orderBy: { publicadaEn: "desc" },
    take: cuantas,
  });
}

/** Salud de la ingesta: qué fuentes van y cuáles llevan tiempo sin traer nada. */
export async function saludDeFuentes() {
  const [porFuente, pasadas] = await Promise.all([
    db.senal.groupBy({ by: ["fuente"], _count: true }),
    db.pasadaIngesta.findMany({ orderBy: { creadoEn: "desc" }, take: 40 }),
  ]);

  // La última pasada de cada fuente.
  const ultima = new Map<string, (typeof pasadas)[number]>();
  for (const p of pasadas) if (!ultima.has(p.fuente)) ultima.set(p.fuente, p);

  return { porFuente, ultima };
}
