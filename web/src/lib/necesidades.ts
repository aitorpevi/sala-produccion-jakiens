/**
 * Departamentos con necesidades propias en una producción.
 *
 * Sin `server-only`: la lista se usa también en formularios.
 */
export const DEPARTAMENTOS = [
  { clave: "ARTE", etiqueta: "Arte" },
  { clave: "VESTUARIO", etiqueta: "Vestuario" },
  { clave: "CASTING", etiqueta: "Casting" },
  { clave: "OPTICAS", etiqueta: "Ópticas y cámara" },
  { clave: "MATERIALES", etiqueta: "Materiales y equipo" },
  { clave: "OTROS", etiqueta: "Otros" },
] as const;

export type ClaveDepartamento = (typeof DEPARTAMENTOS)[number]["clave"];

export function etiquetaDepartamento(clave: string) {
  return DEPARTAMENTOS.find((d) => d.clave === clave)?.etiqueta ?? clave;
}

export const ESTADOS_NECESIDAD = ["pendiente", "confirmada", "descartada"] as const;

/**
 * Compara los puestos previstos en el presupuesto con el equipo dado de alta.
 *
 * Es un aviso, nunca un bloqueo: el producer muchas veces no tiene el nombre
 * hasta el final, y una alerta que no se puede silenciar acaba ignorándose
 * entera. Por eso cada línea se puede dar por buena a mano.
 *
 * La comparación de roles es laxa (sin tildes, sin mayúsculas, sin plurales)
 * porque "Eléctrico", "electrico" y "Electricos" son lo mismo escritos por
 * personas distintas con prisa.
 */
export function normalizarRol(rol: string) {
  return rol
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/e?s$/, ""); // eléctricos -> electric, dop -> dop
}

export type Cobertura = {
  rol: string;
  previstos: number;
  cubiertos: number;
  faltan: number;
  confirmadoManualmente: boolean;
  nota: string | null;
  puestoId: string;
};

export function calcularCobertura(
  puestos: { id: string; rol: string; cantidad: number; confirmadoManualmente: boolean; nota: string | null }[],
  miembros: { role: string }[],
): Cobertura[] {
  return puestos.map((p) => {
    const clave = normalizarRol(p.rol);
    const cubiertos = miembros.filter((m) => normalizarRol(m.role) === clave).length;
    return {
      rol: p.rol,
      previstos: p.cantidad,
      cubiertos,
      faltan: Math.max(0, p.cantidad - cubiertos),
      confirmadoManualmente: p.confirmadoManualmente,
      nota: p.nota,
      puestoId: p.id,
    };
  });
}
