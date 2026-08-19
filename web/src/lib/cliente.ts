import "server-only";
import { db } from "@/lib/db";
import { generateTokenString } from "@/lib/tokens";

export { MARCAS, marcaDe } from "@/lib/marcas";

const TTL_DIAS = 60;

export async function crearAccesoCliente(projectId: string, tipo: string, etiqueta: string | null) {
  const token = generateTokenString();
  const expiresAt = new Date(Date.now() + TTL_DIAS * 24 * 60 * 60 * 1000);
  await db.clientAccess.create({ data: { projectId, token, tipo, etiqueta, expiresAt } });
  return token;
}

/**
 * Resuelve el enlace de cliente o agencia y anota la visita.
 *
 * `lastSeenAt` no es telemetría por gusto: producción quiere saber si el cliente
 * ha llegado a abrir la orden antes de darla por comunicada.
 */
export async function resolverAccesoCliente(token: string) {
  const acceso = await db.clientAccess.findUnique({
    where: { token },
    include: { project: true },
  });
  if (!acceso) return null;
  if (acceso.expiresAt < new Date()) return null;

  await db.clientAccess.update({
    where: { id: acceso.id },
    data: { lastSeenAt: new Date() },
  });

  return acceso;
}

/**
 * Datos de la orden de rodaje que se enseñan a cliente y agencia.
 *
 * Deliberadamente NO salen de aquí: teléfonos del equipo, tarifas, presupuesto,
 * facturas, datos fiscales ni las horas de convocatoria individuales. Las
 * restricciones alimentarias salen agregadas y sin nombres, porque son datos de
 * salud y el catering solo necesita el recuento.
 */
export async function ordenParaCliente(projectId: string) {
  const [dias, miembros] = await Promise.all([
    db.callSheetDay.findMany({
      where: { projectId },
      include: {
        scheduleItems: { orderBy: { hora: "asc" } },
        localizaciones: { orderBy: { orden: "asc" } },
        traslados: { orderBy: { orden: "asc" } },
      },
      orderBy: { orden: "asc" },
    }),
    db.projectMember.findMany({
      where: { projectId },
      select: { restriccionesAlimentarias: true },
    }),
  ]);

  const restricciones = miembros
    .map((m) => m.restriccionesAlimentarias)
    .filter((r): r is string => !!r && r.trim() !== "");

  return {
    dias,
    totalEquipo: miembros.length,
    // Solo el recuento y el texto de cada restricción, nunca de quién es.
    restriccionesAnonimas: restricciones,
  };
}
