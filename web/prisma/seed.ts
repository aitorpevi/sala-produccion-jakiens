import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const PROJECT = {
  code: "CHB-2607",
  client: "The Champions Burger",
  name: "Spot Tour 2026",
  director: "Gabi Martínez",
  agencia: "Directo",
  shootLabel: "24–25 JUL 2026",
  location: "Valencia · Estudio + set gastro",
  format: 'Spot 30" + 6 cápsulas RRSS',
  status: "activo",
  preproInicio: "14 JUL",
  preproFin: "23 JUL",
  rodajeInicio: "24 JUL",
  rodajeFin: "25 JUL",
  entregaMaterial: "26 JUL",
  primeraEntregaMontaje: "04 AGO",
};

const TEAM = [
  {
    id: "gabi",
    name: "Gabi Martínez",
    role: "Realizador",
    initials: "GM",
    phone: "+34600000001",
    rate: 1800,
    dias: 2,
    presupuestoGasto: 0,
    confirmed: true,
    requiereAlta: false,
    permisos: ["Briefing", "Materiales", "Rodaje", "Cierre"],
    brief:
      "Dirección del spot y las 6 cápsulas. Tono: apetitoso, cámara ágil, protagonismo absoluto del producto. Referencias en el tratamiento.",
    call: "07:30",
  },
  {
    id: "dop",
    name: "Lucía Ferrer",
    role: "DOP",
    initials: "LF",
    phone: "+34600000002",
    rate: 900,
    dias: 2,
    presupuestoGasto: 800,
    confirmed: true,
    requiereAlta: true,
    permisos: ["Briefing", "Materiales", "Rodaje", "Cierre"],
    brief:
      "Foto cálida, contraste medio-alto sobre el producto. Óptica macro para el hero de la hamburguesa. Lista de material acordada con cámara.",
    call: "07:00",
  },
  {
    id: "food",
    name: "Marc Oller",
    role: "Food Stylist",
    initials: "MO",
    phone: "+34600000003",
    rate: 500,
    dias: 2,
    presupuestoGasto: 600,
    confirmed: true,
    requiereAlta: true,
    permisos: ["Briefing", "Materiales", "Rodaje", "Cierre"],
    brief:
      "Preparación y styling de 8 hamburguesas hero + planos de ingredientes en caída. Coordinación con atrezzo para dobles de producto.",
    call: "06:30",
  },
  {
    id: "maq",
    name: "Nerea Gil",
    role: "Maquillaje",
    initials: "NG",
    phone: "+34600000004",
    rate: 350,
    dias: 1,
    presupuestoGasto: 150,
    confirmed: false,
    requiereAlta: true,
    permisos: ["Briefing", "Rodaje", "Cierre"],
    brief:
      "Maquillaje natural para 2 actores en set gastro (jornada 2). Retoques en continuidad durante los planos de consumo.",
    call: "08:00",
  },
  {
    id: "vest",
    name: "Iván Ruiz",
    role: "Vestuario / Estilismo",
    initials: "IR",
    phone: "+34600000005",
    rate: 350,
    dias: 1,
    presupuestoGasto: 300,
    confirmed: false,
    requiereAlta: true,
    permisos: ["Briefing", "Materiales", "Rodaje", "Cierre"],
    brief:
      "Estilismo casual-urbano para talent. Paleta que no compita con el producto. Prever cambios por manchas en escenas de mordisco.",
    call: "08:00",
  },
  {
    id: "aux",
    name: "Sara Peris",
    role: "Auxiliar de producción",
    initials: "SP",
    phone: "+34600000006",
    rate: 150,
    dias: 2,
    presupuestoGasto: 0,
    confirmed: true,
    requiereAlta: true,
    permisos: ["Briefing", "Rodaje"],
    brief:
      "Apoyo a producción en set: runner, control de catering, coordinación de accesos y logística de dobles de producto.",
    call: "06:30",
  },
];

const MATERIALS = [
  {
    name: "Dossier de arte — CHB Spot Tour",
    ext: "PDF",
    sizeLabel: "12,4 MB · v3 · Arte",
    direction: "in",
    to: ["gabi", "dop", "food", "vest"],
  },
  {
    name: "Tratamiento de realización",
    ext: "PDF",
    sizeLabel: "8,1 MB · v2 · Gabi Martínez",
    direction: "in",
    to: ["gabi", "dop", "food", "vest"],
  },
  {
    name: "Guion técnico + shotlist",
    ext: "XLSX",
    sizeLabel: "640 KB · v1 · Realización",
    direction: "in",
    to: ["gabi", "dop"],
  },
  {
    name: "Referencias food styling",
    ext: "PDF",
    sizeLabel: "22,0 MB · Moodboard",
    direction: "in",
    to: ["food"],
  },
  {
    name: "Planta de iluminación (borrador)",
    ext: "PDF",
    sizeLabel: "Pendiente de subir por DOP",
    direction: "out",
    to: ["dop"],
  },
];

const STAFF: { name: string; email: string; tier: "FULL" | "LOGISTICS" | "POSTPRODUCTION" }[] = [
  { name: "Javier", email: "javier@jakiens.com", tier: "FULL" },
  { name: "Aina", email: "aina@jakiens.com", tier: "FULL" },
  { name: "Chiara", email: "chiara@jakiens.com", tier: "FULL" },
  { name: "Mikko", email: "mikko@jakiens.com", tier: "FULL" },
  { name: "Aitor", email: "aitor@jakiens.com", tier: "FULL" },
  { name: "Maca", email: "maca@jakiens.com", tier: "FULL" },
  { name: "Pablo", email: "pablo@jakiens.com", tier: "LOGISTICS" },
  { name: "Carmen", email: "carmen@jakiens.com", tier: "LOGISTICS" },
  { name: "Malo", email: "malo@jakiens.com", tier: "POSTPRODUCTION" },
  { name: "Miquel", email: "miquel@jakiens.com", tier: "POSTPRODUCTION" },
  { name: "Lungo", email: "lungo@jakiens.com", tier: "POSTPRODUCTION" },
];

function tempPasswordFor(name: string) {
  return `jakiens-${name.toLowerCase()}-26`;
}

async function main() {
  const staffCredentials: { email: string; password: string }[] = [];

  for (const s of STAFF) {
    const tempPassword = tempPasswordFor(s.name);
    await db.staffUser.upsert({
      where: { email: s.email },
      update: { name: s.name, tier: s.tier },
      create: {
        email: s.email,
        name: s.name,
        tier: s.tier,
        passwordHash: await bcrypt.hash(tempPassword, 10),
      },
    });
    staffCredentials.push({ email: s.email, password: tempPassword });
  }

  const project = await db.project.upsert({
    where: { code: PROJECT.code },
    update: PROJECT,
    create: PROJECT,
  });

  await db.phaseState.createMany({
    data: [
      { projectId: project.id, key: "equipo", state: "done" },
      { projectId: project.id, key: "prepro", state: "done" },
      { projectId: project.id, key: "materiales", state: "live" },
      { projectId: project.id, key: "altas", state: "live" },
      { projectId: project.id, key: "rodaje", state: "next" },
      { projectId: project.id, key: "postpro", state: "next" },
      { projectId: project.id, key: "cierre", state: "next" },
    ],
    skipDuplicates: true,
  });

  const memberIdByTeamId: Record<string, string> = {};

  for (const t of TEAM) {
    const person = await db.person.upsert({
      where: { id: `seed-${t.id}` },
      update: { name: t.name, phone: t.phone, initials: t.initials },
      create: {
        id: `seed-${t.id}`,
        name: t.name,
        phone: t.phone,
        initials: t.initials,
      },
    });

    const member = await db.projectMember.upsert({
      where: { projectId_personId: { projectId: project.id, personId: person.id } },
      update: {
        role: t.role,
        rate: t.rate,
        dias: t.dias,
        presupuestoGasto: t.presupuestoGasto,
        confirmed: t.confirmed,
        requiereAlta: t.requiereAlta,
        permisos: t.permisos,
        callTime: t.call,
        brief: t.brief,
      },
      create: {
        projectId: project.id,
        personId: person.id,
        role: t.role,
        rate: t.rate,
        dias: t.dias,
        presupuestoGasto: t.presupuestoGasto,
        confirmed: t.confirmed,
        requiereAlta: t.requiereAlta,
        permisos: t.permisos,
        callTime: t.call,
        brief: t.brief,
      },
    });
    memberIdByTeamId[t.id] = member.id;
  }

  for (const m of MATERIALS) {
    const existing = await db.material.findFirst({
      where: { projectId: project.id, name: m.name },
    });
    const material =
      existing ??
      (await db.material.create({
        data: {
          projectId: project.id,
          name: m.name,
          ext: m.ext,
          sizeLabel: m.sizeLabel,
          direction: m.direction,
        },
      }));

    for (const teamId of m.to) {
      const projectMemberId = memberIdByTeamId[teamId];
      await db.materialTarget.upsert({
        where: { materialId_projectMemberId: { materialId: material.id, projectMemberId } },
        update: {},
        create: { materialId: material.id, projectMemberId },
      });
    }
  }

  console.log("Seed completado.");
  console.log(`Proyecto: ${project.code}`);
  console.log("Equipo interno (email · password temporal):");
  for (const c of staffCredentials) {
    console.log(`  ${c.email} · ${c.password}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
