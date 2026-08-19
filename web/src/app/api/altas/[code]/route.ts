import { NextRequest } from "next/server";
import { requireStaffAccess } from "@/lib/access";
import { generarExcelAltas } from "@/lib/gestoria/altas-excel";
import { registrarAcceso } from "@/lib/auditoria";

/**
 * Descarga la hoja de altas del proyecto en el formato que espera la gestoría.
 * Solo equipo interno con acceso a la fase: el archivo lleva DNI, NAF e IBAN de
 * todo el equipo, así que no se sirve por enlace mágico de colaborador.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { staff } = await requireStaffAccess(code, "altas");

  const { buffer, fileName } = await generarExcelAltas(code);

  // Exportar es sacar DNI, NAF e IBAN del sistema hacia un archivo que viajará
  // por email. Es el acceso más sensible de toda la app: se registra siempre.
  await registrarAcceso({
    staffUserId: staff.id,
    staffNombre: staff.name,
    accion: "exportar_altas",
    detalle: `Hoja de altas del proyecto ${code}`,
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
    },
  });
}
