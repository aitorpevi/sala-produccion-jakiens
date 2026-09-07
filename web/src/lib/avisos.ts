import "server-only";
import { db } from "@/lib/db";
import { enviarDM } from "@/lib/slack";

/**
 * Avisa a alguien de que le ha caído trabajo.
 *
 * Escribe SIEMPRE el aviso en la base y, además, intenta el DM de Slack. Ese
 * orden importa: si Slack no está configurado, o esa persona no tiene cuenta, o
 * la API falla, el encargo sigue existiendo y aparece la próxima vez que abra la
 * app. Un aviso que solo vive en un canal externo se pierde el día que ese canal
 * falla, y nadie se entera de que se ha perdido.
 *
 * Nunca lanza: avisar es un extra, y no debe tumbar la acción que lo provocó.
 */
export async function avisar(opciones: {
  staffUserId: string;
  texto: string;
  url?: string;
}) {
  try {
    const persona = await db.staffUser.findUnique({
      where: { id: opciones.staffUserId },
      select: { email: true },
    });
    if (!persona) return;

    await db.aviso.create({
      data: { staffUserId: opciones.staffUserId, texto: opciones.texto, url: opciones.url ?? null },
    });

    const enlace = opciones.url ? `\n${process.env.APP_BASE_URL ?? ""}${opciones.url}` : "";
    await enviarDM(persona.email, `${opciones.texto}${enlace}`);
  } catch (e) {
    console.error("[avisos] no se pudo avisar:", e);
  }
}

/** Los avisos sin leer de una persona, para el punto rojo de la cabecera. */
export async function avisosPendientes(staffUserId: string) {
  return db.aviso.findMany({
    where: { staffUserId, leidoEn: null },
    orderBy: { creadoEn: "desc" },
    take: 20,
  });
}
