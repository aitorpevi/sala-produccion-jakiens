"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaffTier } from "@/lib/access";

/**
 * Cambia quién puede ver el presupuesto de venta.
 *
 * Existe porque el permiso no puede depender de que alguien entre en la base de
 * datos: cuando la columna se creó, entró en `false` para todo el mundo, y en
 * producción eso dejó el desplegable de "prepara el presupuesto" vacío sin que
 * hubiera forma de arreglarlo desde la aplicación. Un permiso que solo se puede
 * cambiar con acceso a la base es un permiso que en la práctica no se cambia.
 *
 * Lo maneja el nivel FULL, que son los seis de dirección. Sí, alguien de ese
 * nivel puede dárselo a sí mismo: son quienes deciden esto en la vida real, y
 * fingir lo contrario solo añadiría un trámite.
 */
export async function cambiarAccesoPresupuestoAction(formData: FormData) {
  const staff = await requireStaffTier(["FULL"]);
  const id = String(formData.get("id") ?? "");
  const conceder = formData.get("conceder") === "1";

  const destino = await db.staffUser.findUnique({ where: { id } });
  if (!destino) return;

  await db.staffUser.update({ where: { id }, data: { accesoPresupuestoVenta: conceder } });

  // Queda registrado quién tocó el acceso a una cifra confidencial: es
  // exactamente el tipo de cambio del que un día alguien preguntará.
  await db.accesoDatosPersonales.create({
    data: {
      staffUserId: staff.id,
      staffNombre: staff.name,
      personNombre: destino.name,
      accion: "editar_datos",
      detalle: `${conceder ? "concede" : "retira"} acceso al presupuesto de venta`,
    },
  });

  revalidatePath("/gestor/equipo");
}
