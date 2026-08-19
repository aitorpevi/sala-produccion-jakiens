/**
 * Cambia la contraseña de una cuenta del equipo interno.
 *
 *   npx tsx --env-file=.env scripts/cambiar-password.ts aitor@jakiens.com
 *
 * La contraseña se teclea cuando el script la pide, no se pasa como argumento:
 * un argumento queda escrito en el historial del terminal y en la lista de
 * procesos, que es un mal sitio para una credencial. Al escribirla no se ve en
 * pantalla, igual que en cualquier login.
 *
 * Guarda un hash de bcrypt, así que ni este script ni nadie puede recuperarla
 * después: si se vuelve a perder, hay que cambiarla otra vez.
 */
import readline from "node:readline";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function pedirOculto(pregunta: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const salida = process.stdout as NodeJS.WriteStream & { muted?: boolean };

    // Se sustituye la escritura del terminal para no ir dibujando la contraseña.
    const escribir = salida.write.bind(salida);
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      escribir(salida.muted ? "" : s);
    };

    rl.question(pregunta, (respuesta) => {
      salida.muted = false;
      escribir("\n");
      rl.close();
      resolve(respuesta);
    });
    salida.muted = true;
  });
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Uso: npx tsx --env-file=.env scripts/cambiar-password.ts <email>");
    process.exit(1);
  }

  const user = await db.staffUser.findUnique({ where: { email } });
  if (!user) {
    const todos = await db.staffUser.findMany({ select: { email: true }, orderBy: { email: "asc" } });
    console.error(`No existe ninguna cuenta con "${email}".`);
    console.error("Cuentas disponibles:\n  " + todos.map((u) => u.email).join("\n  "));
    process.exit(1);
  }

  console.log(`Cambiando la contraseña de ${user.name} (${user.email}, nivel ${user.tier}).\n`);

  const nueva = await pedirOculto("Nueva contraseña: ");
  if (nueva.length < 10) {
    console.error("\nDemasiado corta: mínimo 10 caracteres.");
    process.exit(1);
  }

  const repetida = await pedirOculto("Repítela: ");
  if (nueva !== repetida) {
    console.error("\nNo coinciden. No se ha cambiado nada.");
    process.exit(1);
  }

  await db.staffUser.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(nueva, 10) },
  });

  console.log(`\nListo. Ya puedes entrar en /login con ${user.email}.`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
