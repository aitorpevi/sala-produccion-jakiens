"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { notifySlack } from "@/lib/slack";
import { guardarArchivo } from "@/lib/storage";
import { crearAccesoCliente } from "@/lib/cliente";

function txt(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

async function proyectoDeLaJornada(code: string, callSheetDayId: string) {
  const { project } = await requireStaffAccess(code, "rodaje");
  const dia = await db.callSheetDay.findUnique({ where: { id: callSheetDayId } });
  if (!dia || dia.projectId !== project.id) return null;
  return { project, dia };
}

export async function crearJornadaAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "rodaje");

  const fecha = txt(formData, "fecha");
  if (!fecha) return;

  const ultimas = await db.callSheetDay.findMany({
    where: { projectId: project.id },
    orderBy: { orden: "desc" },
    take: 1,
  });

  await db.callSheetDay.create({
    data: {
      projectId: project.id,
      fecha,
      orden: (ultimas[0]?.orden ?? 0) + 1,
    },
  });

  revalidatePath(`/p/${code}/rodaje`);
}

export async function guardarJornadaAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const callSheetDayId = String(formData.get("callSheetDayId") ?? "");
  const ctx = await proyectoDeLaJornada(code, callSheetDayId);
  if (!ctx) return;

  await db.callSheetDay.update({
    where: { id: callSheetDayId },
    data: {
      fecha: txt(formData, "fecha") ?? ctx.dia.fecha,
      fechaISO: (() => {
        const v = txt(formData, "fechaISO");
        return v ? new Date(v) : null;
      })(),
      primeraHora: txt(formData, "primeraHora"),
      amanecer: txt(formData, "amanecer"),
      ocaso: txt(formData, "ocaso"),
      meteo: txt(formData, "meteo"),
      puntoEncuentro: txt(formData, "puntoEncuentro"),
      contactoSet: txt(formData, "contactoSet"),
    },
  });

  revalidatePath(`/p/${code}/rodaje`);
}

export async function borrarJornadaAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const callSheetDayId = String(formData.get("callSheetDayId") ?? "");
  const ctx = await proyectoDeLaJornada(code, callSheetDayId);
  if (!ctx) return;

  await db.callSheetDay.delete({ where: { id: callSheetDayId } });
  revalidatePath(`/p/${code}/rodaje`);
}

export async function anadirBloqueAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const callSheetDayId = String(formData.get("callSheetDayId") ?? "");
  const ctx = await proyectoDeLaJornada(code, callSheetDayId);
  if (!ctx) return;

  const hora = txt(formData, "hora");
  const descripcion = txt(formData, "descripcion");
  if (!hora || !descripcion) return;

  await db.scheduleItem.create({ data: { callSheetDayId, hora, descripcion } });
  revalidatePath(`/p/${code}/rodaje`);
}

export async function borrarBloqueAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  await requireStaffAccess(code, "rodaje");

  const id = String(formData.get("scheduleItemId") ?? "");
  const item = await db.scheduleItem.findUnique({
    where: { id },
    include: { callSheetDay: true },
  });
  if (!item) return;

  const proyecto = await db.project.findUnique({ where: { code } });
  if (!proyecto || item.callSheetDay.projectId !== proyecto.id) return;

  await db.scheduleItem.delete({ where: { id } });
  revalidatePath(`/p/${code}/rodaje`);
}

/**
 * Guarda de una vez las horas de convocatoria de toda la jornada. Un formulario
 * por persona sería insufrible con un equipo de veinte.
 */
export async function guardarCallTimesAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const callSheetDayId = String(formData.get("callSheetDayId") ?? "");
  const ctx = await proyectoDeLaJornada(code, callSheetDayId);
  if (!ctx) return;

  const miembros = await db.projectMember.findMany({
    where: { projectId: ctx.project.id },
    select: { id: true },
  });

  for (const m of miembros) {
    const hora = txt(formData, `hora-${m.id}`);

    if (hora === null) {
      // Vaciar el campo significa "esta persona no está convocada este día".
      await db.callTime.deleteMany({
        where: { callSheetDayId, projectMemberId: m.id },
      });
      continue;
    }

    await db.callTime.upsert({
      where: {
        callSheetDayId_projectMemberId: { callSheetDayId, projectMemberId: m.id },
      },
      create: { callSheetDayId, projectMemberId: m.id, hora },
      update: { hora },
    });
  }

  revalidatePath(`/p/${code}/rodaje`);
}

/** Avisa al equipo de que la orden de rodaje de una jornada ya está publicada. */
export async function avisarOrdenAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const callSheetDayId = String(formData.get("callSheetDayId") ?? "");
  const ctx = await proyectoDeLaJornada(code, callSheetDayId);
  if (!ctx) return;

  const convocados = await db.callTime.count({ where: { callSheetDayId } });
  const principal = await db.localizacion.findFirst({
    where: { callSheetDayId },
    orderBy: { orden: "asc" },
  });

  await notifySlack(
    ctx.project.slackWebhookUrl,
    `Orden de rodaje publicada · *${ctx.project.name}* — jornada del ${ctx.dia.fecha}` +
      `${principal ? ` en ${principal.nombre}` : ""}. ${convocados} personas convocadas.`,
  );

  revalidatePath(`/p/${code}/rodaje`);
}

// ---------- Localizaciones ----------

export async function anadirLocalizacionAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const callSheetDayId = String(formData.get("callSheetDayId") ?? "");
  const ctx = await proyectoDeLaJornada(code, callSheetDayId);
  if (!ctx) return;

  const nombre = txt(formData, "nombre");
  if (!nombre) return;

  const ultimas = await db.localizacion.findMany({
    where: { callSheetDayId },
    orderBy: { orden: "desc" },
    take: 1,
  });

  await db.localizacion.create({
    data: { callSheetDayId, nombre, orden: (ultimas[0]?.orden ?? 0) + 1 },
  });

  revalidatePath(`/p/${code}/rodaje`);
}

export async function guardarLocalizacionAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("localizacionId") ?? "");

  const loc = await db.localizacion.findUnique({ where: { id } });
  if (!loc) return;
  const ctx = await proyectoDeLaJornada(code, loc.callSheetDayId);
  if (!ctx) return;

  await db.localizacion.update({
    where: { id },
    data: {
      nombre: txt(formData, "nombre") ?? loc.nombre,
      direccion: txt(formData, "direccion"),
      mapsUrl: txt(formData, "mapsUrl"),
      parking: txt(formData, "parking"),
      accesos: txt(formData, "accesos"),
      notas: txt(formData, "notas"),
    },
  });

  revalidatePath(`/p/${code}/rodaje`);
}

export async function borrarLocalizacionAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("localizacionId") ?? "");

  const loc = await db.localizacion.findUnique({ where: { id } });
  if (!loc) return;
  const ctx = await proyectoDeLaJornada(code, loc.callSheetDayId);
  if (!ctx) return;

  await db.localizacion.delete({ where: { id } });
  revalidatePath(`/p/${code}/rodaje`);
}

// ---------- Traslados ----------

export async function anadirTrasladoAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const callSheetDayId = String(formData.get("callSheetDayId") ?? "");
  const ctx = await proyectoDeLaJornada(code, callSheetDayId);
  if (!ctx) return;

  const hora = txt(formData, "hora");
  const origen = txt(formData, "origen");
  const destino = txt(formData, "destino");
  if (!hora || !origen || !destino) return;

  const ultimos = await db.traslado.findMany({
    where: { callSheetDayId },
    orderBy: { orden: "desc" },
    take: 1,
  });

  await db.traslado.create({
    data: {
      callSheetDayId,
      hora,
      origen,
      destino,
      vehiculo: txt(formData, "vehiculo"),
      conductor: txt(formData, "conductor"),
      ocupantes: txt(formData, "ocupantes"),
      orden: (ultimos[0]?.orden ?? 0) + 1,
    },
  });

  revalidatePath(`/p/${code}/rodaje`);
}

export async function borrarTrasladoAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("trasladoId") ?? "");

  const t = await db.traslado.findUnique({ where: { id } });
  if (!t) return;
  const ctx = await proyectoDeLaJornada(code, t.callSheetDayId);
  if (!ctx) return;

  await db.traslado.delete({ where: { id } });
  revalidatePath(`/p/${code}/rodaje`);
}

// ---------- Seguridad y catering ----------

export async function guardarSeguridadCateringAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const callSheetDayId = String(formData.get("callSheetDayId") ?? "");
  const ctx = await proyectoDeLaJornada(code, callSheetDayId);
  if (!ctx) return;

  await db.callSheetDay.update({
    where: { id: callSheetDayId },
    data: {
      hospitalNombre: txt(formData, "hospitalNombre"),
      hospitalDireccion: txt(formData, "hospitalDireccion"),
      hospitalTelefono: txt(formData, "hospitalTelefono"),
      hospitalMapsUrl: txt(formData, "hospitalMapsUrl"),
      cateringDesayuno: txt(formData, "cateringDesayuno"),
      cateringComida: txt(formData, "cateringComida"),
      cateringNotas: txt(formData, "cateringNotas"),
      contactoSetTel: txt(formData, "contactoSetTel"),
      llegadaCliente: txt(formData, "llegadaCliente"),
    },
  });

  revalidatePath(`/p/${code}/rodaje`);
}

/**
 * Restricciones alimentarias del equipo. Son datos de salud (art. 9 RGPD): se
 * guardan cifradas, viven en el miembro del proyecto y no en la ficha
 * permanente de la persona, y el cliente solo las verá agregadas y sin nombres.
 */
export async function guardarRestriccionesAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "rodaje");

  const miembros = await db.projectMember.findMany({
    where: { projectId: project.id },
    select: { id: true },
  });

  for (const m of miembros) {
    const valor = txt(formData, `restr-${m.id}`);
    await db.projectMember.update({
      where: { id: m.id },
      data: { restriccionesAlimentarias: valor },
    });
  }

  revalidatePath(`/p/${code}/rodaje`);
}

// ---------- Vista de cliente ----------

export async function subirImagenClienteAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "rodaje");

  const campo = String(formData.get("campo") ?? "");
  if (!["portadaUrl", "logoClienteUrl", "logoAgenciaUrl"].includes(campo)) return;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const { fileUrl, fileData } = await guardarArchivo(file);

  // Sin Blob configurado no hay URL que servir: una imagen en bytes dentro de
  // Postgres no se puede referenciar desde un <img>. Mejor no guardar nada y
  // decirlo, que dejar la portada rota sin explicación.
  if (!fileUrl) {
    if (fileData) console.error("[cliente] imagen descartada: falta BLOB_READ_WRITE_TOKEN");
    return;
  }

  await db.project.update({ where: { id: project.id }, data: { [campo]: fileUrl } });
  revalidatePath(`/p/${code}/rodaje`);
}

export async function crearEnlaceClienteAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "rodaje");

  const tipo = String(formData.get("tipo") ?? "cliente");
  if (!["cliente", "agencia"].includes(tipo)) return;

  await crearAccesoCliente(project.id, tipo, txt(formData, "etiqueta"));
  revalidatePath(`/p/${code}/rodaje`);
}

export async function revocarEnlaceClienteAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "rodaje");

  const id = String(formData.get("accesoId") ?? "");
  const acceso = await db.clientAccess.findUnique({ where: { id } });
  if (!acceso || acceso.projectId !== project.id) return;

  await db.clientAccess.delete({ where: { id } });
  revalidatePath(`/p/${code}/rodaje`);
}
