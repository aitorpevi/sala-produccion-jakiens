import "server-only";
import ExcelJS from "exceljs";

/**
 * Lee el equipo previsto de un presupuesto aprobado.
 *
 * No hay un formato único: Jakiens y Ricorico usan plantillas distintas, y
 * dentro de Jakiens conviven al menos dos. Lo que sí comparten todas es la
 * FORMA — una columna de concepto, una de cantidad ("Cant" o "Nº"), una de días
 * y secciones numeradas — así que en vez de fijar columnas se localiza la fila
 * de cabecera y se deducen de ahí.
 *
 * Deliberadamente NO decide qué es una persona y qué no. "Material de luz" y
 * "Location scout expenses" también llevan cantidad, y separarlos de un
 * eléctrico con reglas automáticas fallaría en silencio justo cuando importa.
 * Devuelve todo lo que encuentra con una sugerencia, y que producción confirme.
 */

export type LineaPresupuesto = {
  seccion: string | null;
  concepto: string;
  cantidad: number;
  dias: number | null;
  /** Sugerencia, no veredicto: la palabra final la tiene quien revisa. */
  pareceEquipo: boolean;
};

export type LecturaPresupuesto = {
  hoja: string;
  lineas: LineaPresupuesto[];
  aviso: string | null;
};

/** Palabras que delatan una columna de cantidad, comparadas como token suelto. */
const CAB_CANTIDAD = ["cant", "nº", "n°", "num", "cantidad", "uds", "n"];
const CAB_DIAS = ["dia", "dias", "día", "días", "days", "jornadas"];

/**
 * Conceptos que NO son personas aunque lleven cantidad y días. Se usa solo para
 * marcar la sugerencia por defecto; todos siguen apareciendo en la lista.
 */
const NO_ES_PERSONA = [
  "material", "alquiler", "gasto", "dieta", "transporte", "viaje", "seguro",
  "derechos", "buyout", "sala", "localizacion", "localización", "plato", "plató",
  "atrezzo", "vestuario /", "peliculado", "stock", "copia", "musica", "música",
  "furgo", "vehiculo", "vehículo", "alojamiento", "permiso", "tasa", "agency fee",
  "agencia /", "ss /", "gestoria", "gestoría", "expenses", "archivo", "forecast",
  "prevision", "previsión", "suite", "catering", "parking", "peaje", "gasolina",
];

function texto(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const inner = o.result ?? o.text ?? o.richText;
    if (Array.isArray(inner)) return inner.map((r: { text?: string }) => r.text ?? "").join("");
    if (inner !== undefined) return texto(inner);
    return "";
  }
  return String(v).replace(/\s+/g, " ").trim();
}

function numero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = texto(v).replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normaliza(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/** Una sección es una fila tipo "2. RODAJE" o "EQUIPO TECNICO / CREW". */
function esSeccion(valores: string[]) {
  const t = valores.find((v) => v.length > 3);
  if (!t) return null;
  const limpio = t.replace(/^\d+[.)]?\s*/, "").trim();
  // En mayúsculas y sin cifras sueltas: así se distingue de un concepto normal.
  const esMayus = limpio === limpio.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(limpio);
  return esMayus ? limpio : null;
}

function pareceEquipo(concepto: string, seccion: string | null) {
  const c = normaliza(concepto);
  if (NO_ES_PERSONA.some((p) => c.includes(normaliza(p)))) return false;

  const s = seccion ? normaliza(seccion) : "";
  // Si la sección dice claramente que no son personas, no lo son.
  if (/material|transporte|dieta|viaje|seguro|postproduccion|stock|derechos|buyout/.test(s)) {
    return false;
  }
  return true;
}

/**
 * ¿Debajo de esta celda hay números? Es lo que separa una cabecera de cantidad
 * de verdad de un "Nº FACTURA" o de una celda con la letra "N" suelta. Sin esta
 * comprobación, el parser elegía la hoja de tarifas en vez del desglose.
 */
function hayNumerosDebajo(ws: ExcelJS.Worksheet, fila: number, col: number) {
  let numeros = 0;
  const hasta = Math.min(fila + 40, ws.rowCount);
  for (let f = fila + 1; f <= hasta; f++) {
    const n = numero(ws.getRow(f).getCell(col).value);
    if (n !== null && n > 0 && Number.isInteger(n)) numeros++;
    if (numeros >= 3) return true;
  }
  return false;
}

/** Extrae las líneas de datos bajo una cabecera concreta. */
function extraer(
  ws: ExcelJS.Worksheet,
  fila: number,
  colConcepto: number,
  colCant: number,
  colDias: number | null,
): LineaPresupuesto[] {
  const lineas: LineaPresupuesto[] = [];
  let seccion: string | null = null;

  for (let f = fila + 1; f <= ws.rowCount; f++) {
    const row = ws.getRow(f);
    const valores: string[] = [];
    for (let c = 1; c <= Math.min(ws.columnCount, 12); c++) valores.push(texto(row.getCell(c).value));

    const concepto = texto(row.getCell(colConcepto).value);
    const cantidad = numero(row.getCell(colCant).value);

    if (concepto && (cantidad === null || cantidad === 0)) {
      const s = esSeccion(valores);
      if (s) seccion = s;
      continue;
    }

    if (!concepto || cantidad === null || cantidad <= 0) continue;
    // Los porcentajes (el 0,2 de "agency fee") no son cantidades de gente.
    if (!Number.isInteger(cantidad)) continue;

    lineas.push({
      seccion,
      concepto,
      cantidad,
      dias: colDias ? numero(row.getCell(colDias).value) : null,
      pareceEquipo: pareceEquipo(concepto, seccion),
    });
  }

  return lineas;
}

export async function leerPresupuesto(buffer: Buffer): Promise<LecturaPresupuesto> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);

  // Se evalúan TODAS las cabeceras candidatas y gana la que más filas produce.
  // Quedarse con la primera fallaba en los presupuestos de Jakiens, que tienen
  // diez hojas y varias con algo parecido a una columna de cantidad.
  let mejor: { hoja: string; lineas: LineaPresupuesto[] } | null = null;

  for (const ws of wb.worksheets) {
    const limite = Math.min(ws.rowCount, 60);

    for (let f = 1; f <= limite; f++) {
      const fila = ws.getRow(f);
      let colCant: number | null = null;
      let colDias: number | null = null;

      for (let c = 1; c <= Math.min(ws.columnCount, 30); c++) {
        const t = normaliza(texto(fila.getCell(c).value));
        if (t === "" || t.length > 24) continue; // una cabecera es corta

        // Se compara por tokens: "Cant / nº" vale, "PREPRODUCCIÓN / PREPRODUCTION"
        // no. Buscar la palabra dentro de la cadena daba falsos positivos
        // absurdos, porque "preproduccioN /" contiene "n /".
        const tokens = t.split(/[^a-z0-9º°]+/).filter(Boolean);
        if (colCant === null && tokens.some((k) => CAB_CANTIDAD.includes(k)) && hayNumerosDebajo(ws, f, c)) {
          colCant = c;
        }
        if (colDias === null && tokens.some((k) => CAB_DIAS.includes(k))) colDias = c;
      }

      if (colCant === null) continue;

      // Se prueban TODAS las columnas a la izquierda como posible concepto y
      // gana la que más filas produce. Quedarse con la primera que tuviera algo
      // de texto elegía una columna auxiliar y descartaba la buena sin volver.
      for (let c = colCant - 1; c >= 1; c--) {
        const lineas = extraer(ws, f, c, colCant, colDias);
        if (lineas.length === 0) continue;
        if (!mejor || lineas.length > mejor.lineas.length) {
          mejor = { hoja: ws.name, lineas };
        }
      }
    }
  }

  if (!mejor || mejor.lineas.length === 0) {
    return {
      hoja: mejor?.hoja ?? "",
      lineas: [],
      aviso:
        "No he encontrado ninguna tabla de equipo con cantidades. Revisa el archivo o mete los puestos a mano.",
    };
  }

  return { hoja: mejor.hoja, lineas: mejor.lineas, aviso: null };
}
