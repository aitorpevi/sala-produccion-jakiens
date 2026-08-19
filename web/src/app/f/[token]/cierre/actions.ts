"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMemberByToken } from "@/lib/access";
import { guardarArchivo } from "@/lib/storage";
import { notifySlack } from "@/lib/slack";

/**
 * El colaborador sube su factura en PDF.
 *
 * El importe lo fija producción, no él: aquí solo se adjunta el documento y el
 * estado pasa a "recibida". Dejar que el colaborador escribiese el importe
 * abriría la puerta a que factura y presupuesto dejen de cuadrar sin que nadie
 * se entere.
 */
export async function subirFacturaAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const member = await requireMemberByToken(token);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const { fileUrl } = await guardarArchivo(file);
  if (!fileUrl) {
    console.error("[cierre] factura descartada: falta BLOB_READ_WRITE_TOKEN");
    return;
  }

  const existente = await db.invoice.findUnique({ where: { projectMemberId: member.id } });

  await db.invoice.upsert({
    where: { projectMemberId: member.id },
    create: {
      projectMemberId: member.id,
      concept: existente?.concept ?? `Honorarios ${member.role}`,
      amount: existente?.amount ?? member.rate * member.dias,
      state: "recibida",
      filePath: fileUrl,
      receivedAt: new Date(),
    },
    update: { state: "recibida", filePath: fileUrl, receivedAt: new Date() },
  });

  await notifySlack(
    member.project.slackWebhookUrl,
    `${member.person.name} ha subido su factura de *${member.project.name}*.`,
  );

  revalidatePath(`/f/${token}/cierre`);
}
