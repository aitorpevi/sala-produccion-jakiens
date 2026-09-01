/**
 * Convierte en hitos con fecha real las fechas que hoy viven como texto libre.
 *
 *   npx tsx --env-file=.env scripts/importar-hitos.ts          # simulación
 *   npx tsx --env-file=.env scripts/importar-hitos.ts --aplicar # escribe
 *
 * De dónde salen:
 *   - Los seis campos de texto del alta de proyecto (`preproInicio`, `rodajeInicio`,
 *     `entregaMaterial`...), que se escribieron a mano como "14 JUL" o "04 AGO".
 *   - `CallSheetDay.fechaISO`, que ya es una fecha de verdad y solo hay que proyectar.
 *
 * Es idempotente: los hitos derivados llevan `origen`/`origenId`, así que
 * volver a correrlo actualiza los que ya existen en vez de duplicarlos. Los
 * hitos creados a mano en el gestor (`origen = "manual"`) no se tocan nunca.
 *
 * EL AÑO ES EL PROBLEMA. "14 JUL" no dice de qué año es. Se deduce, por orden:
 *   1. Un año explícito en el propio texto ("24–25 JUL 2026").
 *   2. El año del `shootLabel` del proyecto, que sí suele llevarlo.
 *   3. El año en que se creó el proyecto.
 * Y si la fecha resultante cae más de tres meses ANTES de que el proyecto se
 * diera de alta, se asume que es del año siguiente: nadie da de alta un proyecto
 * para rodar el mes pasado, pero sí uno en diciembre para rodar en enero.
 *
 * Lo que no se puede leer no se inventa: se lista al final para revisarlo a
 * mano. Una fecha inventada en un calendario es peor que un hueco, porque el
 * hueco se ve.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Etapa, TipoHito } from "../src/generated/prisma/enums";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const APLICAR = process.argv.includes("--aplicar");

/** Los seis campos de texto del proyecto, y en qué hito se convierte cada uno. */
const CAMPOS_FECHA = [
  { campo: "preproInicio", titulo: "Arranca preproducción", etapa: "PREPRODUCCION", tipo: "OTRO" },
  { campo: "preproFin", titulo: "Cierra preproducción", etapa: "PREPRODUCCION", tipo: "OTRO" },
  { campo: "rodajeInicio", titulo: "Primera jornada de rodaje", etapa: "RODAJE", tipo: "RODAJE" },
  { campo: "rodajeFin", titulo: "Última jornada de rodaje", etapa: "RODAJE", tipo: "RODAJE" },
  { campo: "entregaMaterial", titulo: "Entrega de material", etapa: "RODAJE", tipo: "ENTREGA_MATERIAL" },
  { campo: "primeraEntregaMontaje", titulo: "Primera entrega de montaje", etapa: "POSTPRODUCCION", tipo: "ENTREGA_MONTAJE" },
] as const satisfies ReadonlyArray<{
  campo: string;
  titulo: string;
  etapa: Etapa;
  tipo: TipoHito;
}>;

const MESES: Record<string, number> = {
  ENE: 0, FEB: 1, MAR: 2, ABR: 3, MAY: 4, JUN: 5,
  JUL: 6, AGO: 7, SEP: 8, OCT: 9, NOV: 10, DIC: 11,
  // Por si alguien escribió el mes completo o en inglés.
  ENERO: 0, FEBRERO: 1, MARZO: 2, ABRIL: 3, MAYO: 4, JUNIO: 5,
  JULIO: 6, AGOSTO: 7, SEPTIEMBRE: 8, OCTUBRE: 9, NOVIEMBRE: 10, DICIEMBRE: 11,
  JAN: 0, APR: 3, AUG: 7, DEC: 11,
};

/** Año suelto de cuatro cifras dentro de un texto: "24–25 JUL 2026" → 2026. */
function anyoDelTexto(texto: string | null): number | null {
  const m = texto?.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

/**
 * Lee "14 JUL", "04 AGO 2026" o "24–25 JUL 2026". De un rango se queda con el
 * primer día: el último, cuando importa, ya viene en su propio campo
 * (`rodajeFin`).
 */
function leerFecha(texto: string, anyoPorDefecto: number, creado: Date): Date | null {
  const limpio = texto.trim().toUpperCase().replace(/[–—]/g, "-");

  const m = limpio.match(/(\d{1,2})\s*(?:-\s*\d{1,2})?\s*(?:DE\s+)?([A-ZÁÉÍÓÚ]{3,10})/);
  if (!m) return null;

  const dia = Number(m[1]);
  const mes = MESES[m[2]];
  if (mes === undefined || dia < 1 || dia > 31) return null;

  let anyo = anyoDelTexto(limpio) ?? anyoPorDefecto;

  // Sin año explícito, corregir el salto de diciembre a enero.
  if (anyoDelTexto(limpio) === null) {
    const candidata = new Date(Date.UTC(anyo, mes, dia));
    const tresMesesAntes = new Date(creado);
    tresMesesAntes.setUTCMonth(tresMesesAntes.getUTCMonth() - 3);
    if (candidata < tresMesesAntes) anyo += 1;
  }

  const fecha = new Date(Date.UTC(anyo, mes, dia));
  // Un 31 de febrero se desborda a marzo: si el mes cambió, el texto mentía.
  return fecha.getUTCMonth() === mes ? fecha : null;
}

async function main() {
  const proyectos = await db.project.findMany({
    include: { callSheetDays: { where: { fechaISO: { not: null } }, orderBy: { orden: "asc" } } },
  });

  const pendientes: { code: string; campo: string; texto: string }[] = [];
  let creados = 0;
  let actualizados = 0;

  for (const p of proyectos) {
    const anyoBase = anyoDelTexto(p.shootLabel) ?? p.createdAt.getUTCFullYear();

    for (const def of CAMPOS_FECHA) {
      const texto = (p as unknown as Record<string, string | null>)[def.campo];
      if (!texto?.trim()) continue;

      const fecha = leerFecha(texto, anyoBase, p.createdAt);
      if (!fecha) {
        pendientes.push({ code: p.code, campo: def.campo, texto });
        continue;
      }

      const origenId = `${p.id}:${def.campo}`;
      const datos = {
        projectId: p.id,
        etapa: def.etapa,
        tipo: def.tipo,
        titulo: def.titulo,
        fecha,
        // El texto original se guarda en las notas: si la lectura del año se
        // equivocó, quien lo revise ve de dónde salió sin abrir el proyecto.
        notas: `Importado de "${texto}" (campo ${def.campo})`,
        origen: "proyecto",
        origenId,
      };

      if (APLICAR) {
        const previo = await db.hito.findUnique({ where: { origen_origenId: { origen: "proyecto", origenId } } });
        await db.hito.upsert({
          where: { origen_origenId: { origen: "proyecto", origenId } },
          create: datos,
          update: datos,
        });
        if (previo) actualizados++;
        else creados++;
      } else {
        creados++;
      }

      console.log(`  ${p.code} · ${def.titulo}: "${texto}" → ${fecha.toISOString().slice(0, 10)}`);
    }

    // Las jornadas de rodaje ya tienen fecha real; solo hay que proyectarlas.
    for (const dia of p.callSheetDays) {
      if (!dia.fechaISO) continue;
      const origenId = dia.id;
      const datos = {
        projectId: p.id,
        etapa: "RODAJE" as Etapa,
        tipo: "RODAJE" as TipoHito,
        titulo: `Rodaje · ${dia.fecha}`,
        fecha: dia.fechaISO,
        origen: "callsheet",
        origenId,
      };

      if (APLICAR) {
        const previo = await db.hito.findUnique({ where: { origen_origenId: { origen: "callsheet", origenId } } });
        await db.hito.upsert({
          where: { origen_origenId: { origen: "callsheet", origenId } },
          create: datos,
          update: datos,
        });
        if (previo) actualizados++;
        else creados++;
      } else {
        creados++;
      }

      console.log(`  ${p.code} · jornada: ${dia.fechaISO.toISOString().slice(0, 10)}`);
    }
  }

  console.log(
    APLICAR
      ? `\n${creados} hitos creados, ${actualizados} actualizados.`
      : `\n${creados} hitos se crearían. Simulación: no se ha escrito nada. Añade --aplicar.`,
  );

  if (pendientes.length) {
    console.log(`\n${pendientes.length} fecha(s) que no he sabido leer — revisar a mano:`);
    for (const f of pendientes) console.log(`  ${f.code} · ${f.campo}: "${f.texto}"`);
  }

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
