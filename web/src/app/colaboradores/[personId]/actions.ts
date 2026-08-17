"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaffTier } from "@/lib/access";

export async function updatePersonAction(formData: FormData) {
  await requireStaffTier(["FULL", "LOGISTICS"]);

  const personId = String(formData.get("personId") ?? "");
  const person = await db.person.findUnique({ where: { id: personId } });
  if (!person) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const field = (key: string) => String(formData.get(key) ?? "").trim() || null;

  await db.person.update({
    where: { id: personId },
    data: {
      name,
      phone: field("phone"),
      email: field("email"),
      dni: field("dni"),
      naf: field("naf"),
      domicilio: field("domicilio"),
      iban: field("iban"),
      irpf: field("irpf"),
      okTicketId: field("okTicketId"),
    },
  });

  revalidatePath(`/colaboradores/${personId}`);
  revalidatePath("/colaboradores");
}
