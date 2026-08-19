/**
 * Crea o actualiza las cuentas del equipo interno desde `scripts/equipo.csv`.
 *
 *   npx tsx --env-file=.env scripts/crear-equipo.ts            # ver qué haría
 *   npx tsx --env-file=.env scripts/crear-equipo.ts --aplicar  # hacerlo
 *
 * Sin `--aplicar` no toca nada: enseña el plan y para. Cambiar de golpe quién
 * tiene acceso a qué es de las cosas que conviene leer antes de ejecutar.
 *
 * A quien no tenga cuenta se le crea con una contraseña temporal, que se
 * imprime UNA sola vez al final. Esa lista hay que repartirla y luego cerrar la
 * terminal: no queda guardada en ningún sitio, porque en la base de datos solo
 * va el hash.
 *
 * A quien ya existe se le corrigen nombre y nivel, pero NO se le toca la
 * contraseña: cambiar el nivel de Pablo no debería echar a Pablo de su sesión.
 * Para reiniciar una en concreto está `cambiar-password.ts`.
 *
 * Las cuentas que estén en la base de datos y no en el CSV se listan como
 * sobrantes, pero no se borran solas: borrar accesos es irreversible y decide
 * una persona, no un script.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { StaffTier } from "../src/generated/prisma/enums";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const NIVELES = ["FULL", "LOGISTICS", "POSTPRODUCTION"] as const;
const RUTA_CSV = "scripts/equipo.csv";

/** Contraseña temporal legible pero no adivinable: 4 grupos de 4 caracteres. */
function passwordTemporal() {
  const alfabeto = "abcdefghijkmnpqrstuvwxyz23456789"; // sin l, o, 0, 1
  const bytes = crypto.randomBytes(16);
  const chars = [...bytes].map((b) => alfabeto[b % alfabeto.length]);
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

type Fila = { nombre: string; email: string; nivel: StaffTier; linea: number };

function leerCsv(): { filas: Fila[]; errores: string[] } {
  if (!fs.existsSync(RUTA_CSV)) {
    console.error(`No encuentro ${RUTA_CSV}.`);
    process.exit(1);
  }

  const lineas = fs.readFileSync(RUTA_CSV, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "");
  const errores: string[] = [];
  const filas: Fila[] = [];
  const vistos = new Set<string>();

  lineas.forEach((linea, i) => {
    if (i === 0 && linea.toLowerCase().startsWith("nombre")) return; // cabecera

    const partes = linea.split(",").map((p) => p.trim());
    if (partes.length < 3) {
      errores.push(`Línea ${i + 1}: se esperaban 3 columnas y hay ${partes.length} → "${linea}"`);
      return;
    }

    const [nombre, email, nivel] = partes;
    const correo = email.toLowerCase();

    if (!nombre) errores.push(`Línea ${i + 1}: falta el nombre.`);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
      errores.push(`Línea ${i + 1}: "${email}" no parece un email válido.`);
    }
    if (!NIVELES.includes(nivel as (typeof NIVELES)[number])) {
      errores.push(`Línea ${i + 1}: nivel "${nivel}" no válido. Usa ${NIVELES.join(", ")}.`);
    }
    if (vistos.has(correo)) {
      errores.push(`Línea ${i + 1}: "${correo}" está repetido en el CSV.`);
    }
    vistos.add(correo);

    filas.push({ nombre, email: correo, nivel: nivel as StaffTier, linea: i + 1 });
  });

  return { filas, errores };
}

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  const { filas, errores } = leerCsv();

  if (errores.length) {
    console.error("El CSV tiene problemas:\n");
    for (const e of errores) console.error("  - " + e);
    console.error("\nNo se ha tocado nada. Corrige el archivo y vuelve a lanzarlo.");
    process.exit(1);
  }

  const existentes = await db.staffUser.findMany();
  const porEmail = new Map(existentes.map((u) => [u.email.toLowerCase(), u]));

  const nuevas: Fila[] = [];
  const cambios: { fila: Fila; antes: string }[] = [];
  const igual: Fila[] = [];

  for (const f of filas) {
    const u = porEmail.get(f.email);
    if (!u) {
      nuevas.push(f);
    } else if (u.name !== f.nombre || u.tier !== f.nivel) {
      cambios.push({ fila: f, antes: `${u.name} · ${u.tier}` });
    } else {
      igual.push(f);
    }
  }

  const sobrantes = existentes.filter((u) => !filas.some((f) => f.email === u.email.toLowerCase()));

  console.log(`\n${aplicar ? "APLICANDO" : "SIMULACIÓN — no se va a tocar nada"}\n`);
  console.log(`Cuentas nuevas ......... ${nuevas.length}`);
  for (const f of nuevas) console.log(`   + ${f.nombre} · ${f.email} · ${f.nivel}`);
  console.log(`Cuentas a corregir ..... ${cambios.length}`);
  for (const c of cambios) {
    console.log(`   ~ ${c.fila.email}: ${c.antes}  →  ${c.fila.nombre} · ${c.fila.nivel}`);
  }
  console.log(`Sin cambios ............ ${igual.length}`);
  console.log(`Sobrantes en la BD ..... ${sobrantes.length}`);
  for (const u of sobrantes) console.log(`   ! ${u.name} · ${u.email} · ${u.tier}`);

  if (sobrantes.length) {
    console.log(
      "\n   Las sobrantes NO se borran solas. Si esas cuentas ya no deben tener\n" +
        "   acceso, bórralas a mano: es una decisión que no delego en un script.",
    );
  }

  if (!aplicar) {
    console.log("\nSi el plan es correcto, repite con --aplicar\n");
    await db.$disconnect();
    return;
  }

  const credenciales: { email: string; password: string }[] = [];

  for (const f of nuevas) {
    const password = passwordTemporal();
    await db.staffUser.create({
      data: {
        email: f.email,
        name: f.nombre,
        tier: f.nivel,
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
    credenciales.push({ email: f.email, password });
  }

  for (const c of cambios) {
    await db.staffUser.update({
      where: { email: c.fila.email },
      data: { name: c.fila.nombre, tier: c.fila.nivel },
    });
  }

  console.log(`\nHecho: ${nuevas.length} creadas, ${cambios.length} corregidas.`);

  if (credenciales.length) {
    console.log("\n─────────────────────────────────────────────────────");
    console.log("CONTRASEÑAS TEMPORALES — se muestran una sola vez");
    console.log("─────────────────────────────────────────────────────");
    for (const c of credenciales) console.log(`  ${c.email}  ${c.password}`);
    console.log("─────────────────────────────────────────────────────");
    console.log("Repártelas por un canal privado (no por el canal general de");
    console.log("Slack) y luego cierra esta terminal. No se guardan en ningún");
    console.log("sitio: en la base de datos solo queda el hash.\n");
  }

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
