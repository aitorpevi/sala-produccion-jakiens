"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { notifySlack } from "@/lib/slack";

export async function updateDriveLinkAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project, staff } = await requireStaffAccess(code, "postpro");

  const driveFolderUrl = String(formData.get("driveFolderUrl") ?? "").trim() || null;

  await db.project.update({
    where: { id: project.id },
    data: { driveFolderUrl },
  });

  if (driveFolderUrl) {
    await notifySlack(
      project.slackWebhookUrl,
      `${staff.name} ha actualizado la carpeta de Drive de postproducción en *${project.name}*.`
    );
  }

  revalidatePath(`/p/${code}/postpro`);
}

export async function addMaterialRequestAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project, staff } = await requireStaffAccess(code, "postpro");

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return;

  await db.materialRequest.create({
    data: { projectId: project.id, description, requestedBy: staff.name },
  });

  await notifySlack(
    project.slackWebhookUrl,
    `Nueva petición de material en *${project.name}* (de ${staff.name}): ${description}`
  );

  revalidatePath(`/p/${code}/postpro`);
}

export async function toggleRequestStatusAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "postpro");

  const requestId = String(formData.get("requestId") ?? "");
  const request = await db.materialRequest.findUnique({ where: { id: requestId } });
  if (!request) return;

  const nextStatus = request.status === "entregado" ? "pendiente" : "entregado";
  await db.materialRequest.update({
    where: { id: requestId },
    data: { status: nextStatus },
  });

  if (nextStatus === "entregado") {
    await notifySlack(
      project.slackWebhookUrl,
      `Material entregado en *${project.name}*: ${request.description}`
    );
  }

  revalidatePath(`/p/${code}/postpro`);
}
