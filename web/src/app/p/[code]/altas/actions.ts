"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { avisarProyecto } from "@/lib/slack";

function txt(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function num(formData: FormData, key: string) {
  const v = txt(formData, key);
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Producción fija lo que no sale del directorio: fechas del alta e importes pactados. */
export async function guardarAltaAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  await requireStaffAccess(code, "altas");

  const projectMemberId = String(formData.get("projectMemberId") ?? "");
  const member = await db.projectMember.findUnique({
    where: { id: projectMemberId },
    include: { project: true },
  });
  if (!member || member.project.code !== code) return;

  const datos = {
    fechaAlta: txt(formData, "fechaAlta"),
    fechaBaja: txt(formData, "fechaBaja"),
    importeBruto: num(formData, "importeBruto"),
    salarioSesion: num(formData, "salarioSesion"),
  };

  await db.altaLaboral.upsert({
    where: { projectMemberId },
    create: { projectMemberId, ...datos },
    update: datos,
  });

  await db.projectMember.update({
    where: { id: projectMemberId },
    data: { tipoEquipo: String(formData.get("tipoEquipo") ?? "tecnico") },
  });

  revalidatePath(`/p/${code}/altas`);
}

/** Recordatorio manual al colaborador que aún no ha rellenado sus datos. */
export async function recordarAltaAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "altas");

  const projectMemberId = String(formData.get("projectMemberId") ?? "");
  const member = await db.projectMember.findUnique({
    where: { id: projectMemberId },
    include: { person: true },
  });
  if (!member) return;

  await avisarProyecto(
    project,
    `Recordatorio de alta pendiente: *${member.person.name}* (${member.role}) en ${project.name}.`,
  );

  revalidatePath(`/p/${code}/altas`);
}
