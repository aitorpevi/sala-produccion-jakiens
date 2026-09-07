/**
 * Vuelca toda la base de datos a un JSON con fecha, antes de tocar el esquema.
 *
 *   npx tsx --env-file=.env.produccion scripts/copia-seguridad.ts
 *
 * Existe porque una migración que borra columnas no se puede deshacer: si
 * `migrate deploy` falla a mitad, Postgres no lo revierte, y lo que se llevó por
 * delante no vuelve. Esto no sustituye a una copia del proveedor —no guarda
 * índices ni secuencias— pero sí garantiza que los DATOS se pueden reconstruir.
 *
 * Los datos personales salen **descifrados**, porque el cliente de Prisma los
 * descifra al leer. Eso convierte el archivo en un volcado de DNI, IBAN y
 * domicilios del equipo: guárdalo como guardarías eso, y bórralo cuando la
 * migración esté confirmada. El script avisa por pantalla.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * Se listan a mano y no por introspección: así, cuando alguien añada un modelo
 * nuevo y se olvide de meterlo aquí, la copia estará incompleta de forma
 * visible en el diff, en vez de silenciosamente.
 */
const TABLAS = [
  "staffUser", "cliente", "project", "phaseState", "hito", "asignacionEtapa",
  "presupuestoVenta", "documento", "aviso", "person", "projectMember",
  "accessToken", "clientAccess", "material", "materialTarget", "altaLaboral",
  "necesidad", "puestoPrevisto", "callSheetDay", "localizacion", "traslado",
  "callTime", "scheduleItem", "materialRequest", "invoice", "expense",
  "accesoDatosPersonales", "senal", "temaSeguido", "pasadaIngesta",
] as const;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL. Usa --env-file=.env.produccion");
    process.exit(1);
  }

  const salida: Record<string, unknown[]> = {};
  let total = 0;

  for (const tabla of TABLAS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelo = (db as any)[tabla];
    if (!modelo?.findMany) {
      console.error(`  ! ${tabla}: no existe en el cliente, se omite`);
      continue;
    }
    const filas = await modelo.findMany();
    salida[tabla] = filas;
    total += filas.length;
    console.log(`  ${tabla}: ${filas.length}`);
  }

  const nombre = `copia-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const destino = path.join(process.cwd(), "copias", nombre);
  fs.mkdirSync(path.dirname(destino), { recursive: true });

  // `Bytes` y `Date` no son JSON. Los bytes se guardan en base64 con marca para
  // poder distinguirlos de una cadena normal al restaurar.
  fs.writeFileSync(
    destino,
    JSON.stringify(
      salida,
      (_k, v) => {
        if (v instanceof Date) return v.toISOString();
        if (v instanceof Uint8Array) return { __bytes: Buffer.from(v).toString("base64") };
        if (typeof v === "bigint") return v.toString();
        return v;
      },
      1,
    ),
  );

  console.log(`\n${total} filas guardadas en copias/${nombre}`);
  console.log(
    "\nAVISO: este archivo lleva DNI, IBAN y domicilios del equipo EN CLARO.\n" +
      "Guárdalo como guardarías eso y bórralo cuando la migración esté confirmada.",
  );

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
