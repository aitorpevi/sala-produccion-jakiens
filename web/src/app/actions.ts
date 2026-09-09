"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { destroyStaffSession, getStaffUserId } from "@/lib/session";

export async function logoutAction() {
  await destroyStaffSession();
  redirect("/login");
}

/**
 * Marca como leídos todos los avisos de quien lo pulsa.
 *
 * En bloque y no uno a uno: el aviso ya ha hecho su trabajo cuando la persona
 * abre la lista, y obligarla a despachar quince por separado convierte una
 * ayuda en una tarea más.
 */
export async function marcarAvisosLeidosAction() {
  const userId = await getStaffUserId();
  if (!userId) return;
  await db.aviso.updateMany({
    where: { staffUserId: userId, leidoEn: null },
    data: { leidoEn: new Date() },
  });
  revalidatePath("/gestor");
}
