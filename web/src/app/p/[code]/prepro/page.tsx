import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { AppShell, ModHead, StaffViewerLabel } from "@/components/AppShell";
import { STAFF_PHASE_ACCESS } from "@/lib/phases";
import { DEPARTAMENTOS, etiquetaDepartamento, calcularCobertura } from "@/lib/necesidades";
import {
  anadirNecesidadAction,
  guardarNecesidadAction,
  borrarNecesidadAction,
  anadirPuestoAction,
  alternarConfirmacionPuestoAction,
  borrarPuestoAction,
} from "./actions";
import { ImportarPresupuesto } from "./ImportarPresupuesto";

const eur = (n: number) => "€" + n.toLocaleString("es-ES");

export default async function PreproPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { project, staff } = await requireStaffAccess(code, "prepro");

  const members = await db.projectMember.findMany({
    where: { projectId: project.id },
    include: { person: true },
    orderBy: { rate: "desc" },
  });

  // El equipo de casa va en nómina: imputarle coste por proyecto falsearía lo
  // que cuesta producirlo. Solo entran colaboradores y subcontratados.
  const conCoste = members.filter((m) => !m.esEquipoCore);
  const core = members.filter((m) => m.esEquipoCore);

  const totalHonorarios = conCoste.reduce((s, m) => s + m.rate * m.dias, 0);
  const totalGasto = conCoste.reduce((s, m) => s + m.presupuestoGasto, 0);

  // El presupuesto solo lo ve quien tiene acceso a contabilidad.
  const veCostes = staff.tier === "FULL";

  const [necesidades, puestos] = await Promise.all([
    db.necesidad.findMany({
      where: { projectId: project.id },
      include: { responsable: { include: { person: true } } },
      orderBy: [{ departamento: "asc" }, { orden: "asc" }],
    }),
    db.puestoPrevisto.findMany({ where: { projectId: project.id }, orderBy: { orden: "asc" } }),
  ]);

  const cobertura = calcularCobertura(puestos, members);
  const incompletos = cobertura.filter((c) => c.faltan > 0 && !c.confirmadoManualmente);

  return (
    <AppShell
      project={project}
      basePath={`/p/${project.code}`}
      currentPhase="prepro"
      allowedPhases={STAFF_PHASE_ACCESS[staff.tier]}
      viewerLabel={<StaffViewerLabel staff={staff} />}
    >
      <ModHead
        step="02"
        title="Preproducción"
        lead="Briefing por perfil, fechas, necesidades y presupuesto asignado a cada colaborador."
      />

      <div className="panel">
        <div className="phdr">
          <h3>Briefing</h3>
          <span className="tag">por perfil</span>
        </div>
        {members.map((m) => (
          <div className="body-copy" key={m.id} style={{ borderBottom: "1px solid var(--hair)" }}>
            <p
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--smoke)",
                marginBottom: 6,
              }}
            >
              {m.role} · {m.person.name}
            </p>
            <p>{m.brief}</p>
          </div>
        ))}
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="phdr">
            <h3>Fechas</h3>
          </div>
          <div className="kv">
            <span className="k">Preproducción</span>
            <span className="v mono">
              {project.preproInicio ?? "—"}
              {project.preproFin ? `–${project.preproFin}` : ""}
            </span>
          </div>
          <div className="kv">
            <span className="k">Rodaje</span>
            <span className="v mono">
              {project.rodajeInicio ?? "—"}
              {project.rodajeFin ? `–${project.rodajeFin}` : ""}
            </span>
          </div>
          <div className="kv">
            <span className="k">Entrega de material</span>
            <span className="v mono">{project.entregaMaterial ?? "—"}</span>
          </div>
          <div className="kv">
            <span className="k">1ª entrega montaje</span>
            <span className="v mono">{project.primeraEntregaMontaje ?? "—"}</span>
          </div>
        </div>
        <div className="panel">
          <div className="phdr">
            <h3>Cobertura de equipo</h3>
            {incompletos.length === 0 ? (
              <span className="status ok">
                <span className="s-dot"></span>Al día
              </span>
            ) : (
              <span className="status pend">
                <span className="s-dot"></span>
                {incompletos.length} sin cerrar
              </span>
            )}
          </div>
          {cobertura.length === 0 ? (
            <div className="empty">
              Sin puestos previstos. Añádelos abajo desde el presupuesto aprobado.
            </div>
          ) : (
            cobertura.map((c) => (
              <div className="kv" key={c.puestoId}>
                <span className="k">{c.rol}</span>
                <span className="v mono">
                  {c.cubiertos}/{c.previstos}
                  {c.faltan > 0
                    ? c.confirmadoManualmente
                      ? " · dado por bueno"
                      : ` · faltan ${c.faltan}`
                    : ""}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {veCostes ? (
        <div className="panel">
          <div className="phdr">
            <h3>Presupuesto asignado por perfil</h3>
            <span className="tag">Colaboradores y subcontratados</span>
          </div>
          {conCoste.map((m) => (
            <div className="kv" key={m.id}>
              <span className="k">
                {m.person.name} · {m.role}
              </span>
              <span className="v mono">
                {eur(m.rate)} × {m.dias}j = {eur(m.rate * m.dias)}
                {m.presupuestoGasto > 0 ? ` + ${eur(m.presupuestoGasto)} gasto` : ""}
              </span>
            </div>
          ))}
          {conCoste.length === 0 ? (
            <div className="empty">Todo el equipo de este proyecto es de casa: sin coste imputado.</div>
          ) : null}

          {core.length > 0 ? (
            <>
              <div className="bud-total" style={{ marginTop: 14 }}>
                <span className="lbl">Equipo de casa · sin coste de proyecto</span>
                <span className="amt">{core.length}</span>
              </div>
              <div className="kv">
                <span className="k">{core.map((m) => m.person.name).join(", ")}</span>
                <span className="v mono">en nómina</span>
              </div>
            </>
          ) : null}

          <div className="bud-total">
            <span className="lbl">Total honorarios</span>
            <span className="amt">{eur(totalHonorarios)}</span>
          </div>
          <div className="bud-total">
            <span className="lbl">Total gasto de materiales</span>
            <span className="amt">{eur(totalGasto)}</span>
          </div>
          <div className="bud-total">
            <span className="lbl">Coste de producción</span>
            <span className="amt">{eur(totalHonorarios + totalGasto)}</span>
          </div>
        </div>
      ) : null}

      <div className="panel">
        <div className="phdr">
          <h3>Necesidades por departamento</h3>
          <span className="tag">{necesidades.length}</span>
        </div>
        <div className="body-copy">
          <p className="hint">
            Cuelgan del departamento, no de la persona: si cambia el jefe de arte, la necesidad
            sigue ahí. Quien tenga una asignada la ve en su acceso.
          </p>

          {DEPARTAMENTOS.map((d) => {
            const delDepto = necesidades.filter((n) => n.departamento === d.clave);
            if (delDepto.length === 0) return null;
            return (
              <div key={d.clave} style={{ marginTop: 18 }}>
                <h4 style={{ marginBottom: 8 }}>{d.etiqueta}</h4>
                {delDepto.map((n) => (
                  <form
                    action={guardarNecesidadAction}
                    className="fgrid"
                    key={n.id}
                    style={{ marginBottom: 12 }}
                  >
                    <input type="hidden" name="code" value={project.code} />
                    <input type="hidden" name="necesidadId" value={n.id} />
                    <div className="field">
                      <label htmlFor={`nc-${n.id}`}>Concepto</label>
                      <input id={`nc-${n.id}`} name="concepto" defaultValue={n.concepto} />
                    </div>
                    <div className="field">
                      <label htmlFor={`nd-${n.id}`}>Detalle</label>
                      <input id={`nd-${n.id}`} name="detalle" defaultValue={n.detalle ?? ""} />
                    </div>
                    <div className="field">
                      <label htmlFor={`nr-${n.id}`}>Responsable</label>
                      <select
                        id={`nr-${n.id}`}
                        name="responsableId"
                        defaultValue={n.responsableId ?? ""}
                      >
                        <option value="">Sin asignar</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.person.name} · {m.role}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor={`ne-${n.id}`}>Estado</label>
                      <select id={`ne-${n.id}`} name="estado" defaultValue={n.estado}>
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="descartada">Descartada</option>
                      </select>
                    </div>
                    <div className="field">
                      <button className="btn" type="submit">
                        Guardar
                      </button>
                    </div>
                    <div className="field">
                      <button
                        className="btn ghost"
                        type="submit"
                        formAction={borrarNecesidadAction}
                      >
                        Quitar
                      </button>
                    </div>
                  </form>
                ))}
              </div>
            );
          })}

          <form action={anadirNecesidadAction} className="fgrid" style={{ marginTop: 18 }}>
            <input type="hidden" name="code" value={project.code} />
            <div className="field">
              <label htmlFor="new-depto">Departamento</label>
              <select id="new-depto" name="departamento" defaultValue="ARTE">
                {DEPARTAMENTOS.map((d) => (
                  <option key={d.clave} value={d.clave}>
                    {d.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="new-concepto">Concepto</label>
              <input id="new-concepto" name="concepto" placeholder="Óptica macro" />
            </div>
            <div className="field">
              <label htmlFor="new-detalle">Detalle</label>
              <input id="new-detalle" name="detalle" placeholder="Reservada en Camaleón" />
            </div>
            <div className="field">
              <label htmlFor="new-resp">Responsable</label>
              <select id="new-resp" name="responsableId" defaultValue="">
                <option value="">Sin asignar</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.person.name} · {m.role}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <button className="btn solid" type="submit">
                Añadir necesidad
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="phdr">
          <h3>Equipo previsto en el presupuesto</h3>
          <span className="tag">{puestos.length} puestos</span>
        </div>
        <div className="body-copy">
          <p className="hint">
            Escribe aquí el equipo que recoge el presupuesto aprobado. La app avisa de lo que falta
            por cerrar, pero no bloquea nada: si sabes que va así, dale a «dar por bueno» y deja de
            avisarte.
          </p>

          {cobertura.map((c) => (
            <div className="file" key={c.puestoId}>
              <div className="fmeta">
                <div className="fn">
                  {c.rol} · {c.cubiertos}/{c.previstos}
                </div>
                <div className="fd">
                  {c.faltan === 0
                    ? "Completo"
                    : c.confirmadoManualmente
                      ? `Faltan ${c.faltan}, dado por bueno`
                      : `Faltan ${c.faltan} por nombrar`}
                  {c.nota ? ` · ${c.nota}` : ""}
                </div>
              </div>
              {c.faltan > 0 ? (
                <form action={alternarConfirmacionPuestoAction}>
                  <input type="hidden" name="code" value={project.code} />
                  <input type="hidden" name="puestoId" value={c.puestoId} />
                  <button className="btn" type="submit">
                    {c.confirmadoManualmente ? "Volver a avisar" : "Dar por bueno"}
                  </button>
                </form>
              ) : null}
              <form action={borrarPuestoAction}>
                <input type="hidden" name="code" value={project.code} />
                <input type="hidden" name="puestoId" value={c.puestoId} />
                <button className="btn ghost" type="submit">
                  Quitar
                </button>
              </form>
            </div>
          ))}

          <div style={{ borderTop: "1px solid var(--hair)", marginTop: 18, paddingTop: 14 }}>
            <h4 style={{ marginBottom: 6 }}>Importar del presupuesto aprobado</h4>
            <ImportarPresupuesto code={project.code} />
          </div>

          <form action={anadirPuestoAction} className="fgrid" style={{ marginTop: 18 }}>
            <input type="hidden" name="code" value={project.code} />
            <div className="field">
              <label htmlFor="new-rol">Puesto</label>
              <input id="new-rol" name="rol" placeholder="Eléctrico" />
            </div>
            <div className="field">
              <label htmlFor="new-cant">Cuántos</label>
              <input id="new-cant" name="cantidad" type="number" min={1} defaultValue={1} />
            </div>
            <div className="field">
              <label htmlFor="new-nota">Nota</label>
              <input id="new-nota" name="nota" placeholder="Solo jornada 2" />
            </div>
            <div className="field">
              <button className="btn solid" type="submit">
                Añadir puesto
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
