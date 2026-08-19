import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStaffUserId } from "@/lib/session";
import { resolveAccessToken } from "@/lib/tokens";
import { leerArchivo } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const { materialId } = await params;
  const material = await db.material.findUnique({
    where: { id: materialId },
    include: { targets: true },
  });

  if (!material || (!material.fileUrl && !material.fileData)) {
    return new Response("No encontrado", { status: 404 });
  }

  const token = request.nextUrl.searchParams.get("token");
  let authorized = false;

  if (token) {
    const member = await resolveAccessToken(token);
    authorized = !!member && material.targets.some((t) => t.projectMemberId === member.id);
  } else {
    authorized = !!(await getStaffUserId());
  }

  if (!authorized) {
    return new Response("No autorizado", { status: 403 });
  }

  const safeName = material.name.replace(/[^a-zA-Z0-9._ -]/g, "_");
  const headers = {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${safeName}.${material.ext.toLowerCase()}"`,
  };

  // Los archivos en Blob se sirven a través de esta ruta en vez de redirigir a
  // su URL: el store es privado y esa URL devuelve 403 sin el token, que solo
  // vive en el servidor. Los materiales antiguos siguen viniendo de los bytes
  // guardados en la base de datos.
  if (material.fileUrl) {
    const remoto = await leerArchivo(material.fileUrl);
    if (!remoto) return new Response("No se pudo recuperar el archivo", { status: 502 });
    return new Response(remoto.body, { headers });
  }

  return new Response(new Uint8Array(material.fileData!), { headers });
}
