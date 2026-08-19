import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolverAccesoCliente } from "@/lib/cliente";

/** "11:00" → [11, 0]. Devuelve null si no es una hora reconocible. */
function partesHora(hora: string | null): [number, number] | null {
  if (!hora) return null;
  const m = hora.trim().match(/^(\d{1,2})[:.h ]?(\d{2})?/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return [h, min];
}

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** Marca de tiempo absoluta, en UTC. Para DTSTAMP, que es un instante real. */
function estampaUTC(d: Date) {
  return (
    `${d.getUTCFullYear()}${dosDigitos(d.getUTCMonth() + 1)}${dosDigitos(d.getUTCDate())}` +
    `T${dosDigitos(d.getUTCHours())}${dosDigitos(d.getUTCMinutes())}00Z`
  );
}

/**
 * Hora "flotante" del estándar iCalendar: sin Z y sin zona horaria, se
 * interpreta en la hora local de quien la abre.
 *
 * Es lo correcto para una orden de rodaje, y además evita un fallo real: el
 * servidor de producción corre en UTC, así que fijar la hora con la zona del
 * servidor convertiría un rodaje de las 11:00 en las 13:00 para todo el mundo.
 * Con hora flotante, las 11:00 son las 11:00 en el set.
 */
function estampaLocal(y: number, mes: number, dia: number, h: number, min: number) {
  return `${y}${dosDigitos(mes)}${dosDigitos(dia)}T${dosDigitos(h)}${dosDigitos(min)}00`;
}

/**
 * Un `.ics` puede llevar comas, puntos y comas y saltos de línea dentro de un
 * campo, pero escapados. Sin esto, una dirección con coma parte el archivo.
 */
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; dia: string }> },
) {
  const { token, dia: diaParam } = await params;

  const acceso = await resolverAccesoCliente(token);
  if (!acceso) return new Response("No encontrado", { status: 404 });

  const diaId = diaParam.replace(/\.ics$/, "");
  const jornada = await db.callSheetDay.findUnique({
    where: { id: diaId },
    include: { localizaciones: { orderBy: { orden: "asc" } } },
  });

  if (!jornada || jornada.projectId !== acceso.projectId || !jornada.fechaISO) {
    return new Response("No encontrado", { status: 404 });
  }

  // La hora de llegada del cliente, no el call del equipo: este evento es suyo.
  // La fecha se guardó a medianoche UTC desde un <input type="date">, así que se
  // leen sus componentes en UTC para no desplazarla un día.
  const f = jornada.fechaISO;
  const [hIni, mIni] = partesHora(jornada.llegadaCliente) ?? partesHora(jornada.primeraHora) ?? [9, 0];
  const hFin = (hIni + 4) % 24;

  const inicio = estampaLocal(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate(), hIni, mIni);
  const fin = estampaLocal(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate(), hFin, mIni);

  const loc = jornada.localizaciones[0];
  const lugar = loc ? [loc.nombre, loc.direccion].filter(Boolean).join(", ") : acceso.project.location;

  const descripcion = [
    `Rodaje de ${acceso.project.name} para ${acceso.project.client}.`,
    jornada.contactoSet || jornada.contactoSetTel
      ? `Producción en set: ${[jornada.contactoSet, jornada.contactoSetTel].filter(Boolean).join(" · ")}`
      : null,
    loc?.parking ? `Parking: ${loc.parking}` : null,
    loc?.accesos ? `Accesos: ${loc.accesos}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jakiens//Sala de Produccion//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${jornada.id}-${acceso.id}@jakiens`,
    `DTSTAMP:${estampaUTC(new Date())}`,
    `DTSTART:${inicio}`,
    `DTEND:${fin}`,
    `SUMMARY:${esc(`Rodaje · ${acceso.project.name}`)}`,
    `LOCATION:${esc(lugar)}`,
    `DESCRIPTION:${esc(descripcion)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`Rodaje de ${acceso.project.name} en 2 horas`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n"); // el estándar exige CRLF

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="rodaje-${acceso.project.code}.ics"`,
    },
  });
}
