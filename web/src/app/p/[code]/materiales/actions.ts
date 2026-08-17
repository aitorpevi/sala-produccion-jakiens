"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireProductionProject } from "@/lib/access";
import { saveUploadedFile, humanFileSize } from "@/lib/storage";

export async function uploadMaterialAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const project = await requireProductionProject(code);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const direction = String(formData.get("direction") ?? "in");
  const memberIds = formData.getAll("targetIds").map(String);

  const { relPath, size } = await saveUploadedFile(file, project.id);
  const ext = (file.name.split(".").pop() ?? "").toUpperCase() || "FILE";
  const name = String(formData.get("name") ?? file.name).trim() || file.name;

  const material = await db.material.create({
    data: {
      projectId: project.id,
      name,
      ext,
      sizeLabel: humanFileSize(size),
      direction,
      filePath: relPath,
    },
  });

  if (memberIds.length) {
    await db.materialTarget.createMany({
      data: memberIds.map((projectMemberId) => ({ materialId: material.id, projectMemberId })),
      skipDuplicates: true,
    });
  }

  revalidatePath(`/p/${code}/materiales`);
}
