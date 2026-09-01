/**
 * Las cinco etapas de negocio de un proyecto, y su estado.
 *
 * Este es el eje del GESTOR DE PROYECTOS: dónde está cada proyecto en la vida de
 * la compañía. No confundir con `phases.ts`, que son las siete fases operativas
 * del producer dentro de la sala de producción (equipo, prepro, materiales,
 * altas, rodaje, postpro, cierre). Una etapa contiene varias fases: PREPRODUCCION
 * cubre equipo, prepro, materiales y altas.
 *
 * Sin `server-only` a propósito, igual que `marcas.ts`: los colores se usan en
 * componentes que se renderizan en el navegador.
 */

import type { Etapa, EstadoProyecto } from "@/generated/prisma/enums";

/**
 * El color es de la ETAPA, no del proyecto.
 *
 * Con quince o veinte proyectos activos no existen quince colores que una
 * persona distinga de un vistazo, así que gastar la paleta en identificar
 * proyectos no funciona: el proyecto se identifica por su código (`CHB-2607`),
 * que además es único y ya está en el modelo. El color se reserva para la única
 * dimensión que sí tiene pocos valores y sí quieres leer sin pensar: en qué
 * etapa está.
 *
 * Tonos profundos y poco saturados, para que funcionen sobre `--bone` y admitan
 * texto blanco encima sin pelearse con el blanco y negro del resto de la app.
 */
export const ETAPAS = [
  {
    clave: "VENTA",
    n: "01",
    label: "Venta",
    color: "#a8760a",
    descripcion: "Hay una oportunidad y hay que ganarla",
  },
  {
    clave: "PREPRODUCCION",
    n: "02",
    label: "Preproducción",
    color: "#2b4c8c",
    descripcion: "Ganado: se cierra equipo, presupuesto y calendario",
  },
  {
    clave: "RODAJE",
    n: "03",
    label: "Rodaje",
    color: "#b3261e",
    descripcion: "Jornadas de rodaje — el equipo no está disponible",
  },
  {
    clave: "POSTPRODUCCION",
    n: "04",
    label: "Postproducción",
    color: "#5b3f8f",
    descripcion: "Montaje, formatos y entregas a cliente",
  },
  {
    clave: "CIERRE",
    n: "05",
    label: "Cierre",
    color: "#2f6b4f",
    descripcion: "Facturas, gastos y cierre económico",
  },
] as const satisfies ReadonlyArray<{
  clave: Etapa;
  n: string;
  label: string;
  color: string;
  descripcion: string;
}>;

export const CLAVES_ETAPA = ETAPAS.map((e) => e.clave);

const POR_CLAVE = Object.fromEntries(ETAPAS.map((e) => [e.clave, e])) as Record<
  Etapa,
  (typeof ETAPAS)[number]
>;

export function etapa(clave: Etapa) {
  return POR_CLAVE[clave];
}

/** Posición en el recorrido, para ordenar sin depender del orden del enum. */
export function ordenEtapa(clave: Etapa) {
  return CLAVES_ETAPA.indexOf(clave);
}

// ---------- Estado ----------

export const ESTADOS = {
  OPORTUNIDAD: { label: "Oportunidad", vivo: true },
  ACTIVO: { label: "Activo", vivo: true },
  PERDIDO: { label: "Perdido", vivo: false },
  PAUSADO: { label: "Pausado", vivo: true },
  CERRADO: { label: "Cerrado", vivo: false },
} as const satisfies Record<EstadoProyecto, { label: string; vivo: boolean }>;

/**
 * Si el proyecto sigue pidiendo trabajo hoy.
 *
 * PAUSADO cuenta como vivo a propósito: un proyecto congelado por el cliente
 * puede volver la semana que viene y el equipo tiene que seguir viéndolo. Lo que
 * sale de la vista del día a día es lo que ya terminó, ganándolo o perdiéndolo.
 */
export function estaVivo(estado: EstadoProyecto) {
  return ESTADOS[estado].vivo;
}

/**
 * Archivado no es borrado: los proyectos perdidos y los cerrados se consultan.
 * Saber cuánto se presentó frente a cuánto se ganó es información de negocio, y
 * el trabajo que costó preparar una propuesta que no salió es tan real como el
 * de una que sí.
 */
export function estaArchivado(estado: EstadoProyecto) {
  return !ESTADOS[estado].vivo;
}
