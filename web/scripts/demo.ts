/**
 * Crea cinco proyectos de ejemplo, uno por etapa, para enseñar la herramienta.
 *
 *   npx tsx --env-file=.env scripts/demo.ts            # simulación
 *   npx tsx --env-file=.env scripts/demo.ts --aplicar  # los crea
 *   npx tsx --env-file=.env scripts/demo.ts --borrar   # los quita todos
 *
 * Todos llevan el prefijo `DEMO-` en el código, así que se distinguen de un
 * vistazo en el tablero y se borran de golpe sin tocar nada real. Esa es la
 * razón de que no se creen a mano desde la interfaz: lo que se enseña en una
 * reunión hay que poder quitarlo entero después, y a mano siempre queda algo.
 *
 * Los clientes son inventados a propósito. Meter agencias reales en datos de
 * demostración acaba con alguien preguntando por qué figura un proyecto de un
 * cliente que no existe.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Etapa, TipoHito, EstadoProyecto } from "../src/generated/prisma/enums";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const APLICAR = process.argv.includes("--aplicar");
const BORRAR = process.argv.includes("--borrar");
const PREFIJO = "DEMO-";

/** Días a partir de hoy, como fecha de calendario en UTC. */
function enDias(dias: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

type Hito = { titulo: string; tipo: TipoHito; dias: number; hasta?: number };

const PROYECTOS: {
  code: string;
  cliente: string;
  marca: string;
  name: string;
  productora: string;
  director: string;
  etapa: Etapa;
  estado: EstadoProyecto;
  refPresupuesto?: string;
  presupuesto?: { estado: string; notas: string; asignadoA: string };
  briefing?: string;
  hitos: Hito[];
  /** [nombre, rol, ¿responsable?] */
  equipo: [string, string, boolean][];
}[] = [
  {
    code: `${PREFIJO}VENTA`,
    cliente: "Agencia Demo",
    marca: "Bebida Demo",
    name: "Campaña de verano",
    productora: "JAKIENS",
    director: "Por decidir",
    etapa: "VENTA",
    estado: "OPORTUNIDAD",
    presupuesto: {
      estado: "en_preparacion",
      notas: "Piden spot de 30\" más cortes para redes. Dudan del claim.",
      asignadoA: "Chiara",
    },
    briefing: "https://www.canva.com/ejemplo-de-briefing",
    hitos: [{ titulo: "Entrega de propuesta", tipo: "ENTREGA_PROPUESTA", dias: 6 }],
    equipo: [
      ["Mikko", "Supervisión de la propuesta", true],
      ["Malo", "Montaje de la presentación", false],
      ["Miquel", "Tratamiento", false],
      ["Carmen", "Coordinación", false],
    ],
  },
  {
    code: `${PREFIJO}PREPRO`,
    cliente: "Cliente Demo Directo",
    marca: "Alimentación Demo",
    name: "Lanzamiento de gama",
    productora: "JAKIENS",
    director: "Realizador Demo",
    etapa: "PREPRODUCCION",
    estado: "ACTIVO",
    refPresupuesto: "PPTO 12A-2026-Demo-Prepro",
    hitos: [
      { titulo: "PPM con cliente", tipo: "PPM", dias: 3 },
      { titulo: "Cierre de localizaciones", tipo: "OTRO", dias: 8 },
      { titulo: "Rodaje", tipo: "RODAJE", dias: 15, hasta: 16 },
    ],
    equipo: [
      ["Chiara", "Producer", true],
      ["Pablo", "Localizaciones", false],
      ["Carmen", "Logística y equipo", false],
    ],
  },
  {
    code: `${PREFIJO}RODAJE`,
    cliente: "Agencia Demo",
    marca: "Moda Demo",
    name: "Colección otoño",
    productora: "RICORICO",
    director: "Realizadora Demo",
    etapa: "RODAJE",
    estado: "ACTIVO",
    refPresupuesto: "PPTO 08B-2026-Demo-Rodaje",
    hitos: [
      { titulo: "Rodaje", tipo: "RODAJE", dias: 1, hasta: 2 },
      { titulo: "Entrega de material a postpo", tipo: "ENTREGA_MATERIAL", dias: 4 },
    ],
    equipo: [
      ["Maca", "Producer", true],
      ["Pablo", "Set", false],
    ],
  },
  {
    code: `${PREFIJO}POSTPO`,
    cliente: "Cliente Demo Directo",
    marca: "Tecnología Demo",
    name: "Serie de piezas sociales",
    productora: "RICORICO",
    director: "Realizador Demo",
    etapa: "POSTPRODUCCION",
    estado: "ACTIVO",
    refPresupuesto: "PPTO 21C-2026-Demo-Postpo",
    hitos: [
      { titulo: "Primera entrega de montaje", tipo: "ENTREGA_MONTAJE", dias: 2 },
      { titulo: "Entrega final a cliente", tipo: "ENTREGA_CLIENTE", dias: 9 },
    ],
    equipo: [
      ["Mikko", "Dirección creativa", true],
      ["Miquel", "Montaje", false],
      ["Lungo", "Grafismo", false],
    ],
  },
  {
    code: `${PREFIJO}CIERRE`,
    cliente: "Agencia Demo",
    marca: "Automoción Demo",
    name: "Spot institucional",
    productora: "JAKIENS",
    director: "Realizador Demo",
    etapa: "CIERRE",
    estado: "ACTIVO",
    refPresupuesto: "PPTO 03D-2026-Demo-Cierre",
    hitos: [{ titulo: "Cierre económico", tipo: "CIERRE_ECONOMICO", dias: 11 }],
    equipo: [
      ["Aina", "Cierre financiero", true],
      ["Chiara", "Producer", false],
    ],
  },
];

async function borrar() {
  const proyectos = await db.project.findMany({ where: { code: { startsWith: PREFIJO } } });
  if (proyectos.length === 0) {
    console.log("No hay proyectos de demostración.");
    return;
  }
  console.log(proyectos.map((p) => `  ${p.code} · ${p.name}`).join("\n"));
  if (!APLICAR) {
    console.log(`\n${proyectos.length} se borrarían. Añade --aplicar.`);
    return;
  }
  // Las fichas y asignaciones caen solas por `onDelete: Cascade`.
  await db.project.deleteMany({ where: { code: { startsWith: PREFIJO } } });
  // Los clientes inventados solo se borran si no le quedan proyectos reales.
  for (const nombre of ["Agencia Demo", "Cliente Demo Directo"]) {
    const c = await db.cliente.findUnique({ where: { nombre }, include: { proyectos: true } });
    if (c && c.proyectos.length === 0) await db.cliente.delete({ where: { id: c.id } });
  }
  console.log(`\n${proyectos.length} proyectos de demostración borrados.`);
}

async function crear() {
  const equipo = await db.staffUser.findMany();
  const idDe = (n: string) => equipo.find((s) => s.name === n)?.id ?? null;

  for (const p of PROYECTOS) {
    console.log(`  ${p.code} · ${p.etapa} · ${p.marca} — ${p.name}`);
    if (!APLICAR) continue;

    const cliente = await db.cliente.upsert({
      where: { nombre: p.cliente },
      create: { nombre: p.cliente, notas: "Cliente de demostración." },
      update: {},
    });

    const proyecto = await db.project.upsert({
      where: { code: p.code },
      update: { etapa: p.etapa, estado: p.estado },
      create: {
        code: p.code,
        client: cliente.nombre,
        clienteId: cliente.id,
        marca: p.marca,
        name: p.name,
        productora: p.productora,
        director: p.director,
        etapa: p.etapa,
        estado: p.estado,
        refPresupuesto: p.refPresupuesto ?? null,
        agencia: "",
        location: "",
        format: "",
        shootLabel: "",
      },
    });

    // Las fases operativas solo existen a partir del GO, igual que en la vida
    // real: un proyecto en venta no tiene sala de producción que abrir.
    if (p.etapa !== "VENTA") {
      await db.phaseState.createMany({
        data: ["equipo", "prepro", "materiales", "altas", "rodaje", "postpro", "cierre"].map((key) => ({
          projectId: proyecto.id,
          key,
          state: key === "equipo" ? "live" : "next",
        })),
        skipDuplicates: true,
      });
    }

    await db.hito.deleteMany({ where: { projectId: proyecto.id } });
    for (const h of p.hitos) {
      await db.hito.create({
        data: {
          projectId: proyecto.id,
          etapa: p.etapa,
          tipo: h.tipo,
          titulo: h.titulo,
          fecha: enDias(h.dias),
          fechaFin: h.hasta ? enDias(h.hasta) : null,
        },
      });
    }

    await db.asignacionEtapa.deleteMany({ where: { projectId: proyecto.id } });
    for (const [nombre, rol, responsable] of p.equipo) {
      const id = idDe(nombre);
      if (!id) {
        console.log(`    (aviso: no existe la cuenta de ${nombre}, se omite)`);
        continue;
      }
      await db.asignacionEtapa.create({
        data: { projectId: proyecto.id, staffUserId: id, etapa: p.etapa, rol, responsable },
      });
    }

    if (p.briefing) {
      await db.documento.deleteMany({ where: { projectId: proyecto.id, tipo: "BRIEFING" } });
      await db.documento.create({
        data: { projectId: proyecto.id, tipo: "BRIEFING", nombre: "Briefing (enlace)", linkUrl: p.briefing },
      });
    }

    if (p.presupuesto) {
      await db.presupuestoVenta.upsert({
        where: { projectId: proyecto.id },
        create: {
          projectId: proyecto.id,
          estado: p.presupuesto.estado,
          notas: p.presupuesto.notas,
          asignadoAId: idDe(p.presupuesto.asignadoA),
        },
        update: { estado: p.presupuesto.estado, notas: p.presupuesto.notas },
      });
    }
  }

  console.log(
    APLICAR
      ? `\n${PROYECTOS.length} proyectos de demostración creados. Para quitarlos:\n  npx tsx --env-file=.env scripts/demo.ts --borrar --aplicar`
      : `\n${PROYECTOS.length} se crearían. Simulación: no se ha escrito nada. Añade --aplicar.`,
  );
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }
  await (BORRAR ? borrar() : crear());
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
