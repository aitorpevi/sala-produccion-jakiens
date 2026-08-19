import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStaffUserId } from "@/lib/session";
import { resolveAccessToken } from "@/lib/tokens";
import { leerArchivo } from "@/lib/storage";
import { registrarAcceso } from "@/lib/auditoria";

/**
 * Sirve la factura en PDF de un colaborador.
 *
 * La ve el equipo interno con sesión, o el propio colaborador con su enlace —
 * nadie más, y nunca la de otra persona. La URL del blob no se expone: el store
 * es privado y el token vive solo en el servidor.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectMemberId: string }> },
) {
  const { projectMemberId } = await params;

  const factura = await db.invoice.findUnique({
    where: { projectMemberId },
    include: { projectMember: { include: { person: true, project: true } } },
  });
  if (!factura?.filePath) return new Response("No encontrado", { status: 404 });

  const token = request.nextUrl.searchParams.get("token");
  let autorizado = false;
  let quien = "desconocido";

  if (token) {
    const member = await resolveAccessToken(token);
    // Su propia factura y solo la suya.
    autorizado = !!member && member.id === projectMemberId;
    quien = member ? `${member.person.name} (el propio interesado)` : "enlace no válido";
  } else {
    const staffId = await getStaffUserId();
    if (staffId) {
      const staff = await db.staffUser.findUnique({ where: { id: staffId } });
      autorizado = !!staff;
      quien = staff?.name ?? "equipo interno";
    }
  }

  if (!autorizado) return new Response("No autorizado", { status: 403 });

  const archivo = await leerArchivo(factura.filePath);
  if (!archivo) return new Response("No se pudo recuperar la factura", { status: 502 });

  await registrarAcceso({
    staffNombre: quien,
    personId: factura.projectMember.personId,
    personNombre: factura.projectMember.person.name,
    accion: "ver_ficha",
    detalle: `Factura de ${factura.projectMember.project.code}`,
  });

  const nombre = `Factura ${factura.projectMember.project.code} - ${factura.projectMember.person.name}.pdf`;

  return new Response(archivo.body, {
    headers: {
      "Content-Type": archivo.contentType,
      "Content-Disposition": `inline; filename="${nombre.replace(/[/\\:*?"<>|]/g, "-")}"`,
    },
  });
}
