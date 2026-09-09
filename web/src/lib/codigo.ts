import "server-only";
import { db } from "@/lib/db";

/**
 * Genera el código interno de un proyecto.
 *
 * Ya no se pide al abrir la oportunidad: el identificador que usa la gente es la
 * referencia del PPTO ("PPTO 57A-2026-Kids-Consum-Mascotas"), y ese no se conoce
 * hasta que alguien prepara el presupuesto. Pero el proyecto necesita una
 * dirección desde el primer segundo, porque vive en la URL.
 *
 * Este código NO se enseña como "el número del proyecto" y NO cambia nunca. Si
 * cambiara, moriría cualquier enlace que alguien hubiera pegado en Slack o en un
 * correo, y con él los accesos de colaborador y de cliente.
 *
 * Formato: iniciales del cliente + año + correlativo del año. `EG-26-004`.
 */
export async function generarCodigo(cliente: string) {
  const anyo = String(new Date().getFullYear()).slice(-2);
  const palabras = cliente
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  // Con varias palabras, la inicial de cada una ("The Champions Burger" → TCB).
  // Con una sola, sus tres primeras letras: "McCann" daría solo "M", que no
  // distingue nada en cuanto haya dos clientes con la misma inicial.
  const iniciales =
    (palabras.length > 1
      ? palabras.map((p) => p[0]).join("")
      : (palabras[0] ?? "").slice(0, 3)
    ).slice(0, 3) || "PRJ";

  const prefijo = `${iniciales}-${anyo}-`;

  // Se cuenta sobre los que ya empiezan igual en vez de llevar un contador
  // aparte: una tabla de secuencias sería una pieza más que mantener, y aquí
  // hablamos de decenas de proyectos al año, no de miles.
  const usados = await db.project.findMany({
    where: { code: { startsWith: prefijo } },
    select: { code: true },
  });

  let n = usados.length + 1;
  let codigo = `${prefijo}${String(n).padStart(3, "0")}`;
  // Si alguien borró uno por el medio, el conteo puede chocar. Se avanza hasta
  // encontrar hueco en vez de fallar: el número exacto da igual, la unicidad no.
  const ocupados = new Set(usados.map((p) => p.code));
  while (ocupados.has(codigo)) {
    n += 1;
    codigo = `${prefijo}${String(n).padStart(3, "0")}`;
  }
  return codigo;
}
