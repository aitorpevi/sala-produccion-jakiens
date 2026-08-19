import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { cifrar, descifrar } from "@/lib/cifrado";

/**
 * Campos que van cifrados en la base de datos.
 *
 * En `person`, los que identifican a alguien o dan acceso a su dinero: si esa
 * tabla se filtra, lo que se lleve quien la lea tiene que ser ilegible. Fuera
 * quedan a propósito nombre, email y teléfono, que se usan para buscar y
 * ordenar en toda la app y cuyo cifrado rompería esas consultas sin proteger
 * nada (el nombre ya aparece en cada orden de rodaje).
 *
 * En `projectMember`, las restricciones alimentarias: son datos de salud, de
 * categoría especial (art. 9 RGPD), y merecen al menos la misma protección que
 * un IBAN.
 */
const CAMPOS_CIFRADOS = {
  person: ["dni", "naf", "iban", "domicilio", "fechaNacimiento"],
  projectMember: ["restriccionesAlimentarias"],
} as const;

type ModeloCifrado = keyof typeof CAMPOS_CIFRADOS;

function cifrarEntrada<T>(modelo: ModeloCifrado, data: T): T {
  if (!data || typeof data !== "object") return data;
  const salida = { ...(data as Record<string, unknown>) };
  for (const campo of CAMPOS_CIFRADOS[modelo]) {
    const v = salida[campo];
    if (typeof v === "string") {
      salida[campo] = cifrar(v);
    } else if (v && typeof v === "object" && "set" in (v as object)) {
      // Prisma admite { set: valor } como forma larga en los updates.
      const inner = (v as { set?: unknown }).set;
      if (typeof inner === "string") salida[campo] = { set: cifrar(inner) };
    }
  }
  return salida as T;
}

/** Campos calculados que descifran al leer, sea cual sea la consulta. */
function descifradoDe(modelo: ModeloCifrado) {
  return Object.fromEntries(
    CAMPOS_CIFRADOS[modelo].map((campo) => [
      campo,
      {
        needs: { [campo]: true },
        compute: (fila: Record<string, unknown>) => descifrar(fila[campo] as string | null),
      },
    ]),
  );
}

/** Hooks de escritura que cifran antes de tocar la base de datos. */
function cifradoDe(modelo: ModeloCifrado) {
  const c = <T>(data: T) => cifrarEntrada(modelo, data);
  return {
    create({ args, query }: { args: { data: unknown }; query: (a: never) => unknown }) {
      args.data = c(args.data);
      return query(args as never);
    },
    update({ args, query }: { args: { data: unknown }; query: (a: never) => unknown }) {
      args.data = c(args.data);
      return query(args as never);
    },
    updateMany({ args, query }: { args: { data: unknown }; query: (a: never) => unknown }) {
      args.data = c(args.data);
      return query(args as never);
    },
    upsert({
      args,
      query,
    }: {
      args: { create: unknown; update: unknown };
      query: (a: never) => unknown;
    }) {
      args.create = c(args.create);
      args.update = c(args.update);
      return query(args as never);
    },
    createMany({ args, query }: { args: { data: unknown }; query: (a: never) => unknown }) {
      args.data = Array.isArray(args.data) ? args.data.map((f) => c(f)) : c(args.data);
      return query(args as never);
    },
  };
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

  return new PrismaClient({ adapter }).$extends({
    name: "cifrado-datos-personales",

    // Descifrado como campo calculado: se aplica a cualquier consulta que
    // devuelva la fila, venga de donde venga. Así no hay manera de saltárselo
    // por olvido al escribir una consulta nueva.
    result: {
      person: descifradoDe("person") as never,
      projectMember: descifradoDe("projectMember") as never,
    },

    query: {
      person: cifradoDe("person") as never,
      projectMember: cifradoDe("projectMember") as never,
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
