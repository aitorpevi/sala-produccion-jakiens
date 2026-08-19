/**
 * Reinicia las contraseñas del equipo interno y las muestra una sola vez.
 *
 *   npx tsx --env-file=.env scripts/reiniciar-passwords.ts                    # ver a quién afectaría
 *   npx tsx --env-file=.env scripts/reiniciar-passwords.ts --aplicar          # a todas
 *   npx tsx --env-file=.env scripts/reiniciar-passwords.ts --aplicar a@x.com  # solo a esas
 *
 * Hace falta porque las contraseñas no se pueden recuperar: en la base de datos
 * solo hay un hash de bcrypt. Si alguien pierde la suya, no hay forma de leerla
 * — solo de poner una nueva.
 *
 * La lista que imprime es el único sitio donde existen en claro. Repártela por
 * un canal privado y cierra la terminal después.
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Legible al dictarla por teléfono, pero no adivinable: 4 grupos de 4. */
function passwordTemporal() {
  const alfabeto = "abcdefghijkmnpqrstuvwxyz23456789"; // sin l, o, 0, 1
  const bytes = crypto.randomBytes(16);
  const chars = [...bytes].map((b) => alfabeto[b % alfabeto.length]);
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

async function main() {
  const args = process.argv.slice(2);
  const aplicar = args.includes("--aplicar");
  const emails = args.filter((a) => !a.startsWith("--")).map((a) => a.toLowerCase());

  const usuarios = await db.staffUser.findMany({
    where: emails.length ? { email: { in: emails } } : {},
    orderBy: [{ tier: "asc" }, { name: "asc" }],
  });

  if (usuarios.length === 0) {
    console.error("Ninguna cuenta coincide. Revisa los emails.");
    process.exit(1);
  }

  if (emails.length) {
    const noEncontrados = emails.filter((e) => !usuarios.some((u) => u.email.toLowerCase() === e));
    for (const e of noEncontrados) console.error(`  Aviso: "${e}" no existe, se ignora.`);
  }

  if (!aplicar) {
    console.log(`\nSIMULACIÓN — no se va a tocar nada\n`);
    console.log(`Se reiniciaría la contraseña de ${usuarios.length} cuenta(s):\n`);
    for (const u of usuarios) console.log(`   ${u.name} · ${u.email} · ${u.tier}`);
    console.log(`\nSi es correcto, repite con --aplicar\n`);
    await db.$disconnect();
    return;
  }

  const credenciales: { email: string; nombre: string; password: string }[] = [];

  for (const u of usuarios) {
    const password = passwordTemporal();
    await db.staffUser.update({
      where: { id: u.id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    credenciales.push({ email: u.email, nombre: u.name, password });
  }

  const ancho = Math.max(...credenciales.map((c) => c.email.length));

  console.log("\n──────────────────────────────────────────────────────────");
  console.log(" CONTRASEÑAS NUEVAS — se muestran una sola vez");
  console.log("──────────────────────────────────────────────────────────");
  for (const c of credenciales) {
    console.log(`  ${c.email.padEnd(ancho)}  ${c.password}   (${c.nombre})`);
  }
  console.log("──────────────────────────────────────────────────────────");
  console.log(` ${credenciales.length} cuenta(s) actualizadas.`);
  console.log("");
  console.log(" Guárdalas en el gestor de contraseñas y repártelas por un");
  console.log(" canal privado — no por el canal general de Slack. Después,");
  console.log(" cierra esta terminal: no quedan guardadas en ningún sitio.");
  console.log("");

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
