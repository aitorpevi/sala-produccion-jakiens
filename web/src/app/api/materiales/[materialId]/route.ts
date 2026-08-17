import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStaffUserId } from "@/lib/session";
import { resolveAccessToken } from "@/lib/tokens";
import { readUploadedFile } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const { materialId } = await params;
  const material = await db.material.findUnique({
    where: { id: materialId },
    include: { targets: true },
  });

  if (!material || !material.filePath) {
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

  const buffer = await readUploadedFile(material.filePath);
  const safeName = material.name.replace(/[^a-zA-Z0-9._ -]/g, "_");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}.${material.ext.toLowerCase()}"`,
    },
  });
}
