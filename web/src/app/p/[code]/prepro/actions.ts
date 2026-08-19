"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { DEPARTAMENTOS, ESTADOS_NECESIDAD, normalizarRol } from "@/lib/necesidades";

function txt(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

// ---------- Necesidades por departamento ----------

export async function anadirNecesidadAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "prepro");

  const concepto = txt(formData, "concepto");
  const departamento = String(formData.get("departamento") ?? "");
  if (!concepto || !DEPARTAMENTOS.some((d) => d.clave === departamento)) return;

  const ultimas = await db.necesidad.findMany({
    where: { projectId: project.id, departamento },
    orderBy: { orden: "desc" },
    take: 1,
  });

  await db.necesidad.create({
    data: {
      projectId: project.id,
      departamento,
      concepto,
      detalle: txt(formData, "detalle"),
      responsableId: txt(formData, "responsableId"),
      orden: (ultimas[0]?.orden ?? 0) + 1,
    },
  });

  revalidatePath(`/p/${code}/prepro`);
}

export async function guardarNecesidadAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "prepro");

  const id = String(formData.get("necesidadId") ?? "");
  const n = await db.necesidad.findUnique({ where: { id } });
  if (!n || n.projectId !== project.id) return;

  const estado = String(formData.get("estado") ?? n.estado);

  await db.necesidad.update({
    where: { id },
    data: {
      concepto: txt(formData, "concepto") ?? n.concepto,
      detalle: txt(formData, "detalle"),
      responsableId: txt(formData, "responsableId"),
      estado: (ESTADOS_NECESIDAD as readonly string[]).includes(estado) ? estado : n.estado,
    },
  });

  revalidatePath(`/p/${code}/prepro`);
}

export async function borrarNecesidadAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "prepro");

  const id = String(formData.get("necesidadId") ?? "");
  const n = await db.necesidad.findUnique({ where: { id } });
  if (!n || n.projectId !== project.id) return;

  await db.necesidad.delete({ where: { id } });
  revalidatePath(`/p/${code}/prepro`);
}

// ---------- Puestos previstos en el presupuesto aprobado ----------

export async function anadirPuestoAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "prepro");

  const rol = txt(formData, "rol");
  if (!rol) return;

  const cantidad = Number(formData.get("cantidad") ?? 1);
  const ultimos = await db.puestoPrevisto.findMany({
    where: { projectId: project.id },
    orderBy: { orden: "desc" },
    take: 1,
  });

  await db.puestoPrevisto.create({
    data: {
      projectId: project.id,
      rol,
      cantidad: Number.isFinite(cantidad) && cantidad > 0 ? Math.round(cantidad) : 1,
      nota: txt(formData, "nota"),
      orden: (ultimos[0]?.orden ?? 0) + 1,
    },
  });

  revalidatePath(`/p/${code}/prepro`);
  revalidatePath(`/p/${code}/equipo`);
}

/**
 * Da por bueno un puesto aunque falte gente por nombrar.
 *
 * Es el escape que hace que el aviso sirva de algo: sin él, el producer que no
 * tiene los nombres hasta el final vería alertas toda la preproducción y
 * acabaría ignorándolas todas, incluidas las que sí importan.
 */
export async function alternarConfirmacionPuestoAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "prepro");

  const id = String(formData.get("puestoId") ?? "");
  const p = await db.puestoPrevisto.findUnique({ where: { id } });
  if (!p || p.projectId !== project.id) return;

  await db.puestoPrevisto.update({
    where: { id },
    data: { confirmadoManualmente: !p.confirmadoManualmente },
  });

  revalidatePath(`/p/${code}/prepro`);
  revalidatePath(`/p/${code}/equipo`);
}

export async function borrarPuestoAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { project } = await requireStaffAccess(code, "prepro");

  const id = String(formData.get("puestoId") ?? "");
  const p = await db.puestoPrevisto.findUnique({ where: { id } });
  if (!p || p.projectId !== project.id) return;

  await db.puestoPrevisto.delete({ where: { id } });
  revalidatePath(`/p/${code}/prepro`);
  revalidatePath(`/p/${code}/equipo`);
}

/**
 * Importa como puestos previstos las líneas que producción ha confirmado.
 *
 * Recibe objetos y no un FormData porque la confirmación pasa por una pantalla
 * con checkboxes: lo que llega es la selección ya revisada, no el archivo.
 *
 * Si un puesto ya existe, suma la cantidad en vez de duplicar la línea: un
 * presupuesto puede traer "Auxiliar de producción" en dos secciones distintas.
 */
export async function importarPuestosAction(
  code: string,
  lineas: { concepto: string; cantidad: number; dias: number | null; seccion: string | null }[],
) {
  const { project } = await requireStaffAccess(code, "prepro");
  if (!Array.isArray(lineas) || lineas.length === 0) return;

  const existentes = await db.puestoPrevisto.findMany({ where: { projectId: project.id } });
  const porRol = new Map(existentes.map((p) => [normalizarRol(p.rol), p]));

  let orden = existentes.reduce((max, p) => Math.max(max, p.orden), 0);

  for (const l of lineas) {
    const rol = String(l.concepto ?? "").trim().slice(0, 120);
    const cantidad = Number(l.cantidad);
    if (!rol || !Number.isFinite(cantidad) || cantidad <= 0) continue;

    const clave = normalizarRol(rol);
    const ya = porRol.get(clave);

    if (ya) {
      await db.puestoPrevisto.update({
        where: { id: ya.id },
        data: { cantidad: ya.cantidad + Math.round(cantidad) },
      });
      ya.cantidad += Math.round(cantidad);
      continue;
    }

    orden += 1;
    const creado = await db.puestoPrevisto.create({
      data: {
        projectId: project.id,
        rol,
        cantidad: Math.round(cantidad),
        nota: l.seccion ? `Del presupuesto · ${l.seccion}` : "Del presupuesto",
        orden,
      },
    });
    porRol.set(clave, creado);
  }

  revalidatePath(`/p/${code}/prepro`);
  revalidatePath(`/p/${code}/equipo`);
}
