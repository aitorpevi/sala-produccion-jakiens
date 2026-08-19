import type { StaffTier } from "@/generated/prisma/enums";

export const PHASES = [
  { key: "equipo", n: "01", label: "Equipo" },
  { key: "prepro", n: "02", label: "Preproducción" },
  { key: "materiales", n: "03", label: "Materiales" },
  { key: "altas", n: "04", label: "Altas laborales" },
  { key: "rodaje", n: "05", label: "Rodaje" },
  { key: "postpro", n: "06", label: "Postproducción" },
  { key: "cierre", n: "07", label: "Cierre" },
] as const;

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
};

export const STAFF_PHASE_ACCESS: Record<StaffTier, PhaseKey[]> = {
  FULL: PHASES.map((p) => p.key),
  // Altas y Cierre quedan fuera a propósito: son las dos fases que manejan
  // números de coste y datos fiscales del equipo. Prepro sí la ven, pero el
  // bloque de presupuesto de esa página está reservado a FULL.
  LOGISTICS: ["equipo", "prepro", "materiales", "rodaje", "postpro"],
  POSTPRODUCTION: ["prepro", "materiales", "postpro"],
};

export function staffPhaseAllowed(tier: StaffTier, key: PhaseKey) {
  return STAFF_PHASE_ACCESS[tier].includes(key);
}

export function firstAllowedPhaseForStaff(tier: StaffTier): PhaseKey {
  return PHASES.map((p) => p.key).find((k) => staffPhaseAllowed(tier, k)) ?? "prepro";
}
