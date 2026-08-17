type WaPerson = {
  name: string;
  phone: string | null;
  role: string;
  dias: number;
};

type WaProject = {
  client: string;
  name: string;
  shootLabel: string;
  location: string;
};

export function buildWaMessage(person: WaPerson, project: WaProject, ficha: string) {
  const firstName = person.name.split(" ")[0];
  const jornadas = person.dias > 1 ? `${person.dias} jornadas` : "1 jornada";
  return `Hola ${firstName},

Te queremos en el equipo de ${project.client} — ${project.name} como ${person.role.toUpperCase()}.
Rodaje: ${project.shootLabel} en ${project.location} (${jornadas}).

Aquí tienes tu ficha con briefing, fechas, condiciones y presupuesto:
${ficha}

¿Confirmas disponibilidad?`;
}

export function buildWaLink(phone: string | null, message: string) {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
