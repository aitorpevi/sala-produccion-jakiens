"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaffTier } from "@/lib/access";

/**
 * Guarda la ficha fiscal de un cliente.
 *
 * Reservado a los niveles que ven dinero: aquí vive el CIF y las condiciones de
 * pago, que es información de contabilidad y no del reparto de trabajo.
 */
export async function guardarClienteAction(formData: FormData) {
  await requireStaffTier(["FULL", "LOGISTICS"]);
  const id = String(formData.get("id") ?? "");
  const t = (k: string) => String(formData.get(k) ?? "").trim() || null;

  const datos = {
    cif: t("cif"),
    direccionFiscal: t("direccionFiscal"),
    contactoNombre: t("contactoNombre"),
    contactoEmail: t("contactoEmail"),
    contactoTelefono: t("contactoTelefono"),
    condicionesPago: t("condicionesPago"),
    notas: t("notas"),
  };

  if (id) {
    await db.cliente.update({ where: { id }, data: datos });
  } else {
    const nombre = String(formData.get("nombre") ?? "").trim();
    if (!nombre) return;
    // Si ya existe se completa en vez de fallar: el alta automática desde una
    // oportunidad crea la ficha solo con el nombre, y esto es justo el momento
    // de rellenarle lo demás.
    await db.cliente.upsert({ where: { nombre }, create: { nombre, ...datos }, update: datos });
  }

  revalidatePath("/gestor/clientes");
}
