/**
 * Hitos: las fechas señaladas de un proyecto.
 *
 * Aquí viven las etiquetas y las reglas de lectura del calendario. Las consultas
 * están en el módulo del gestor; esto es solo vocabulario compartido entre
 * servidor y navegador, así que sin `server-only`.
 */

import type { Etapa, TipoHito, Criticidad } from "@/generated/prisma/enums";

export const TIPOS_HITO = {
  ENTREGA_PROPUESTA: { label: "Entrega de propuesta", etapa: "VENTA" },
  PPM: { label: "PPM", etapa: "PREPRODUCCION" },
  RODAJE: { label: "Rodaje", etapa: "RODAJE" },
  ENTREGA_MATERIAL: { label: "Entrega de material", etapa: "RODAJE" },
  ENTREGA_MONTAJE: { label: "Entrega de montaje", etapa: "POSTPRODUCCION" },
  ENTREGA_CLIENTE: { label: "Entrega a cliente", etapa: "POSTPRODUCCION" },
  CIERRE_ECONOMICO: { label: "Cierre económico", etapa: "CIERRE" },
  OTRO: { label: "Otro", etapa: null },
} as const satisfies Record<TipoHito, { label: string; etapa: Etapa | null }>;

export const CRITICIDADES = {
  NORMAL: { label: "Normal" },
  ALTA: { label: "Alta" },
  CRITICA: { label: "Crítica" },
} as const satisfies Record<Criticidad, { label: string }>;

/**
 * Un rodaje no es una tarea que alguien pueda atender: es una jornada en la que
 * el equipo está en set, atendiendo a cliente y a que todo salga en tiempo, no
 * frente al ordenador. Por eso el calendario lo pinta como una franja que ocupa
 * el día entero en vez de como una tarjeta más, y por eso cualquier otra fecha
 * que caiga encima es un aviso.
 */
export function bloqueaJornada(tipo: TipoHito) {
  return tipo === "RODAJE";
}

/**
 * Cuánto aprieta una fecha, contando desde hoy.
 *
 * Deliberadamente separado de `criticidad`: son dos cosas distintas que en el
 * calendario se pintan por canales distintos. La criticidad dice cuánto duele
 * fallar (una entrega a cliente duele más que una reunión interna) y no cambia
 * con el tiempo; la urgencia dice cuánto queda y cambia sola cada día. Si las
 * mezclas en un solo color, no puedes ver las dos a la vez.
 */
export type Urgencia = "vencido" | "inminente" | "proximo" | "lejano";

export function urgencia(fecha: Date, hoy: Date): Urgencia {
  const dias = diasEntre(hoy, fecha);
  if (dias < 0) return "vencido";
  if (dias <= 2) return "inminente";
  if (dias <= 7) return "proximo";
  return "lejano";
}

/**
 * Días de calendario entre dos fechas, ignorando la hora.
 *
 * Se compara en UTC a propósito: los hitos se guardan como `DATE` (un día, no un
 * instante), y restar dos fechas locales cruzando un cambio de hora da 0,96 o
 * 1,04 días en vez de 1.
 */
export function diasEntre(desde: Date, hasta: Date) {
  const a = Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), desde.getUTCDate());
  const b = Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth(), hasta.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

/**
 * Lee el "YYYY-MM-DD" de un `<input type="date">`.
 *
 * Se construye en UTC a propósito: `new Date("2026-07-24")` ya es UTC, pero
 * `new Date(2026, 6, 24)` sería medianoche local y en España se guardaría como
 * el día 23 a las 22:00. Los hitos son días de calendario, no instantes.
 */
export function fechaDesdeInput(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const m = valor.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const fecha = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** El inverso: de `Date` al valor que espera un `<input type="date">`. */
export function fechaParaInput(fecha: Date | null | undefined) {
  return fecha ? fecha.toISOString().slice(0, 10) : "";
}

/** "24 JUL" o "24–25 JUL", en el mismo estilo seco que ya usa la app. */
export function etiquetaFecha(fecha: Date, fechaFin?: Date | null) {
  const mes = (d: Date) => MESES[d.getUTCMonth()];
  const dia = (d: Date) => String(d.getUTCDate()).padStart(2, "0");

  if (!fechaFin || diasEntre(fecha, fechaFin) === 0) {
    return `${dia(fecha)} ${mes(fecha)}`;
  }
  if (fecha.getUTCMonth() === fechaFin.getUTCMonth()) {
    return `${dia(fecha)}–${dia(fechaFin)} ${mes(fecha)}`;
  }
  return `${dia(fecha)} ${mes(fecha)} – ${dia(fechaFin)} ${mes(fechaFin)}`;
}

const MESES = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];
