/**
 * Importa el directorio de colaboradores desde la hoja "Índice" del Excel de
 * altas que Jakiens/Ricorico usan hoy con la gestoría.
 *
 *   npx tsx scripts/importar-indice.ts "ruta/al/(P) ALTAS CREW & CAST ... .xlsx"
 *
 * Los datos de origen vienen escritos a mano durante años, así que llegan
 * sucios: NAF en tres formatos distintos, IBAN con espacios y espacios duros,
 * emails con saltos de línea, teléfonos unas veces número y otras texto. Aquí
 * se normalizan; lo que no se puede arreglar con seguridad se reporta al final
 * en vez de guardarse mal.
 *
 * Es idempotente: se puede correr varias veces. Empareja por DNI cuando existe
 * (la clave fiable) y por nombre normalizado cuando no.
 */
import ExcelJS from "exceljs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Columnas de la hoja "Índice", en su orden real. */
const COL = {
  nombre: 1,
  sexo: 2,
  nacimiento: 3,
  dni: 4,
  naf: 5,
  categoria: 6,
  irpf: 7,
  iban: 8,
  telefono: 9,
  email: 10,
  domicilio: 11,
} as const;

const avisos: string[] = [];

function texto(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  // Una celda con fórmula llega como { result } o { text }; una con hipervínculo
  // como { text, hyperlink }.
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const inner = o.result ?? o.text ?? o.richText;
    if (Array.isArray(inner)) {
      return texto(inner.map((r: { text?: string }) => r.text ?? "").join(""));
    }
    if (inner !== undefined) return texto(inner);
    return null;
  }
  const s = String(v).replace(/ /g, " ").replace(/\s+/g, " ").trim();
  return s === "" ? null : s;
}

function normNombre(v: unknown): string | null {
  const s = texto(v);
  return s ? s.replace(/\s+/g, " ").trim() : null;
}

/** Clave de comparación: sin tildes, sin dobles espacios, en minúsculas. */
function clave(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normSexo(v: unknown, quien: string): string | null {
  const s = texto(v);
  if (!s) return null;
  const c = s.trim().toUpperCase().charAt(0);
  if (c === "M" || c === "H") return "M"; // M(asculino) / H(ombre)
  if (c === "F") return "F";
  avisos.push(`${quien}: sexo no reconocido ("${s}")`);
  return null;
}

function normFecha(v: unknown, quien: string): string | null {
  if (v instanceof Date) {
    const d = String(v.getUTCDate()).padStart(2, "0");
    const m = String(v.getUTCMonth() + 1).padStart(2, "0");
    return `${d}/${m}/${v.getUTCFullYear()}`;
  }
  const s = texto(v);
  if (!s) return null;
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(s)) return s.replace(/-/g, "/");
  avisos.push(`${quien}: fecha de nacimiento en formato no reconocido ("${s}")`);
  return s;
}

function normDni(v: unknown, quien: string): string | null {
  const s = texto(v);
  if (!s) return null;
  const limpio = s.replace(/[\s-]/g, "").toUpperCase();
  // DNI: 8 dígitos + letra. NIE: X/Y/Z + 7 dígitos + letra.
  if (!/^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/.test(limpio)) {
    avisos.push(`${quien}: DNI/NIE con formato raro ("${s}") — guardado tal cual, revisar`);
  }
  return limpio;
}

function normNaf(v: unknown, quien: string): string | null {
  const s = texto(v);
  if (!s) return null;
  // Llega como 46/10643465/83, 46-1119057314, 46 1133075834 o 461011258533.
  // El NAF real son 12 dígitos: 2 de provincia + 8 de secuencia + 2 de control.
  const digitos = s.replace(/\D/g, "");
  if (digitos.length !== 12) {
    avisos.push(`${quien}: NAF con ${digitos.length} dígitos en vez de 12 ("${s}") — revisar`);
    return digitos || null;
  }
  return digitos;
}

function normIban(v: unknown, quien: string): string | null {
  const s = texto(v);
  if (!s) return null;
  const limpio = s.replace(/[\s /]/g, "").toUpperCase();
  if (!/^ES\d{22}$/.test(limpio)) {
    avisos.push(`${quien}: IBAN no parece un IBAN español válido ("${s}") — revisar`);
  }
  return limpio;
}

/** El Excel guarda la retención como fracción (0.15). Se almacena como "15". */
function normIrpf(v: unknown, quien: string): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace("%", "").replace(",", "."));
  if (!Number.isFinite(n)) {
    avisos.push(`${quien}: % de retención ilegible ("${String(v)}")`);
    return null;
  }
  const pct = n <= 1 ? n * 100 : n;
  return String(Math.round(pct * 100) / 100);
}

function normTelefono(v: unknown): string | null {
  const s = texto(v);
  return s ? s.replace(/[\s.]/g, "") : null;
}

function normEmail(v: unknown, quien: string): string | null {
  const s = texto(v);
  if (!s) return null;
  const limpio = s.replace(/\s/g, "").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpio)) {
    avisos.push(`${quien}: email con formato raro ("${s}") — revisar`);
  }
  return limpio;
}

function iniciales(nombre: string): string {
  const partes = nombre.split(" ").filter(Boolean);
  if (partes.length === 0) return "??";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

async function main() {
  const ruta = process.argv[2];
  if (!ruta) {
    console.error('Uso: npx tsx scripts/importar-indice.ts "ruta/al/excel.xlsx"');
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ruta);
  const hoja = wb.getWorksheet("Índice");
  if (!hoja) {
    console.error('No encuentro la hoja "Índice" en ese archivo.');
    process.exit(1);
  }

  let creados = 0;
  let actualizados = 0;
  let saltados = 0;
  const vistos = new Map<string, string>(); // clave -> nombre, para detectar duplicados

  // El directorio entero cabe de sobra en memoria, así que se carga una vez en
  // vez de lanzar una consulta por cada fila del Excel.
  const existentes = await db.person.findMany({ select: { id: true, name: true, dni: true } });
  const porDni = new Map(existentes.filter((p) => p.dni).map((p) => [p.dni as string, p]));
  const porNombre = new Map(existentes.map((p) => [clave(p.name), p]));

  for (let n = 2; n <= hoja.rowCount; n++) {
    const fila = hoja.getRow(n);
    const nombre = normNombre(fila.getCell(COL.nombre).value);
    if (!nombre) continue;

    const quien = `fila ${n} (${nombre})`;
    const k = clave(nombre);
    if (vistos.has(k)) {
      avisos.push(`${quien}: duplicado de "${vistos.get(k)}" — se salta`);
      saltados++;
      continue;
    }
    vistos.set(k, nombre);

    const datos = {
      name: nombre,
      sexo: normSexo(fila.getCell(COL.sexo).value, quien),
      fechaNacimiento: normFecha(fila.getCell(COL.nacimiento).value, quien),
      dni: normDni(fila.getCell(COL.dni).value, quien),
      naf: normNaf(fila.getCell(COL.naf).value, quien),
      categoria: texto(fila.getCell(COL.categoria).value),
      irpf: normIrpf(fila.getCell(COL.irpf).value, quien),
      iban: normIban(fila.getCell(COL.iban).value, quien),
      phone: normTelefono(fila.getCell(COL.telefono).value),
      email: normEmail(fila.getCell(COL.email).value, quien),
      domicilio: texto(fila.getCell(COL.domicilio).value),
      initials: iniciales(nombre),
    };

    // Emparejar por DNI cuando lo hay (la clave fiable); si no, por nombre.
    const existente = (datos.dni ? porDni.get(datos.dni) : undefined) ?? porNombre.get(k);

    if (existente) {
      await db.person.update({ where: { id: existente.id }, data: datos });
      actualizados++;
    } else {
      const creado = await db.person.create({ data: datos });
      if (datos.dni) porDni.set(datos.dni, creado);
      porNombre.set(k, creado);
      creados++;
    }
  }

  console.log(`\nCreados: ${creados}  ·  Actualizados: ${actualizados}  ·  Saltados: ${saltados}`);

  if (avisos.length) {
    console.log(`\n${avisos.length} dato(s) que conviene revisar a mano:\n`);
    for (const a of avisos) console.log("  - " + a);
  } else {
    console.log("\nSin incidencias: todos los datos se normalizaron limpiamente.");
  }

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
