/**
 * Dice a qué base estás apuntando y en qué estado está. No escribe nada.
 *
 *   ( set -a && . ./.env.produccion && set +a && npx tsx scripts/comprobar-base.ts )
 *
 * Se hace ANTES de migrar por un motivo concreto: en Prisma es fácil crear una
 * base nueva creyendo que creas una credencial nueva para la de siempre. Las dos
 * conectan sin error, así que sin mirar el contenido no se distinguen — y migrar
 * una base vacía dejaría producción intacta mientras todo parece haber ido bien.
 *
 * La señal que lo resuelve: la base buena tiene equipo y proyectos dentro y
 * lleva 16 migraciones aplicadas de 21; una recién creada está vacía y no lleva
 * ninguna.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Cuenta filas sin que Prisma exija que el modelo exista en el esquema actual. */
async function contar(tabla: string): Promise<number | null> {
  try {
    const r = await db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*)::bigint AS n FROM "${tabla}"`);
    return Number(r[0].n);
  } catch {
    return null; // la tabla todavía no existe en esa base
  }
}

/**
 * Prisma Postgres entrega dos cadenas distintas y NO son intercambiables:
 *
 *   prisma+postgres://accelerate.prisma-data.net/?api_key=...   proxy HTTP
 *   postgres://usuario:clave@host:5432/base                     Postgres directo
 *
 * Las herramientas `prisma` entienden las dos. Este script no: usa el driver de
 * Postgres (`@prisma/adapter-pg`), que abre un socket TCP y con la primera se
 * queda colgado sin decir nada hasta agotar el tiempo de espera. Mejor negarse
 * de entrada que dejar a alguien mirando una terminal parada cinco minutos —
 * que es exactamente lo que pasó el 2026-09-09, y por eso no hubo copia.
 */
function exigirConexionDirecta() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL.");
    process.exit(1);
  }
  if (url.startsWith("prisma+postgres://")) {
    console.error(
      "Esta cadena es la del proxy de Prisma (prisma+postgres://) y este script\n" +
        "necesita una conexión directa (postgres://).\n\n" +
        "En la consola de Prisma, en la misma pantalla donde sacaste esta, hay una\n" +
        "cadena de conexión DIRECTA — la que sirve para psql y para herramientas\n" +
        "externas. Usa esa.",
    );
    process.exit(1);
  }
}

async function main() {
  exigirConexionDirecta();

  // Del string de conexión solo se enseña el host, nunca la clave.
  const host = ((process.env.DATABASE_URL ?? "").match(/@([^/?]+)/)?.[1] ?? "oculto").replace(/:\d+$/, "");
  console.log(`Base: ${host}\n`);

  const filas: [string, number | null][] = [];
  for (const t of ["StaffUser", "Project", "Person", "ProjectMember", "Material", "Senal"]) {
    filas.push([t, await contar(t)]);
  }
  for (const [t, n] of filas) {
    console.log(`  ${t.padEnd(16)} ${n === null ? "— (tabla inexistente)" : n}`);
  }

  try {
    const proyectos = await db.$queryRawUnsafe<{ code: string; client: string }[]>(
      `SELECT "code", "client" FROM "Project" ORDER BY "createdAt" LIMIT 12`,
    );
    console.log(`\nProyectos: ${proyectos.map((p) => `${p.code} (${p.client})`).join(", ") || "ninguno"}`);
  } catch {
    console.log("\nProyectos: no se pudo leer");
  }

  const aplicadas = await contar("_prisma_migrations");
  console.log(`\nMigraciones aplicadas en esta base: ${aplicadas ?? 0} de 21`);

  console.log("\n--- Veredicto ---");
  const staff = filas[0][1] ?? 0;
  const proyectos = filas[1][1] ?? 0;

  if (aplicadas === null || aplicadas === 0) {
    console.log("BASE VACÍA. Esto NO es producción: es una base nueva sin estrenar.");
    console.log("Vuelve a Prisma y saca una credencial de la base que YA existe.");
  } else if (aplicadas === 21) {
    console.log("Ya está migrada del todo. O no es la de producción, o alguien migró antes.");
  } else if (staff > 0 && proyectos > 0 && aplicadas === 16) {
    console.log("CORRECTO: es producción, con datos, y le faltan las 5 migraciones nuevas.");
  } else {
    console.log(`Estado inesperado (${aplicadas} migraciones, ${staff} personas, ${proyectos} proyectos).`);
    console.log("Pásame esta salida antes de seguir.");
  }

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("No se pudo conectar:", e instanceof Error ? e.message : e);
  await db.$disconnect();
  process.exit(1);
});
