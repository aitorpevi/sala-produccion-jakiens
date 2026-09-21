import type { StaffTier, Etapa } from "@/generated/prisma/enums";

/**
 * Las SIETE fases operativas de la sala de producción.
 *
 * No confundir con `etapas.ts`, que son las cinco etapas de negocio del gestor.
 * Son dos ejes distintos del mismo proyecto y durante un tiempo se pintaron
 * igual —dos tiras numeradas 01, 02, 03…— con el resultado previsible: "03"
 * significaba Rodaje en una y Materiales en la otra, y hasta quien construyó la
 * herramienta acababa creyendo que la sala de producción había desaparecido.
 *
 * Por eso cada fase declara ahora a qué etapa pertenece. La etapa es la unidad
 * que entiende todo el mundo en la empresa ("está en preproducción"); la fase es
 * la mesa de trabajo concreta dentro de ella. Una etapa contiene varias fases:
 * PREPRODUCCION cubre equipo, prepro, materiales y altas.
 */
export const PHASES = [
  { key: "equipo", n: "01", label: "Equipo", etapa: "PREPRODUCCION", que: "Alta de colaboradores y convocatorias" },
  { key: "prepro", n: "02", label: "Preproducción", etapa: "PREPRODUCCION", que: "Necesidades por departamento y cobertura" },
  { key: "materiales", n: "03", label: "Materiales", etapa: "PREPRODUCCION", que: "Documentos y referencias del proyecto" },
  { key: "altas", n: "04", label: "Altas laborales", etapa: "PREPRODUCCION", que: "Hoja para la gestoría" },
  { key: "rodaje", n: "05", label: "Rodaje", etapa: "RODAJE", que: "Jornadas, orden del día y vista de cliente" },
  { key: "postpro", n: "06", label: "Postproducción", etapa: "POSTPRODUCCION", que: "Montaje, formatos y entregas" },
  { key: "cierre", n: "07", label: "Cierre", etapa: "CIERRE", que: "Facturas, gastos y cierre económico" },
] as const satisfies ReadonlyArray<{
  key: string;
  n: string;
  label: string;
  etapa: Etapa;
  que: string;
}>;

export type PhaseKey = (typeof PHASES)[number]["key"];

// Fases con UI real en este hito; el resto muestra "próximamente".
export const BUILT_PHASES: PhaseKey[] = PHASES.map((p) => p.key); // todas construidas

export const PHASE_STATE: Record<PhaseKey, "done" | "live" | "next"> = {
  equipo: "done",
  prepro: "done",
  materiales: "live",
  altas: "live",
  rodaje: "next",
  postpro: "next",
  cierre: "next",
};

/**
 * Las fases que viven dentro de una etapa, en orden.
 *
 * VENTA devuelve vacío y no es un olvido: antes del GO no hay sala de
 * producción que abrir. Lo que se trabaja entonces —briefing, propuesta,
 * presupuesto de venta— está en la ficha del gestor, y abrir mesas de trabajo
 * de un proyecto que todavía puede perderse solo crea sitios vacíos.
 */
export function fasesDeEtapa(etapa: Etapa): (typeof PHASES)[number][] {
  return PHASES.filter((p) => p.etapa === etapa);
}

/**
 * Dónde aterriza alguien que pulsa una etapa: su primera fase con acceso.
 *
 * Devuelve `null` si la etapa no tiene sala (VENTA) o si el nivel de quien mira
 * no le deja entrar en ninguna de sus fases. En ese caso el paso de la tira no
 * navega, y es correcto que no lo haga: un enlace que lleva a un 404 es peor
 * que un enlace que no está.
 */
export function primeraFaseDeEtapa(etapa: Etapa, tier: StaffTier): PhaseKey | null {
  return fasesDeEtapa(etapa).find((p) => staffPhaseAllowed(tier, p.key))?.key ?? null;
}

/** La etapa a la que pertenece una fase — para saber de qué color pintarla. */
export function etapaDeFase(key: PhaseKey): Etapa {
  return PHASES.find((p) => p.key === key)!.etapa;
}

const PERM_TO_PHASE: Record<string, PhaseKey> = {
  Briefing: "prepro",
  Materiales: "materiales",
  Rodaje: "rodaje",
  Cierre: "cierre",
};

export function phaseAllowedForMember(
  member: { permisos: string[]; requiereAlta: boolean },
  key: PhaseKey
) {
  if (key === "equipo" || key === "postpro") return false; // fases solo de equipo interno
  if (key === "altas") return member.requiereAlta;
  const needed = Object.keys(PERM_TO_PHASE).find((k) => PERM_TO_PHASE[k] === key);
  return needed ? member.permisos.includes(needed) : false;
}

export function firstAllowedPhase(member: { permisos: string[]; requiereAlta: boolean }) {
  return PHASES.map((p) => p.key).find((k) => phaseAllowedForMember(member, k)) ?? "prepro";
}

// ---------- Equipo interno: acceso por nivel (ver REQUISITOS.md sección 9) ----------

export const STAFF_TIER_LABEL: Record<StaffTier, string> = {
  FULL: "Acceso total",
  LOGISTICS: "Logística y creativo",
  POSTPRODUCTION: "Postproducción",
  EXTERNO: "Producer externo",
};

export const STAFF_PHASE_ACCESS: Record<StaffTier, PhaseKey[]> = {
  FULL: PHASES.map((p) => p.key),
  // Altas y Cierre quedan fuera a propósito: son las dos fases que manejan
  // números de coste y datos fiscales del equipo. Prepro sí la ven, pero el
  // bloque de presupuesto de esa página está reservado a FULL.
  LOGISTICS: ["equipo", "prepro", "materiales", "rodaje", "postpro"],
  POSTPRODUCTION: ["prepro", "materiales", "postpro"],
  // Un producer externo opera igual que uno de casa dentro del proyecto que
  // lleva. Lo que le distingue no son las fases que ve, sino QUÉ PROYECTOS ve:
  // solo aquellos en los que está asignado. Eso se resuelve en `access.ts`, no
  // aquí, porque es una cuestión de alcance y no de fase.
  EXTERNO: ["equipo", "prepro", "materiales", "rodaje", "postpro"],
};

export function staffPhaseAllowed(tier: StaffTier, key: PhaseKey) {
  return STAFF_PHASE_ACCESS[tier].includes(key);
}

export function firstAllowedPhaseForStaff(tier: StaffTier): PhaseKey {
  return PHASES.map((p) => p.key).find((k) => staffPhaseAllowed(tier, k)) ?? "prepro";
}
