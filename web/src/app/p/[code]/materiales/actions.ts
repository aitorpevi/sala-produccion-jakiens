"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { readFileAsBuffer, humanFileSize } from "@/lib/storage";
import { notifySlack } from "@/lib/slack";

export async function uploadMaterialAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "materiales");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const direction = String(formData.get("direction") ?? "in");
  const memberIds = formData.getAll("targetIds").map(String);

  const { buffer, fileName, size } = await readFileAsBuffer(file);
  const ext = (file.name.split(".").pop() ?? "").toUpperCase() || "FILE";
  const name = String(formData.get("name") ?? file.name).trim() || file.name;

  const material = await db.material.create({
    data: {
      projectId: project.id,
      name,
      ext,
      sizeLabel: humanFileSize(size),
      direction,
      fileData: buffer,
      fileName,
    },
  });

  if (memberIds.length) {
    await db.materialTarget.createMany({
      data: memberIds.map((projectMemberId) => ({ materialId: material.id, projectMemberId })),
      skipDuplicates: true,
    });
  }

  await notifySlack(project.slackWebhookUrl, `Nuevo material subido en *${project.name}*: ${name}.`);

  revalidatePath(`/p/${code}/materiales`);
}
