"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMemberByToken } from "@/lib/access";
import { notifySlack } from "@/lib/slack";
import { registrarAcceso } from "@/lib/auditoria";

function txt(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

/**
 * El colaborador rellena sus propios datos fiscales. Se guardan en `Person`, no
 * en el alta: son de la persona, no del proyecto, así que la próxima vez que
 * trabaje con nosotros ya no hay que volver a pedírselos.
 *
 * Los campos vacíos no borran lo que ya hubiera: un formulario enviado a medias
 * no debe tirar por tierra datos que ya estaban bien.
 */
export async function guardarDatosFiscalesAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const member = await requireMemberByToken(token);

  const entrada = {
    dni: txt(formData, "dni"),
    naf: txt(formData, "naf"),
    iban: txt(formData, "iban"),
    domicilio: txt(formData, "domicilio"),
    fechaNacimiento: txt(formData, "fechaNacimiento"),
    sexo: txt(formData, "sexo"),
    irpf: txt(formData, "irpf"),
    phone: txt(formData, "phone"),
    email: txt(formData, "email"),
  };

  const datos = Object.fromEntries(
    Object.entries(entrada).filter(([, v]) => v !== null),
  );

  if (Object.keys(datos).length > 0) {
    await db.person.update({ where: { id: member.personId }, data: datos });

    // El interesado editando sus propios datos. Se registra igual: el registro
    // sirve tanto para detectar accesos indebidos como para acreditar que fue
    // él quien los facilitó.
    await registrarAcceso({
      staffUserId: null,
      staffNombre: `${member.person.name} (el propio interesado)`,
      personId: member.personId,
      personNombre: member.person.name,
      accion: "editar_datos",
      detalle: `Campos actualizados: ${Object.keys(datos).join(", ")}`,
    });
  }

  // El alta pasa a "recibida" solo cuando está todo lo que la gestoría exige.
  const persona = await db.person.findUnique({ where: { id: member.personId } });
  const completo =
    !!persona?.dni && !!persona.naf && !!persona.iban && !!persona.domicilio &&
    !!persona.fechaNacimiento && !!persona.sexo;

  await db.altaLaboral.upsert({
    where: { projectMemberId: member.id },
    create: { projectMemberId: member.id, estado: completo ? "recibida" : "pendiente" },
    update: { estado: completo ? "recibida" : "pendiente" },
  });

  if (completo) {
    await notifySlack(
      member.project.slackWebhookUrl,
      `${member.person.name} ha completado sus datos de alta en *${member.project.name}*.`,
    );
  }

  revalidatePath(`/f/${token}/altas`);
}
