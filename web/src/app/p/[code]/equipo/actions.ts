"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { getOrCreateActiveToken } from "@/lib/tokens";
import { buildWaLink, buildWaMessage } from "@/lib/wa";

const ALL_PERMISOS = ["Briefing", "Materiales", "Rodaje", "Cierre"];

export async function addMemberAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "equipo");

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const rate = Number(formData.get("rate") ?? 0);
  const dias = Number(formData.get("dias") ?? 1);
  const requiereAlta = formData.get("requiereAlta") === "on";
  const permisos = ALL_PERMISOS.filter((p) => formData.get(`perm_${p}`) === "on");

  if (!name || !role) return;

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const person = await db.person.create({
    data: { name, phone, initials },
  });

  await db.projectMember.create({
    data: {
      projectId: project.id,
      personId: person.id,
      role,
      rate: Number.isFinite(rate) ? rate : 0,
      dias: Number.isFinite(dias) && dias > 0 ? dias : 1,
      requiereAlta,
      permisos,
    },
  });

  revalidatePath(`/p/${code}/equipo`);
}

export async function toggleConfirmedAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  await requireStaffAccess(code, "equipo");

  const memberId = String(formData.get("memberId") ?? "");
  const member = await db.projectMember.findUnique({ where: { id: memberId } });
  if (!member) return;

  await db.projectMember.update({
    where: { id: memberId },
    data: { confirmed: !member.confirmed },
  });

  revalidatePath(`/p/${code}/equipo`);
}

export async function convocarAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "equipo");

  const memberId = String(formData.get("memberId") ?? "");
  const member = await db.projectMember.findUnique({
    where: { id: memberId },
    include: { person: true },
  });
  if (!member) return;

  const token = await getOrCreateActiveToken(member.id);
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const ficha = `${baseUrl}/f/${token}`;

  const message = buildWaMessage(
    { name: member.person.name, phone: member.person.phone, role: member.role, dias: member.dias },
    project,
    ficha
  );

  revalidatePath(`/p/${code}/equipo`);
  redirect(buildWaLink(member.person.phone, message));
}
