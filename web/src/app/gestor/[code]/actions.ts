"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { CLAVES_ETAPA } from "@/lib/etapas";
import { fechaDesdeInput } from "@/lib/hitos";
import type { Etapa, TipoHito } from "@/generated/prisma/enums";
import { TIPOS_HITO } from "@/lib/hitos";
import { ESTADOS_PRESUPUESTO_VENTA } from "@/lib/presupuesto-venta";
import { haySlackApi, prepararCanalDeProyecto } from "@/lib/slack";
import { guardarArchivo } from "@/lib/storage";
import { avisar } from "@/lib/avisos";

/**
 * Abre el canal de Slack del proyecto y mete al equipo de casa.
 *
 * Se hace en el GO y no al abrir la oportunidad: se abren oportunidades que no
 * se ganan, y cada una dejaría un canal muerto —Slack deja archivar, pero el
 * nombre queda reservado para siempre—. Al año el buscador estaría lleno de
 * proyectos que nunca existieron.
 *
 * Entra todo el equipo interno que tenga cuenta en Slack, no solo los asignados:
 * en el GO todavía no se ha repartido la preproducción, y el objetivo de la
 * herramienta es justamente que todo el mundo vea lo que hay encima de la mesa.
 *
 * Si algo falla —no hay token, Slack no responde, faltan permisos— el proyecto
 * se gana igualmente. Avisar es un extra; producir no.
 */
async function abrirCanalDeSlack(project: { id: string; code: string; name: string; client: string; slackChannelId: string | null }) {
  if (!haySlackApi() || project.slackChannelId) return;

  const equipo = await db.staffUser.findMany({ select: { email: true } });

  const canal = await prepararCanalDeProyecto({
    code: project.code,
    nombreProyecto: project.name,
    cliente: project.client,
    emails: equipo.map((p) => p.email),
    urlFicha: process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/gestor/${project.code}` : undefined,
  });

  if (canal) {
    await db.project.update({
      where: { id: project.id },
      data: { slackChannelId: canal.id, slackChannelName: canal.name },
    });
  }
}

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

  await abrirProduccion(project);
  await abrirCanalDeSlack(project);

  redirect(`/p/${project.code}/equipo`);
}

/** Crea las siete fases operativas del producer. */
async function abrirProduccion(project: { id: string }) {
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
}

/**
 * Mueve el proyecto de etapa, y con eso queda dicho todo.
 *
 * Antes había dos controles, etapa y estado, y se pisaban: un proyecto en
 * preproducción es un proyecto ganado, decirlo dos veces solo permitía que un
 * día no coincidieran. Ahora salir de VENTA hacia adelante ES ganarlo —y
 * dispara el GO entero: siete fases y canal de Slack—, y la única alternativa
 * es marcarlo como perdido.
 */
export async function moverEtapaAction(formData: FormData) {
  await requireFull();
  const code = String(formData.get("code") ?? "");
  const etapa = String(formData.get("etapa") ?? "") as Etapa;
  if (!CLAVES_ETAPA.includes(etapa)) return;

  const project = await db.project.findUnique({ where: { code } });
  if (!project) return;

  const gana = project.etapa === "VENTA" && etapa !== "VENTA";

  await db.project.update({
    where: { id: project.id },
    data: { etapa, estado: "ACTIVO" },
  });

  if (gana) {
    await abrirProduccion(project);
    await abrirCanalDeSlack(project);
    redirect(`/p/${project.code}/equipo`);
  }

  if (etapa === "CIERRE") {
    // Llegar a cierre no es haber cerrado: el cierre económico es trabajo, y
    // marcarlo como terminado al entrar lo sacaría del tablero justo cuando
    // hay que hacerlo. Se cierra a mano desde la propia etapa.
    await db.project.update({ where: { id: project.id }, data: { estado: "ACTIVO" } });
  }

  revalidatePath(`/gestor/${code}`);
}

/** Se perdió. Se archiva y se puede consultar: no se borra nada. */
export async function marcarPerdidoAction(formData: FormData) {
  await requireFull();
  const code = String(formData.get("code") ?? "");
  await db.project.update({ where: { code }, data: { estado: "PERDIDO" } });
  revalidatePath(`/gestor/${code}`);
}

/** Entregado y cerrado económicamente. */
export async function marcarCerradoAction(formData: FormData) {
  await requireFull();
  const code = String(formData.get("code") ?? "");
  await db.project.update({ where: { code }, data: { estado: "CERRADO", etapa: "CIERRE" } });
  revalidatePath(`/gestor/${code}`);
}

/** Vuelve a ponerlo en marcha tras haberlo dado por perdido o cerrado. */
export async function reabrirAction(formData: FormData) {
  await requireFull();
  const code = String(formData.get("code") ?? "");
  await db.project.update({ where: { code }, data: { estado: "ACTIVO" } });
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

// ---------- Equipo por etapa ----------

/**
 * Asigna a alguien del equipo interno a una etapa del proyecto.
 *
 * Lo puede hacer cualquier nivel, igual que las fechas: quien lleva una etapa
 * sabe mejor que nadie a quién necesita, y pedir permiso a dirección para
 * apuntar quién está trabajando convertiría la herramienta en un trámite.
 */
export async function asignarAction(formData: FormData) {
  await requireStaff();
  const code = String(formData.get("code") ?? "");
  const staffUserId = String(formData.get("staffUserId") ?? "");
  const etapa = String(formData.get("etapa") ?? "") as Etapa;
  const rol = String(formData.get("rol") ?? "").trim();
  const responsable = formData.get("responsable") === "on";

  const project = await db.project.findUnique({ where: { code } });
  if (!project || !staffUserId || !CLAVES_ETAPA.includes(etapa)) return;

  // Reasignar a alguien que ya estaba en esa etapa actualiza su rol en vez de
  // fallar: el caso real es "ah, y además lleva la cotización", no un error.
  await db.asignacionEtapa.upsert({
    where: { projectId_staffUserId_etapa: { projectId: project.id, staffUserId, etapa } },
    create: { projectId: project.id, staffUserId, etapa, rol: rol || null, responsable },
    update: { rol: rol || null, responsable },
  });

  revalidatePath(`/gestor/${code}`);
}

export async function desasignarAction(formData: FormData) {
  await requireStaff();
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("id") ?? "");

  await db.asignacionEtapa.deleteMany({ where: { id } });
  revalidatePath(`/gestor/${code}`);
}

// ---------- Presupuesto de venta ----------

/**
 * Guarda lo que se cotiza al cliente.
 *
 * El permiso se comprueba aquí y también al leer, no solo escondiendo el
 * formulario: un `POST` a mano desde la consola es trivial, y esta es la cifra
 * más sensible que maneja la herramienta después de los datos fiscales.
 */
export async function guardarPresupuestoVentaAction(formData: FormData) {
  const staff = await requireStaff();
  if (!staff.accesoPresupuestoVenta) return;

  const code = String(formData.get("code") ?? "");
  const project = await db.project.findUnique({ where: { code } });
  if (!project) return;

  const estado = String(formData.get("estado") ?? "en_preparacion");
  const notas = String(formData.get("notas") ?? "").trim();
  const asignadoAId = String(formData.get("asignadoA") ?? "").trim();
  const refManual = String(formData.get("refPresupuesto") ?? "").trim();
  const archivo = formData.get("archivo");

  if (!(estado in ESTADOS_PRESUPUESTO_VENTA)) return;

  let refCapturada: string | null = null;

  if (archivo instanceof File && archivo.size > 0) {
    const guardado = await guardarArchivo(archivo);
    await db.documento.create({
      data: {
        projectId: project.id,
        tipo: "PRESUPUESTO",
        nombre: guardado.fileName,
        fileUrl: guardado.fileUrl,
        fileData: guardado.fileData,
        subidoPorId: staff.id,
      },
    });
    // El identificador de verdad del proyecto es el nombre del PPTO, y este es
    // el momento en que por fin existe. Se saca del nombre del archivo —"PPTO
    // 57A-2026-Kids-Consum-Mascotas.pdf"— sin la extensión, y queda editable
    // por si el archivo venía mal nombrado.
    refCapturada = archivo.name.replace(/\.[^.]+$/, "").trim() || null;
  }

  const ref = refManual || refCapturada;
  if (ref && ref !== project.refPresupuesto) {
    await db.project.update({ where: { id: project.id }, data: { refPresupuesto: ref } });
  }

  const previo = await db.presupuestoVenta.findUnique({ where: { projectId: project.id } });

  await db.presupuestoVenta.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      estado,
      notas: notas || null,
      asignadoAId: asignadoAId || null,
      actualizadoPorId: staff.id,
      enviadoEn: estado === "enviado_cliente" ? new Date() : null,
    },
    update: {
      estado,
      notas: notas || null,
      asignadoAId: asignadoAId || null,
      actualizadoPorId: staff.id,
      // La fecha de envío se sella sola al pasar a "enviado a cliente": es un
      // dato que luego se consulta y que nadie apunta a mano.
      enviadoEn: estado === "enviado_cliente" ? new Date() : undefined,
    },
  });

  // Solo se avisa cuando el encargo cambia de manos. Reasignar a la misma
  // persona cada vez que se guarda una nota la acabaría entrenando a ignorar
  // los avisos, que es como se rompe un sistema de notificaciones.
  if (asignadoAId && asignadoAId !== previo?.asignadoAId) {
    await avisar({
      staffUserId: asignadoAId,
      texto: `${staff.name} te ha asignado el presupuesto de «${project.name}» (${project.client}).`,
      url: `/gestor/${project.code}`,
    });
  }

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

/** Quita un documento del proyecto. */
export async function borrarDocumentoAction(formData: FormData) {
  const staff = await requireStaff();
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("id") ?? "");

  const doc = await db.documento.findUnique({ where: { id } });
  if (!doc) return;
  if (doc.tipo === "PRESUPUESTO" && !staff.accesoPresupuestoVenta) return;

  await db.documento.delete({ where: { id } });
  revalidatePath(`/gestor/${code}`);
}

/** Añade un briefing (archivo o enlace) a un proyecto ya abierto. */
export async function anadirBriefingAction(formData: FormData) {
  const staff = await requireStaff();
  const code = String(formData.get("code") ?? "");
  const project = await db.project.findUnique({ where: { code } });
  if (!project) return;

  const url = String(formData.get("linkUrl") ?? "").trim();
  const archivo = formData.get("archivo");

  if (url) {
    await db.documento.create({
      data: { projectId: project.id, tipo: "BRIEFING", nombre: "Briefing (enlace)", linkUrl: url, subidoPorId: staff.id },
    });
  }
  if (archivo instanceof File && archivo.size > 0) {
    const guardado = await guardarArchivo(archivo);
    await db.documento.create({
      data: {
        projectId: project.id,
        tipo: "BRIEFING",
        nombre: guardado.fileName,
        fileUrl: guardado.fileUrl,
        fileData: guardado.fileData,
        subidoPorId: staff.id,
      },
    });
  }
  revalidatePath(`/gestor/${code}`);
}
