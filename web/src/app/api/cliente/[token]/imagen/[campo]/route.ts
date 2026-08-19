import { NextRequest } from "next/server";
import { resolverAccesoCliente } from "@/lib/cliente";
import { leerArchivo } from "@/lib/storage";

/** Solo estos tres campos del proyecto son servibles por aquí. */
const CAMPOS = ["portada", "logoCliente", "logoAgencia"] as const;
type Campo = (typeof CAMPOS)[number];

const A_COLUMNA: Record<Campo, "portadaUrl" | "logoClienteUrl" | "logoAgenciaUrl"> = {
  portada: "portadaUrl",
  logoCliente: "logoClienteUrl",
  logoAgencia: "logoAgenciaUrl",
};

/**
 * Sirve la portada y los logos de la vista de cliente.
 *
 * El store de Blob es privado, así que su URL da 403 por sí sola: hace falta un
 * token que solo existe en el servidor. Esta ruta comprueba primero que quien
 * pide la imagen tiene un enlace de cliente o agencia válido y no caducado, y
 * solo entonces la sirve.
 *
 * El efecto secundario es bueno: revocar el enlace también corta el acceso a la
 * imagen de campaña, que suele ser material confidencial antes del estreno.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; campo: string }> },
) {
  const { token, campo } = await params;

  if (!CAMPOS.includes(campo as Campo)) {
    return new Response("No encontrado", { status: 404 });
  }

  const acceso = await resolverAccesoCliente(token);
  if (!acceso) return new Response("No encontrado", { status: 404 });

  const url = acceso.project[A_COLUMNA[campo as Campo]];
  if (!url) return new Response("No encontrado", { status: 404 });

  const archivo = await leerArchivo(url);
  if (!archivo) return new Response("No se pudo recuperar la imagen", { status: 502 });

  return new Response(archivo.body, {
    headers: {
      "Content-Type": archivo.contentType,
      // Privada y de vida corta: si producción cambia la portada, el cliente lo
      // ve en minutos, y ningún intermediario se la queda cacheada.
      "Cache-Control": "private, max-age=300",
    },
  });
}
