export const PHASES = [
  { key: "equipo", n: "01", label: "Equipo" },
  { key: "prepro", n: "02", label: "Preproducción" },
  { key: "materiales", n: "03", label: "Materiales" },
  { key: "altas", n: "04", label: "Altas laborales" },
  { key: "rodaje", n: "05", label: "Rodaje" },
  { key: "cierre", n: "06", label: "Cierre" },
] as const;

export type PhaseKey = (typeof PHASES)[number]["key"];

// Fases con UI real en este hito; el resto muestra "próximamente".
export const BUILT_PHASES: PhaseKey[] = ["equipo", "prepro", "materiales"];

export const PHASE_STATE: Record<PhaseKey, "done" | "live" | "next"> = {
  equipo: "done",
  prepro: "done",
  materiales: "live",
  altas: "live",
  rodaje: "next",
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
  if (key === "equipo") return false; // el roster es solo de producción
  if (key === "altas") return member.requiereAlta;
  const needed = Object.keys(PERM_TO_PHASE).find((k) => PERM_TO_PHASE[k] === key);
  return needed ? member.permisos.includes(needed) : false;
}

export function firstAllowedPhase(member: { permisos: string[]; requiereAlta: boolean }) {
  return PHASES.map((p) => p.key).find((k) => phaseAllowedForMember(member, k)) ?? "prepro";
}
