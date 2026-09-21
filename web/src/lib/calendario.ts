/**
 * La rejilla temporal del calendario de proyectos.
 *
 * Todo se calcula en días UTC, igual que `hitos.ts`, porque los hitos se
 * guardan como `DATE` —un día del calendario, no un instante— y mezclar husos
 * aquí desplazaría barras un día entero según la hora a la que se mire la
 * pantalla.
 *
 * Las posiciones salen en porcentaje y no en píxeles a propósito: así la misma
 * rejilla vale para una pantalla de 1180px y para un portátil de 1280 sin
 * recalcular nada en el navegador, y la página sigue siendo servidor puro.
 */

import { diasEntre } from "./hitos";

export type Ventana = { meses: 1 | 2 | 3; label: string };

export const VENTANAS: Ventana[] = [
  { meses: 1, label: "Mes" },
  { meses: 2, label: "Bimestre" },
  { meses: 3, label: "Trimestre" },
];

export function inicioDeMes(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function sumarMeses(d: Date, n: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

/** "2026-09" → primero de septiembre de 2026. Cualquier otra cosa → null. */
export function mesDesdeParam(valor: string | undefined | null) {
  const m = (valor ?? "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function mesAParam(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type Rango = {
  inicio: Date;
  /** Exclusivo: el primer día que YA NO entra. */
  fin: Date;
  dias: number;
  meses: { label: string; izquierda: number; ancho: number }[];
};

const MESES_LARGOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function construirRango(desde: Date, meses: number): Rango {
  const inicio = inicioDeMes(desde);
  const fin = sumarMeses(inicio, meses);
  const dias = diasEntre(inicio, fin);

  const bloques = Array.from({ length: meses }, (_, i) => {
    const a = sumarMeses(inicio, i);
    const b = sumarMeses(inicio, i + 1);
    return {
      label: `${MESES_LARGOS[a.getUTCMonth()]} ${a.getUTCFullYear()}`,
      izquierda: (diasEntre(inicio, a) / dias) * 100,
      ancho: (diasEntre(a, b) / dias) * 100,
    };
  });

  return { inicio, fin, dias, meses: bloques };
}

/** Dónde cae un día dentro del rango, en % del ancho. */
export function posicion(fecha: Date, rango: Rango) {
  return (diasEntre(rango.inicio, fecha) / rango.dias) * 100;
}

export function dentroDelRango(fecha: Date, rango: Rango) {
  return diasEntre(rango.inicio, fecha) >= 0 && diasEntre(fecha, rango.fin) > 0;
}

/**
 * Una barra recortada al rango visible.
 *
 * Devuelve `null` si el tramo queda entero fuera. Un rodaje que empieza antes
 * del periodo y termina dentro sí se pinta: se recorta por la izquierda y se
 * marca `abiertaIzquierda` para que la barra no aparente empezar el día 1.
 */
export function barra(inicio: Date, fin: Date, rango: Rango) {
  const desde = Math.max(0, diasEntre(rango.inicio, inicio));
  const hasta = Math.min(rango.dias, diasEntre(rango.inicio, fin) + 1);
  if (hasta <= 0 || desde >= rango.dias || hasta <= desde) return null;
  return {
    izquierda: (desde / rango.dias) * 100,
    ancho: ((hasta - desde) / rango.dias) * 100,
    abiertaIzquierda: diasEntre(rango.inicio, inicio) < 0,
    abiertaDerecha: diasEntre(rango.inicio, fin) + 1 > rango.dias,
  };
}

/**
 * Rodajes de proyectos distintos que caen el mismo día.
 *
 * Es la razón de ser de esta pantalla. En una compañía de este tamaño el equipo
 * de rodaje es en buena parte el mismo, así que dos rodajes solapados no son un
 * dato de color: son un problema que hay que resolver antes de que llegue el
 * día. Se compara solo entre proyectos DISTINTOS —dos jornadas seguidas del
 * mismo rodaje no son un choque, son un rodaje de dos días.
 */
export type Jornada = { hitoId: string; projectId: string; inicio: Date; fin: Date };

export function choquesDeRodaje(jornadas: Jornada[]): Set<string> {
  const chocan = new Set<string>();
  for (let i = 0; i < jornadas.length; i++) {
    for (let j = i + 1; j < jornadas.length; j++) {
      const a = jornadas[i];
      const b = jornadas[j];
      if (a.projectId === b.projectId) continue;
      // Solapan si cada uno empieza antes de que el otro termine.
      if (diasEntre(a.inicio, b.fin) >= 0 && diasEntre(b.inicio, a.fin) >= 0) {
        chocan.add(a.hitoId);
        chocan.add(b.hitoId);
      }
    }
  }
  return chocan;
}
