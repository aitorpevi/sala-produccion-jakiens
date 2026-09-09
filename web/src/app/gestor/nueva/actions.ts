"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { CLAVES_PRODUCTORA, type ClaveProductora } from "@/lib/productoras";
import { fechaDesdeInput } from "@/lib/hitos";
import { generarCodigo } from "@/lib/codigo";
import { guardarArchivo } from "@/lib/storage";
import { avisar } from "@/lib/avisos";

/**
 * Da de alta una oportunidad de venta.
 *
 * Se pide solo lo que de verdad se sabe el día que entra el brief. En concreto:
 *
 * - **No se pide el código.** El identificador que usa la gente es la referencia
 *   del PPTO, y esa no existe hasta que alguien prepara el presupuesto. El código
 *   interno se genera solo y no se enseña como "el número del proyecto".
 * - **No se pide el formato.** Viene en el documento de la agencia con mucho más
 *   detalle del que cabe en una caja de texto, y tenerlo en dos sitios garantiza
 *   que un día no coincidan.
 * - **Sí se pide el equipo.** El orden real del trabajo es mirar el tablero, ver
 *   quién está libre y repartir al abrir la oportunidad, no después.
 */
export async function crearOportunidadAction(formData: FormData) {
  try {
    return await crearOportunidad(formData);
  } catch (e) {
    // `redirect()` de Next funciona lanzando: hay que dejarlo pasar o el alta
    // se queda a medias sin ir a ninguna parte.
    if (e && typeof e === "object" && "digest" in e && String(e.digest).startsWith("NEXT_")) throw e;

    // Cualquier otro fallo se marca para poder encontrarlo en el log de Vercel
    // buscando "[oportunidad]". Sin esto, el error aparece como una traza suelta
    // entre cientos de líneas y hay que adivinar de dónde salió.
    console.error("[oportunidad] fallo al crear:", e);
    throw e;
  }
}

async function crearOportunidad(formData: FormData) {
  const staff = await requireStaff();
  // Quien vuelca las oportunidades es el equipo de venta —Javier y Aitor—, que
  // están en el nivel FULL. Carmen deriva el trabajo, pero no origina la ficha.
  if (staff.tier !== "FULL") return;

  const productoraBruta = String(formData.get("productora") ?? "JAKIENS").trim().toUpperCase();
  const productora: ClaveProductora = CLAVES_PRODUCTORA.includes(productoraBruta as ClaveProductora)
    ? (productoraBruta as ClaveProductora)
    : "JAKIENS";

  const clienteNombre = String(formData.get("cliente") ?? "").trim();
  const marca = String(formData.get("marca") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const director = String(formData.get("director") ?? "").trim();
  const comentarios = String(formData.get("comentarios") ?? "").trim();
  const entrega = fechaDesdeInput(String(formData.get("entregaPropuesta") ?? ""));
  const briefingUrl = String(formData.get("briefingUrl") ?? "").trim();
  const briefingArchivo = formData.get("briefingArchivo");
  const asignadoAId = String(formData.get("presupuestoAsignadoA") ?? "").trim();
  const equipoIds = formData.getAll("equipo").map(String).filter(Boolean);
  const responsableId = String(formData.get("responsable") ?? "").trim();

  if (!clienteNombre || !name) {
    redirect("/gestor/nueva?error=faltan_campos");
  }

  // La ficha de cliente se crea si no existía. Obligar a darlo de alta aparte
  // antes de poder abrir la oportunidad convertiría en trámite lo que tiene que
  // ser un minuto; los datos fiscales se rellenan cuando hagan falta.
  const cliente = await db.cliente.upsert({
    where: { nombre: clienteNombre },
    create: { nombre: clienteNombre },
    update: {},
  });

  const project = await db.project.create({
    data: {
      productora,
      code: await generarCodigo(clienteNombre),
      client: cliente.nombre,
      clienteId: cliente.id,
      marca: marca || null,
      name,
      director,
      agencia: "",
      location: "",
      format: "",
      shootLabel: "",
      etapa: "VENTA",
      estado: "OPORTUNIDAD",
    },
  });

  // La entrega de la propuesta es la única fecha de la etapa de venta, y muchas
  // veces la única que se conoce el primer día. Sin ella la oportunidad no sale
  // en el calendario, que es donde tiene que verse.
  if (entrega) {
    await db.hito.create({
      data: {
        projectId: project.id,
        etapa: "VENTA",
        tipo: "ENTREGA_PROPUESTA",
        titulo: "Entrega de propuesta",
        fecha: entrega,
        criticidad: "ALTA",
        responsableId: staff.id,
      },
    });
  }

  // Briefing: archivo o enlace, y caben los dos. El brief llega como PDF por
  // correo tanto como vive en un Canva que sigue cambiando; subir una copia de
  // eso sería congelar una versión mientras la buena se mueve fuera.
  if (briefingUrl) {
    await db.documento.create({
      data: {
        projectId: project.id,
        tipo: "BRIEFING",
        nombre: "Briefing (enlace)",
        linkUrl: briefingUrl,
        subidoPorId: staff.id,
      },
    });
  }
  if (briefingArchivo instanceof File && briefingArchivo.size > 0) {
    const guardado = await guardarArchivo(briefingArchivo);
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

  for (const id of equipoIds) {
    await db.asignacionEtapa.upsert({
      where: { projectId_staffUserId_etapa: { projectId: project.id, staffUserId: id, etapa: "VENTA" } },
      create: { projectId: project.id, staffUserId: id, etapa: "VENTA", responsable: id === responsableId },
      update: { responsable: id === responsableId },
    });
  }

  // El presupuesto se abre ya si hay algo que decir de él: a quién le toca o qué
  // comentó la agencia. Así la persona asignada se lo encuentra empezado.
  if (asignadoAId || comentarios) {
    await db.presupuestoVenta.create({
      data: {
        projectId: project.id,
        asignadoAId: asignadoAId || null,
        notas: comentarios || null,
        actualizadoPorId: staff.id,
      },
    });
  }

  if (asignadoAId) {
    await avisar({
      staffUserId: asignadoAId,
      texto: `${staff.name} te ha asignado preparar el presupuesto de «${name}» (${cliente.nombre}).`,
      url: `/gestor/${project.code}`,
    });
  }

  redirect(`/gestor/${project.code}`);
}
