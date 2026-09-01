"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { CLAVES_ETAPA } from "@/lib/etapas";
import { fechaDesdeInput } from "@/lib/hitos";
import type { Etapa, EstadoProyecto, TipoHito } from "@/generated/prisma/enums";
import { TIPOS_HITO } from "@/lib/hitos";

/** Mover un proyecto de etapa o cambiar su estado es decisión de dirección. */
async function requireFull() {
  const staff = await requireStaff();
  if (staff.tier !== "FULL") redirect("/gestor");
  return staff;
}

/**
 * El GO: el proyecto se ha ganado y arranca la producción.
 *
 * Es el momento en que el gestor entrega el testigo a la sala de producción, y
 * el único sitio donde eso pasa. Crea las siete fases operativas —lo mismo que
 * hacía `/p/nuevo`, que sigue existiendo para los proyectos que entran ya
 * ganados sin haber pasado por venta— y deja el proyecto en Equipo.
 */
export async function marcarGanadoAction(formData: FormData) {
  await requireFull();
  const code = String(formData.get("code") ?? "");

  const project = await db.project.findUnique({ where: { code } });
  if (!project) redirect("/gestor");

  await db.project.update({
    where: { id: project.id },
    data: { etapa: "PREPRODUCCION", estado: "ACTIVO" },
  });

  // `skipDuplicates` porque un proyecto puede llegar aquí ya con fases creadas:
  // si alguien lo devolvió a venta por error y vuelve a darle el GO, no debe
  // reventar ni duplicar nada.
  await db.phaseState.createMany({
    data: [
      { projectId: project.id, key: "equipo", state: "live" },
      { projectId: project.id, key: "prepro", state: "next" },
      { projectId: project.id, key: "materiales", state: "next" },
      { projectId: project.id, key: "altas", state: "next" },
      { projectId: project.id, key: "rodaje", state: "next" },
      { projectId: project.id, key: "postpro", state: "next" },
      { projectId: project.id, key: "cierre", state: "next" },
    ],
    skipDuplicates: true,
  });

  redirect(`/p/${project.code}/equipo`);
}

/** Cambia etapa o estado sin tocar nada más. */
export async function actualizarSituacionAction(formData: FormData) {
  await requireFull();
  const code = String(formData.get("code") ?? "");
  const etapa = String(formData.get("etapa") ?? "") as Etapa;
  const estado = String(formData.get("estado") ?? "") as EstadoProyecto;

  if (!CLAVES_ETAPA.includes(etapa)) return;

  await db.project.update({ where: { code }, data: { etapa, estado } });
  revalidatePath(`/gestor/${code}`);
}

/**
 * Añade un hito a mano.
 *
 * Solo crea hitos `manual`: los derivados (`proyecto`, `callsheet`) los escribe
 * el importador desde su origen y se regeneran, así que editarlos aquí sería
 * trabajo que se pierde en la siguiente pasada.
 */
export async function crearHitoAction(formData: FormData) {
  const staff = await requireStaff();
  const code = String(formData.get("code") ?? "");

  const project = await db.project.findUnique({ where: { code } });
  if (!project) redirect("/gestor");

  const titulo = String(formData.get("titulo") ?? "").trim();
  const fecha = fechaDesdeInput(String(formData.get("fecha") ?? ""));
  const fechaFin = fechaDesdeInput(String(formData.get("fechaFin") ?? ""));
  const tipo = String(formData.get("tipo") ?? "OTRO") as TipoHito;

  if (!titulo || !fecha) return;
  if (!(tipo in TIPOS_HITO)) return;
  // Un rango al revés es un error de dedo, no una fecha: se ignora el fin.
  const fin = fechaFin && fechaFin >= fecha ? fechaFin : null;

  await db.hito.create({
    data: {
      projectId: project.id,
      etapa: project.etapa,
      tipo,
      titulo,
      fecha,
      fechaFin: fin,
      responsableId: staff.id,
    },
  });

  revalidatePath(`/gestor/${code}`);
}

export async function borrarHitoAction(formData: FormData) {
  await requireStaff();
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("id") ?? "");

  // Los derivados no se borran a mano: volverían a aparecer en la siguiente
  // importación y el usuario no entendería por qué.
  const hito = await db.hito.findUnique({ where: { id } });
  if (!hito || hito.origen !== "manual") return;

  await db.hito.delete({ where: { id } });
  revalidatePath(`/gestor/${code}`);
}
