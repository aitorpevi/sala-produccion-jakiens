const NEEDS: Record<string, [string, string][]> = {
  gabi: [
    ["Tratamiento", "Aprobado"],
    ["Shotlist", "v1 lista"],
    ["Playback en set", "Sí"],
  ],
  dop: [
    ["Lista de cámara", "Enviar antes 22/7"],
    ["Óptica macro", "Reservada"],
    ["Planta de luz", "Subir borrador"],
  ],
  food: [
    ["Dobles de producto", "8 uds/hero"],
    ["Cocina en set", "Disponible"],
    ["Nevera / almacenaje", "Confirmado"],
  ],
  maq: [
    ["Actores", "2 · J2"],
    ["Kit continuidad", "Propio"],
    ["Espacio maquillaje", "En estudio"],
  ],
  vest: [
    ["Tallas talent", "Recibidas"],
    ["Cambios por manchas", "Prever x2"],
    ["Percha / vapor", "En set"],
  ],
  aux: [
    ["Vehículo", "Propio"],
    ["Accesos", "Gestiona producción"],
    ["Horario", "Ver call time"],
  ],
};

export function needsForPerson(personId: string): [string, string][] {
  const key = personId.replace(/^seed-/, "");
  return NEEDS[key] ?? [];
}
