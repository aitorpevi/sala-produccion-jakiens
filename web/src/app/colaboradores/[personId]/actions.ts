"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaffTier } from "@/lib/access";
import { registrarAcceso } from "@/lib/auditoria";

/** Campos fiscales: solo los toca el nivel con acceso a contabilidad. */
const CAMPOS_FISCALES = ["dni", "naf", "domicilio", "iban", "irpf"] as const;

export async function updatePersonAction(formData: FormData) {
  const staff = await requireStaffTier(["FULL", "LOGISTICS"]);

  const personId = String(formData.get("personId") ?? "");
  const person = await db.person.findUnique({ where: { id: personId } });
  if (!person) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const campo = (key: string) => String(formData.get(key) ?? "").trim() || null;

  const data: Record<string, string | null> = {
    name,
    phone: campo("phone"),
    email: campo("email"),
    okTicketId: campo("okTicketId"),
  };

  // Dos reglas aquí, y las dos importan:
  //
  // 1. Solo FULL escribe datos fiscales. Ocultar los campos en la pantalla no
  //    es control de acceso: una petición fabricada a mano los enviaría igual.
  // 2. Un campo que no viene en el formulario NO se toca. Antes se traducía a
  //    null, así que guardar la ficha desde una vista donde esos campos no se
  //    pintan borraba el DNI, el NAF y el IBAN de esa persona.
  if (staff.tier === "FULL") {
    for (const c of CAMPOS_FISCALES) {
      if (formData.has(c)) data[c] = campo(c);
    }
  }

  await db.person.update({ where: { id: personId }, data });

  await registrarAcceso({
    staffUserId: staff.id,
    staffNombre: staff.name,
    personId,
    personNombre: person.name,
    accion: "editar_datos",
    detalle: `Campos modificados: ${Object.keys(data).join(", ")}`,
  });

  revalidatePath(`/colaboradores/${personId}`);
  revalidatePath("/colaboradores");
}
