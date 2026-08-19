import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { AppShell, ModHead, StaffViewerLabel } from "@/components/AppShell";
import { STAFF_PHASE_ACCESS } from "@/lib/phases";
import { guardarAltaAction, recordarAltaAction } from "./actions";
import * as mask from "@/lib/cifrado";
import { registrarAcceso } from "@/lib/auditoria";

/** Campos del directorio que la gestoría necesita sí o sí para dar el alta. */
const OBLIGATORIOS = ["dni", "naf", "iban", "fechaNacimiento", "sexo", "domicilio"] as const;

const ETIQUETA: Record<(typeof OBLIGATORIOS)[number], string> = {
  dni: "DNI",
  naf: "NAF",
  iban: "IBAN",
  fechaNacimiento: "fecha de nacimiento",
  sexo: "sexo",
  domicilio: "domicilio",
};

export default async function AltasPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { project, staff } = await requireStaffAccess(code, "altas");

  const members = await db.projectMember.findMany({
    where: { projectId: project.id, requiereAlta: true },
    include: { person: true, altaLaboral: true },
    orderBy: { role: "asc" },
  });

  const incompletos = members.filter((m) => OBLIGATORIOS.some((campo) => !m.person[campo]));

  // Abrir esta pantalla ya es acceder a los datos fiscales de todo el equipo,
  // aunque salgan enmascarados. Queda registrado.
  await registrarAcceso({
    staffUserId: staff.id,
    staffNombre: staff.name,
    accion: "ver_ficha",
    detalle: `Fase de altas del proyecto ${project.code} (${members.length} personas)`,
  });

  return (
    <AppShell
      project={project}
      basePath={`/p/${project.code}`}
      currentPhase="altas"
      allowedPhases={STAFF_PHASE_ACCESS[staff.tier]}
      viewerLabel={<StaffViewerLabel staff={staff} />}
    >
      <ModHead
        step="04"
        title="Altas laborales"
        lead="Datos de alta en Seguridad Social del equipo. Genera la hoja en el formato que ya usa la gestoría."
      />

      <div className="panel">
        <div className="phdr">
          <h3>Hoja para la gestoría</h3>
          <span className="tag">{members.length} altas</span>
        </div>
        <div className="body-copy">
          {members.length === 0 ? (
            <p>
              Nadie del equipo está marcado como &laquo;requiere alta&raquo;. Se marca en la fase de
              Equipo, en la ficha de cada colaborador.
            </p>
          ) : incompletos.length > 0 ? (
            <p>
              Faltan datos de {incompletos.length}{" "}
              {incompletos.length === 1 ? "persona" : "personas"}. Puedes descargar igualmente, pero
              la hoja saldrá con huecos y la Seguridad Social devuelve las altas incompletas.
            </p>
          ) : (
            <p>Todo el equipo tiene sus datos completos. La hoja sale lista para enviar.</p>
          )}
          <p style={{ marginTop: 10 }}>
            <a className="btn" href={`/api/altas/${project.code}`}>
              Descargar hoja de altas (.xlsx)
            </a>
          </p>
          <p className="hint" style={{ marginTop: 8 }}>
            El envío automático a la gestoría se activará cuando esté configurada la dirección de
            destino. De momento se descarga y se manda a mano.
          </p>
        </div>
      </div>

      {members.map((m) => {
        const faltan = OBLIGATORIOS.filter((campo) => !m.person[campo]);
        const alta = m.altaLaboral;
        const completo = faltan.length === 0;

        return (
          <div className="panel" key={m.id}>
            <div className="phdr">
              <h3>
                {m.person.name} · {m.role}
              </h3>
              {completo ? (
                <span className="status ok">
                  <span className="s-dot"></span>Datos completos
                </span>
              ) : (
                <span className="status pend">
                  <span className="s-dot"></span>Faltan {faltan.length}
                </span>
              )}
            </div>

            <div className="body-copy">
              {completo ? (
                <p className="hint">
                  {mask.dni(m.person.dni)} · NAF {mask.naf(m.person.naf)} ·{" "}
                  {mask.iban(m.person.iban)} · IRPF {m.person.irpf ?? "—"}% · domicilio{" "}
                  {mask.presente(m.person.domicilio)}
                </p>
              ) : (
                <p className="hint">
                  Todavía no consta: {faltan.map((f) => ETIQUETA[f]).join(", ")}.
                </p>
              )}

              <form action={guardarAltaAction} className="fgrid" style={{ marginTop: 12 }}>
                <input type="hidden" name="code" value={project.code} />
                <input type="hidden" name="projectMemberId" value={m.id} />

                <div className="field">
                  <label htmlFor={`tipo-${m.id}`}>Equipo</label>
                  <select id={`tipo-${m.id}`} name="tipoEquipo" defaultValue={m.tipoEquipo}>
                    <option value="tecnico">Técnico (crew)</option>
                    <option value="artistico">Artístico (cast)</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`alta-${m.id}`}>Fecha de alta</label>
                  <input
                    id={`alta-${m.id}`}
                    name="fechaAlta"
                    defaultValue={alta?.fechaAlta ?? ""}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
                <div className="field">
                  <label htmlFor={`baja-${m.id}`}>Fecha de baja</label>
                  <input
                    id={`baja-${m.id}`}
                    name="fechaBaja"
                    defaultValue={alta?.fechaBaja ?? ""}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
                <div className="field">
                  <label htmlFor={`bruto-${m.id}`}>Importe bruto pactado (€)</label>
                  <input
                    id={`bruto-${m.id}`}
                    name="importeBruto"
                    defaultValue={alta?.importeBruto ?? ""}
                    inputMode="numeric"
                  />
                </div>
                <div className="field">
                  <label htmlFor={`sesion-${m.id}`}>Salario por sesión (€) · solo cast</label>
                  <input
                    id={`sesion-${m.id}`}
                    name="salarioSesion"
                    defaultValue={alta?.salarioSesion ?? ""}
                    inputMode="numeric"
                  />
                </div>
                <div className="field">
                  <button className="btn solid" type="submit">
                    Guardar
                  </button>
                </div>
              </form>

              {!completo ? (
                <form action={recordarAltaAction} style={{ marginTop: 10 }}>
                  <input type="hidden" name="code" value={project.code} />
                  <input type="hidden" name="projectMemberId" value={m.id} />
                  <button className="btn" type="submit">
                    Avisar en Slack de que faltan sus datos
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        );
      })}
    </AppShell>
  );
}
