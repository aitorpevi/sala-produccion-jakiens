import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Registro de accesos a datos personales.
 *
 * El RGPD exige poder acreditar quién ha consultado o exportado datos de un
 * tercero. Sin esto, ante una reclamación de un colaborador la respuesta sería
 * "no lo sabemos", que es exactamente lo que la norma no admite.
 *
 * Nunca se guarda el dato consultado, solo el hecho de haberlo consultado: un
 * registro de auditoría que copiase los IBAN sería un segundo sitio del que
 * pueden robarlos.
 */

export type AccionAuditada =
  | "ver_ficha"
  | "revelar_campo"
  | "exportar_altas"
  | "editar_datos";

export async function registrarAcceso(datos: {
  staffUserId?: string | null;
  staffNombre: string;
  personId?: string | null;
  personNombre?: string | null;
  accion: AccionAuditada;
  detalle?: string | null;
}) {
  let ip: string | null = null;
  try {
    const h = await headers();
    // Vercel pone la IP real del cliente en x-forwarded-for.
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } catch {
    // Fuera de una petición (scripts, tareas) no hay cabeceras. No es un error.
  }

  try {
    await db.accesoDatosPersonales.create({
      data: {
        staffUserId: datos.staffUserId ?? null,
        staffNombre: datos.staffNombre,
        personId: datos.personId ?? null,
        personNombre: datos.personNombre ?? null,
        accion: datos.accion,
        detalle: datos.detalle ?? null,
        ip,
      },
    });
  } catch (e) {
    // Que falle la auditoría no puede tumbar la operación del usuario, pero
    // tiene que quedar constancia en los logs del servidor.
    console.error("[auditoría] no se pudo registrar el acceso:", e);
  }
}

/**
 * Purga de registros antiguos. Los datos de auditoría también están sujetos a
 * minimización: se conservan lo necesario para acreditar accesos y luego se
 * borran. Tres años cubre el plazo de las acciones administrativas habituales.
 */
export async function purgarRegistrosAntiguos(anios = 3) {
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - anios);
  const { count } = await db.accesoDatosPersonales.deleteMany({
    where: { creadoEn: { lt: limite } },
  });
  return count;
}
