import "server-only";
import { notFound, redirect } from "next/navigation";
import type { StaffTier } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { getStaffUserId } from "@/lib/session";
import { resolveAccessToken } from "@/lib/tokens";
import { firstAllowedPhaseForStaff, staffPhaseAllowed, type PhaseKey } from "@/lib/phases";

export async function requireStaff() {
  const userId = await getStaffUserId();
  if (!userId) redirect("/login");

  const staff = await db.staffUser.findUnique({ where: { id: userId } });
  if (!staff) redirect("/login");
  return staff;
}

export async function requireStaffAccess(code: string, phase: PhaseKey) {
  const staff = await requireStaff();

  const project = await db.project.findUnique({ where: { code } });
  if (!project) notFound();

  // Un externo no debe ni enterarse de que existe un proyecto que no lleva, así
  // que 404 y no "no autorizado": lo segundo confirma que está ahí.
  if (!(await puedeVerProyecto(staff, project.id))) notFound();

  // Un proyecto en venta todavía no es una producción: no hay equipo que
  // convocar, ni material que pedir, ni jornadas que planificar. La sala de
  // producción se abre con el GO, y hasta entonces el proyecto se trabaja en su
  // ficha del gestor. Se comprueba aquí y no ocultando el enlace, porque quien
  // tenga la URL guardada del proyecto anterior la va a usar.
  if (project.etapa === "VENTA") {
    redirect(`/gestor/${code}`);
  }

  if (!staffPhaseAllowed(staff.tier, phase)) {
    redirect(`/p/${code}/${firstAllowedPhaseForStaff(staff.tier)}`);
  }

  return { project, staff };
}

/**
 * Filtro de proyectos visibles para alguien.
 *
 * El equipo de casa ve todos: el objetivo de la herramienta es que cualquiera
 * sepa qué hay encima de la mesa. Un producer externo ve solo aquellos en los
 * que está asignado — tiene cuenta para poder trabajar, no para conocer la
 * cartera de la compañía.
 *
 * Devuelve un fragmento de `where` para componer en la consulta, en vez de
 * filtrar en memoria: si el filtro se aplicase después de traer las filas, los
 * proyectos ajenos habrían pasado igualmente por el servidor.
 */
export function filtroProyectosVisibles(staff: { id: string; tier: StaffTier }) {
  if (staff.tier !== "EXTERNO") return {};
  return { asignaciones: { some: { staffUserId: staff.id } } };
}

/** Si esa persona puede abrir ese proyecto concreto. */
export async function puedeVerProyecto(
  staff: { id: string; tier: StaffTier },
  projectId: string,
) {
  if (staff.tier !== "EXTERNO") return true;
  const n = await db.asignacionEtapa.count({
    where: { projectId, staffUserId: staff.id },
  });
  return n > 0;
}

export async function requireStaffTier(allowedTiers: StaffTier[]) {
  const staff = await requireStaff();
  if (!allowedTiers.includes(staff.tier)) redirect("/gestor");
  return staff;
}

export async function requireMemberByToken(token: string) {
  const member = await resolveAccessToken(token);
  if (!member) notFound();
  return member;
}
