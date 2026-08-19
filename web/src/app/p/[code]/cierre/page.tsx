import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { AppShell, ModHead, StaffViewerLabel } from "@/components/AppShell";
import { STAFF_PHASE_ACCESS } from "@/lib/phases";
import { guardarFacturaAction, anadirGastoAction, borrarGastoAction } from "./actions";

const eur = (n: number) => "€" + n.toLocaleString("es-ES");

export default async function CierrePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { project, staff } = await requireStaffAccess(code, "cierre");

  const [miembros, gastos] = await Promise.all([
    db.projectMember.findMany({
      where: { projectId: project.id },
      include: { person: true, invoice: true },
      orderBy: { role: "asc" },
    }),
    db.expense.findMany({ where: { projectId: project.id }, orderBy: { syncedAt: "desc" } }),
  ]);

  const totalHonorarios = miembros.reduce((t, m) => t + (m.invoice?.amount ?? m.rate * m.dias), 0);
  const totalRecibido = miembros.reduce(
    (t, m) => t + (m.invoice?.state === "recibida" ? m.invoice.amount : 0),
    0,
  );
  const totalGastos = gastos.reduce((t, g) => t + g.amount, 0);
  const pendientes = miembros.filter((m) => m.invoice?.state !== "recibida");

  return (
    <AppShell
      project={project}
      basePath={`/p/${project.code}`}
      currentPhase="cierre"
      allowedPhases={STAFF_PHASE_ACCESS[staff.tier]}
      viewerLabel={<StaffViewerLabel staff={staff} />}
    >
      <ModHead
        step="07"
        title="Cierre"
        lead="Facturas del equipo y gastos de producción: el coste real del proyecto."
      />

      <div className="panel">
        <div className="phdr">
          <h3>Resumen</h3>
          <span className="tag">{project.code}</span>
        </div>
        <div className="body-copy">
          <p>
            Honorarios previstos: <strong>{eur(totalHonorarios)}</strong>
          </p>
          <p>
            Facturas recibidas: <strong>{eur(totalRecibido)}</strong>
            {pendientes.length > 0 ? (
              <span className="hint">
                {" · faltan "}
                {pendientes.length} {pendientes.length === 1 ? "factura" : "facturas"}
              </span>
            ) : null}
          </p>
          <p>
            Gastos de producción: <strong>{eur(totalGastos)}</strong>
          </p>
          <p style={{ marginTop: 10 }}>
            Coste total del proyecto: <strong>{eur(totalHonorarios + totalGastos)}</strong>
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="phdr">
          <h3>Facturas del equipo</h3>
          <span className="tag">{miembros.length}</span>
        </div>
        <div className="body-copy">
          {miembros.length === 0 ? <p className="hint">Sin equipo todavía.</p> : null}
          {miembros.map((m) => {
            const inv = m.invoice;
            const recibida = inv?.state === "recibida";
            return (
              <div key={m.id} style={{ marginTop: 18 }}>
                <div className="phdr" style={{ padding: 0, marginBottom: 8 }}>
                  <h3 style={{ fontSize: 15 }}>
                    {m.person.name} · {m.role}
                  </h3>
                  {recibida ? (
                    <span className="status ok">
                      <span className="s-dot"></span>Recibida
                    </span>
                  ) : (
                    <span className="status pend">
                      <span className="s-dot"></span>Pendiente
                    </span>
                  )}
                </div>

                <form action={guardarFacturaAction} className="fgrid">
                  <input type="hidden" name="code" value={project.code} />
                  <input type="hidden" name="projectMemberId" value={m.id} />
                  <div className="field">
                    <label htmlFor={`con-${m.id}`}>Concepto</label>
                    <input
                      id={`con-${m.id}`}
                      name="concept"
                      defaultValue={inv?.concept ?? `Honorarios ${m.role}`}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`imp-${m.id}`}>Importe (€)</label>
                    <input
                      id={`imp-${m.id}`}
                      name="amount"
                      defaultValue={inv?.amount ?? m.rate * m.dias}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`est-${m.id}`}>Estado</label>
                    <select id={`est-${m.id}`} name="state" defaultValue={inv?.state ?? "pendiente"}>
                      <option value="pendiente">Pendiente</option>
                      <option value="recibida">Recibida</option>
                    </select>
                  </div>
                  <div className="field">
                    <button className="btn" type="submit">
                      Guardar
                    </button>
                  </div>
                </form>

                {inv?.filePath ? (
                  <p style={{ marginTop: 8 }}>
                    <a
                      className="btn ghost"
                      href={`/api/facturas/${m.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver su factura
                    </a>
                  </p>
                ) : (
                  <p className="hint" style={{ marginTop: 6 }}>
                    Todavía no ha subido el PDF desde su acceso.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="phdr">
          <h3>Gastos de producción</h3>
          <span className="tag">{eur(totalGastos)}</span>
        </div>
        <div className="body-copy">
          <p className="hint">
            Cuando OK Ticket esté conectado, sus gastos entrarán aquí solos. Los que añadas a mano
            quedan marcados como manuales para poder distinguirlos y no duplicarlos.
          </p>

          {gastos.map((g) => (
            <div className="file" key={g.id}>
              <div className="fmeta">
                <div className="fn">
                  {g.concept} · {eur(g.amount)}
                </div>
                <div className="fd">{g.source === "manual" ? "Añadido a mano" : "OK Ticket"}</div>
              </div>
              <form action={borrarGastoAction}>
                <input type="hidden" name="code" value={project.code} />
                <input type="hidden" name="expenseId" value={g.id} />
                <button className="btn ghost" type="submit">
                  Quitar
                </button>
              </form>
            </div>
          ))}

          <form action={anadirGastoAction} className="fgrid" style={{ marginTop: 12 }}>
            <input type="hidden" name="code" value={project.code} />
            <div className="field">
              <label htmlFor="gasto-con">Concepto</label>
              <input id="gasto-con" name="concept" placeholder="Alquiler de óptica macro" />
            </div>
            <div className="field">
              <label htmlFor="gasto-imp">Importe (€)</label>
              <input id="gasto-imp" name="amount" inputMode="numeric" />
            </div>
            <div className="field">
              <button className="btn" type="submit">
                Añadir gasto
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
