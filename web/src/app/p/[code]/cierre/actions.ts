"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";

function txt(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function num(formData: FormData, key: string) {
  const v = txt(formData, key);
  if (v === null) return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Producción registra o corrige la factura esperada de un colaborador. */
export async function guardarFacturaAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "cierre");

  const projectMemberId = String(formData.get("projectMemberId") ?? "");
  const member = await db.projectMember.findUnique({ where: { id: projectMemberId } });
  if (!member || member.projectId !== project.id) return;

  const concept = txt(formData, "concept") ?? `Honorarios ${member.role}`;
  const amount = num(formData, "amount") ?? 0;
  const state = String(formData.get("state") ?? "pendiente");

  await db.invoice.upsert({
    where: { projectMemberId },
    create: {
      projectMemberId,
      concept,
      amount,
      state,
      receivedAt: state === "recibida" ? new Date() : null,
    },
    update: {
      concept,
      amount,
      state,
      receivedAt: state === "recibida" ? new Date() : null,
    },
  });

  revalidatePath(`/p/${code}/cierre`);
}

/**
 * Gasto de producción a mano. Cuando OK Ticket esté conectado, sus gastos
 * entrarán por aquí mismo con `source: "ok_ticket"` y su `externalId`; estos
 * quedan marcados como manuales para poder distinguirlos y no duplicarlos.
 */
export async function anadirGastoAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "cierre");

  const concept = txt(formData, "concept");
  const amount = num(formData, "amount");
  if (!concept || amount === null) return;

  await db.expense.create({
    data: { projectId: project.id, concept, amount, source: "manual" },
  });

  revalidatePath(`/p/${code}/cierre`);
}

export async function borrarGastoAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "cierre");

  const id = String(formData.get("expenseId") ?? "");
  const gasto = await db.expense.findUnique({ where: { id } });
  if (!gasto || gasto.projectId !== project.id) return;

  await db.expense.delete({ where: { id } });
  revalidatePath(`/p/${code}/cierre`);
}
