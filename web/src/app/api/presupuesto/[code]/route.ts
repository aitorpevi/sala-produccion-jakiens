import { NextRequest } from "next/server";
import { requireStaffAccess } from "@/lib/access";
import { leerPresupuesto } from "@/lib/presupuesto";

/**
 * Lee un presupuesto y devuelve lo que encuentra, sin guardar nada.
 *
 * Va por API y no por Server Action a propósito: el resultado se enseña para
 * que producción confirme qué es equipo y qué no, y eso necesita un ida y
 * vuelta antes de tocar la base de datos.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  await requireStaffAccess(code, "prepro");

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "No has adjuntado ningún archivo." }, { status: 400 });
  }

  try {
    const lectura = await leerPresupuesto(Buffer.from(await file.arrayBuffer()));
    return Response.json(lectura);
  } catch (e) {
    console.error("[presupuesto] no se pudo leer:", e);
    return Response.json(
      { error: "No he podido leer ese archivo. ¿Es un .xlsx?" },
      { status: 400 },
    );
  }
}
