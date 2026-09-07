"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { guardarArchivo, humanFileSize } from "@/lib/storage";
import { avisarProyecto } from "@/lib/slack";

export async function uploadMaterialAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "materiales");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const direction = String(formData.get("direction") ?? "in");
  const memberIds = formData.getAll("targetIds").map(String);

  const { fileUrl, fileData, fileName, size } = await guardarArchivo(file);
  const ext = (file.name.split(".").pop() ?? "").toUpperCase() || "FILE";
  const name = String(formData.get("name") ?? file.name).trim() || file.name;

  const material = await db.material.create({
    data: {
      projectId: project.id,
      name,
      ext,
      sizeLabel: humanFileSize(size),
      direction,
      fileUrl,
      fileData,
      fileName,
    },
  });

  if (memberIds.length) {
    await db.materialTarget.createMany({
      data: memberIds.map((projectMemberId) => ({ materialId: material.id, projectMemberId })),
      skipDuplicates: true,
    });
  }

  await avisarProyecto(project, `Nuevo material subido en *${project.name}*: ${name}.`);

  revalidatePath(`/p/${code}/materiales`);
}

/**
 * Añade un enlace a la nube en vez de un archivo.
 *
 * Cuando el material vive en Drive o Dropbox en colaborativo, subir una copia
 * es peor que enlazarlo: el equipo acabaría mirando una versión congelada
 * mientras la buena sigue cambiando fuera.
 */
export async function addMaterialLinkAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "materiales");

  const url = String(formData.get("linkUrl") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!url || !name) return;

  // Solo http/https: un href con javascript: o data: sería un agujero.
  let limpio: URL;
  try {
    limpio = new URL(url);
  } catch {
    return;
  }
  if (limpio.protocol !== "http:" && limpio.protocol !== "https:") return;

  const memberIds = formData.getAll("targetIds").map(String);
  const direction = String(formData.get("direction") ?? "in");

  const proveedor = /drive\.google|docs\.google/.test(limpio.hostname + limpio.pathname)
    ? "DRIVE"
    : /dropbox/.test(limpio.hostname)
      ? "DBOX"
      : /wetransfer|frame\.io|vimeo/.test(limpio.hostname)
        ? limpio.hostname.split(".")[0].slice(0, 4).toUpperCase()
        : "LINK";

  const material = await db.material.create({
    data: { projectId: project.id, name, ext: proveedor, direction, linkUrl: limpio.toString() },
  });

  if (memberIds.length) {
    await db.materialTarget.createMany({
      data: memberIds.map((projectMemberId) => ({ materialId: material.id, projectMemberId })),
      skipDuplicates: true,
    });
  }

  await avisarProyecto(project, `Nuevo enlace en *${project.name}*: ${name}.`);
  revalidatePath(`/p/${code}/materiales`);
}
