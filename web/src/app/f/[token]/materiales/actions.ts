"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMemberByToken } from "@/lib/access";
import { guardarArchivo, humanFileSize } from "@/lib/storage";
import { avisarProyecto } from "@/lib/slack";

export async function uploadFromCollaboratorAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const member = await requireMemberByToken(token);

  const materialId = String(formData.get("materialId") ?? "");
  const material = await db.material.findUnique({
    where: { id: materialId },
    include: { targets: true },
  });

  const isTarget = material?.targets.some((t) => t.projectMemberId === member.id);
  if (!material || material.direction !== "out" || !isTarget) return;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const { fileUrl, fileData, fileName, size } = await guardarArchivo(file);

  await db.material.update({
    where: { id: material.id },
    data: { fileUrl, fileData, fileName, sizeLabel: humanFileSize(size) },
  });

  await avisarProyecto(
    member.project,
    `${member.person.name} ha subido "${material.name}" en *${member.project.name}*.`
  );

  revalidatePath(`/f/${token}/materiales`);
}
