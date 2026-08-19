/**
 * Cifra los datos personales que quedaron en claro antes de activar el cifrado.
 *
 *   npx tsx --env-file=.env scripts/cifrar-datos-existentes.ts
 *
 * Es idempotente: los valores ya cifrados se detectan por su prefijo y se dejan
 * en paz, así que se puede correr las veces que haga falta.
 *
 * Lee con el cliente extendido (que descifra lo que ya esté cifrado y devuelve
 * tal cual lo que esté en claro) y reescribe con el mismo cliente (que cifra al
 * guardar). El resultado es que todo acaba cifrado, una sola vez.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { cifrar, estaCifrado } from "../src/lib/cifrado";

const CAMPOS = ["dni", "naf", "iban", "domicilio", "fechaNacimiento"] as const;

const crudo = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  if (!process.env.DATOS_PERSONALES_KEY) {
    console.error("Falta DATOS_PERSONALES_KEY. Genérala con: openssl rand -hex 32");
    process.exit(1);
  }

  // Cliente sin la extensión: aquí queremos ver lo que hay literalmente en la
  // base de datos, no la versión descifrada.
  const personas = await crudo.person.findMany();

  let cifradas = 0;
  let yaEstaban = 0;

  for (const p of personas) {
    const cambios: Record<string, string> = {};

    for (const campo of CAMPOS) {
      const v = p[campo];
      if (typeof v === "string" && v !== "" && !estaCifrado(v)) {
        const c = cifrar(v);
        if (c) cambios[campo] = c;
      }
    }

    if (Object.keys(cambios).length === 0) {
      yaEstaban++;
      continue;
    }

    await crudo.person.update({ where: { id: p.id }, data: cambios });
    cifradas++;
  }

  console.log(`\nPersonas cifradas ahora: ${cifradas}`);
  console.log(`Sin cambios (ya cifradas o sin datos): ${yaEstaban}`);
  console.log(`Total en el directorio: ${personas.length}`);

  await crudo.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await crudo.$disconnect();
  process.exit(1);
});
