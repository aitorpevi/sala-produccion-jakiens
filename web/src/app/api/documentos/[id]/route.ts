import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireStaff, puedeVerProyecto } from "@/lib/access";
import { leerArchivo } from "@/lib/storage";

/**
 * Descarga un documento de venta (briefing o presupuesto).
 *
 * El permiso se comprueba aquí y no solo al pintar el enlace: una URL de
 * descarga es lo primero que alguien pega en un chat, y el presupuesto es el
 * documento más sensible que maneja esta etapa.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;

  const doc = await db.documento.findUnique({ where: { id } });
  if (!doc) return new Response("No encontrado", { status: 404 });

  if (!(await puedeVerProyecto(staff, doc.projectId))) {
    return new Response("No autorizado", { status: 403 });
  }
  // El presupuesto de venta tiene su propio permiso, aparte del nivel.
  if (doc.tipo === "PRESUPUESTO" && !staff.accesoPresupuestoVenta) {
    return new Response("No autorizado", { status: 403 });
  }

  const bytes = doc.fileUrl ? await leerArchivo(doc.fileUrl) : doc.fileData;
  if (!bytes) return new Response("No se pudo recuperar el archivo", { status: 502 });

  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.nombre.replace(/"/g, "")}"`,
    },
  });
}
