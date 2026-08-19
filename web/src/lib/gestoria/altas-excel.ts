import "server-only";
import path from "node:path";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";

/**
 * Genera la hoja de altas para la gestoría a partir de la plantilla real que
 * Jakiens/Ricorico ya usan (`plantilla-altas.xlsx`), rellenándola en vez de
 * reconstruirla: así conserva formato, celdas combinadas, anchos y la razón
 * social, y la gestoría recibe un archivo idéntico al que lleva años abriendo.
 *
 * Diferencia con el Excel manual: la plantilla original resuelve las columnas
 * de datos personales con VLOOKUP contra la hoja "Índice". Aquí se escriben
 * como valores literales. exceljs no puede guardar el resultado calculado de
 * una fórmula, así que un archivo con VLOOKUPs se ve vacío en cualquier visor
 * que no recalcule al abrir (Google Sheets, previsualizaciones de correo,
 * algunos gestores). Con valores literales el archivo es correcto en todas
 * partes. La hoja "Índice" se rellena igualmente, para que el documento siga
 * teniendo el aspecto y la trazabilidad de siempre.
 */

const PLANTILLA = path.join(process.cwd(), "src/lib/gestoria/plantilla-altas.xlsx");

/** Columnas de la hoja "Índice" (datos empiezan en la fila 2). */
const IDX = { nombre: 1, sexo: 2, nacimiento: 3, dni: 4, naf: 5, categoria: 6, irpf: 7, iban: 8, telefono: 9, email: 10, domicilio: 11 };
const IDX_FILA_1 = 2;

/** Hoja "EQUIPO TÉCNICO" — crew. Cabeceras en la fila 6, datos desde la 7. */
const TEC = { n: 1, nombre: 2, sexo: 3, nacimiento: 4, dni: 5, naf: 6, alta: 7, baja: 8, categoria: 9, importe: 10, irpf: 11, iban: 12, telefono: 13, email: 14, domicilio: 15 };
const TEC_FILA_1 = 7;

/** Hoja "EQUIPO ARTÍSTICO" — cast. Cabeceras en la fila 7, datos desde la 8. */
const ART = { n: 2, nombre: 3, categoria: 4, alta: 5, baja: 6, salarioSesion: 7, importe: 8, irpf: 9, dni: 10, naf: 11, nacimiento: 12, sexo: 13, telefono: 14, email: 15, domicilio: 16 };
const ART_FILA_1 = 8;

/** El Excel muestra la retención con formato de porcentaje, así que espera 0.15, no 15. */
function irpfComoFraccion(irpf: string | null): number | null {
  if (!irpf) return null;
  const n = Number(irpf);
  return Number.isFinite(n) ? n / 100 : null;
}

/**
 * Escribe siempre, incluso cuando el valor es nulo. Omitir los nulos dejaría en
 * pie el VLOOKUP que la plantilla trae escrito en esa celda, y el archivo
 * llegaría a la gestoría con una fórmula a medias donde debería haber un hueco.
 */
function set(hoja: ExcelJS.Worksheet, fila: number, col: number, valor: string | number | null | undefined) {
  hoja.getCell(fila, col).value = valor === undefined || valor === "" ? null : valor;
}

export async function generarExcelAltas(projectCode: string) {
  const project = await db.project.findUnique({
    where: { code: projectCode },
    include: {
      members: {
        where: { requiereAlta: true },
        include: { person: true, altaLaboral: true },
        orderBy: { role: "asc" },
      },
    },
  });

  if (!project) throw new Error(`No existe el proyecto ${projectCode}`);

  const crew = project.members.filter((m) => m.tipoEquipo !== "artistico");
  const cast = project.members.filter((m) => m.tipoEquipo === "artistico");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(PLANTILLA);

  const hIdx = wb.getWorksheet("Índice");
  const hTec = wb.getWorksheet("EQUIPO TÉCNICO");
  const hArt = wb.getWorksheet("EQUIPO ARTÍSTICO");
  if (!hIdx || !hTec || !hArt) throw new Error("La plantilla de altas no tiene las tres hojas esperadas");

  // Cabecera de ambas hojas: proyecto y lugar de realización. La razón social
  // (JAKIENS VIDEO DESIGN SL) es constante — Ricorico da las altas bajo ella
  // también — así que se deja tal cual viene en la plantilla.
  set(hTec, 3, 5, project.name);
  set(hTec, 4, 5, project.location);
  set(hArt, 3, 6, project.name);
  set(hArt, 4, 6, project.location);

  // Hoja "Índice": solo la gente que va en este alta, no el directorio entero.
  // No hay razón para mandar a la gestoría los datos personales de quien no
  // trabaja en este proyecto.
  project.members.forEach((m, i) => {
    const f = IDX_FILA_1 + i;
    const p = m.person;
    set(hIdx, f, IDX.nombre, p.name);
    set(hIdx, f, IDX.sexo, p.sexo);
    set(hIdx, f, IDX.nacimiento, p.fechaNacimiento);
    set(hIdx, f, IDX.dni, p.dni);
    set(hIdx, f, IDX.naf, p.naf);
    set(hIdx, f, IDX.categoria, m.role || p.categoria);
    set(hIdx, f, IDX.irpf, irpfComoFraccion(p.irpf));
    set(hIdx, f, IDX.iban, p.iban);
    set(hIdx, f, IDX.telefono, p.phone);
    set(hIdx, f, IDX.email, p.email);
    set(hIdx, f, IDX.domicilio, p.domicilio);
  });

  crew.forEach((m, i) => {
    const f = TEC_FILA_1 + i;
    const p = m.person;
    const a = m.altaLaboral;
    set(hTec, f, TEC.n, i + 1);
    set(hTec, f, TEC.nombre, p.name);
    set(hTec, f, TEC.sexo, p.sexo);
    set(hTec, f, TEC.nacimiento, p.fechaNacimiento);
    set(hTec, f, TEC.dni, p.dni);
    set(hTec, f, TEC.naf, p.naf);
    set(hTec, f, TEC.alta, a?.fechaAlta ?? null);
    set(hTec, f, TEC.baja, a?.fechaBaja ?? null);
    set(hTec, f, TEC.categoria, m.role || p.categoria);
    set(hTec, f, TEC.importe, a?.importeBruto ?? null);
    set(hTec, f, TEC.irpf, irpfComoFraccion(p.irpf));
    set(hTec, f, TEC.iban, p.iban);
    set(hTec, f, TEC.telefono, p.phone);
    set(hTec, f, TEC.email, p.email);
    set(hTec, f, TEC.domicilio, p.domicilio);
  });

  cast.forEach((m, i) => {
    const f = ART_FILA_1 + i;
    const p = m.person;
    const a = m.altaLaboral;
    set(hArt, f, ART.n, i + 1);
    set(hArt, f, ART.nombre, p.name);
    set(hArt, f, ART.categoria, m.role || p.categoria);
    set(hArt, f, ART.alta, a?.fechaAlta ?? null);
    set(hArt, f, ART.baja, a?.fechaBaja ?? null);
    set(hArt, f, ART.salarioSesion, a?.salarioSesion ?? null);
    set(hArt, f, ART.importe, a?.importeBruto ?? null);
    set(hArt, f, ART.irpf, irpfComoFraccion(p.irpf));
    set(hArt, f, ART.dni, p.dni);
    set(hArt, f, ART.naf, p.naf);
    set(hArt, f, ART.nacimiento, p.fechaNacimiento);
    set(hArt, f, ART.sexo, p.sexo);
    set(hArt, f, ART.telefono, p.phone);
    set(hArt, f, ART.email, p.email);
    set(hArt, f, ART.domicilio, p.domicilio);
  });

  // La plantilla trae los VLOOKUP escritos en las filas 7-21 de EQUIPO TÉCNICO.
  // Como aquí escribimos valores literales, hay que limpiar los que sobren o el
  // archivo llegaría con fórmulas #N/A en las filas sin gente.
  for (let f = TEC_FILA_1 + crew.length; f <= 21; f++) {
    for (const col of Object.values(TEC)) hTec.getCell(f, col).value = null;
  }

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const fileName = `Altas ${project.code} - ${project.name}.xlsx`.replace(/[/\\:*?"<>|]/g, "-");

  return { buffer, fileName, crew: crew.length, cast: cast.length };
}
