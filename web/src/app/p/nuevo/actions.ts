"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { CLAVES_PRODUCTORA, type ClaveProductora } from "@/lib/productoras";

export async function createProjectAction(formData: FormData) {
  const staff = await requireStaff();
  if (staff.tier !== "FULL") return;

  const productoraBruta = String(formData.get("productora") ?? "JAKIENS").trim().toUpperCase();
  const productora: ClaveProductora = CLAVES_PRODUCTORA.includes(productoraBruta as ClaveProductora)
    ? (productoraBruta as ClaveProductora)
    : "JAKIENS";

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const client = String(formData.get("client") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const director = String(formData.get("director") ?? "").trim();
  const agencia = String(formData.get("agencia") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const format = String(formData.get("format") ?? "").trim();
  const shootLabel = String(formData.get("shootLabel") ?? "").trim();
  const preproInicio = String(formData.get("preproInicio") ?? "").trim() || null;
  const preproFin = String(formData.get("preproFin") ?? "").trim() || null;
  const rodajeInicio = String(formData.get("rodajeInicio") ?? "").trim() || null;
  const rodajeFin = String(formData.get("rodajeFin") ?? "").trim() || null;
  const entregaMaterial = String(formData.get("entregaMaterial") ?? "").trim() || null;
  const primeraEntregaMontaje = String(formData.get("primeraEntregaMontaje") ?? "").trim() || null;
  const driveFolderUrl = String(formData.get("driveFolderUrl") ?? "").trim() || null;
  const slackWebhookUrl = String(formData.get("slackWebhookUrl") ?? "").trim() || null;

  if (!code || !client || !name) {
    redirect("/p/nuevo?error=faltan_campos");
  }

  const existing = await db.project.findUnique({ where: { code } });
  if (existing) {
    redirect("/p/nuevo?error=codigo_duplicado");
  }

  const project = await db.project.create({
    data: {
      productora,
      code,
      client,
      name,
      director,
      agencia,
      location,
      format,
      shootLabel,
      preproInicio,
      preproFin,
      rodajeInicio,
      rodajeFin,
      entregaMaterial,
      primeraEntregaMontaje,
      driveFolderUrl,
      slackWebhookUrl,
      // Este alta sigue siendo la de un proyecto ya ganado: la crea el nivel
      // FULL tras el GO y desemboca en la fase Equipo. El alta de una
      // oportunidad en VENTA es otra puerta, y llega en el siguiente paso del
      // gestor de proyectos.
      etapa: "PREPRODUCCION",
      estado: "ACTIVO",
    },
  });

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
  });

  redirect(`/p/${project.code}/equipo`);
}
