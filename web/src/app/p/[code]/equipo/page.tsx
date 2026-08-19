import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { AppShell, ModHead, StaffViewerLabel } from "@/components/AppShell";
import { STAFF_PHASE_ACCESS } from "@/lib/phases";
import { addMemberAction, convocarAction, toggleConfirmedAction, updateSlackWebhookAction } from "./actions";

const ALL_PERMISOS = ["Briefing", "Materiales", "Rodaje", "Cierre"];

export default async function EquipoPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { project, staff } = await requireStaffAccess(code, "equipo");

  const members = await db.projectMember.findMany({
    where: { projectId: project.id },
    include: { person: true },
    orderBy: { rate: "desc" },
  });

  const memberPersonIds = new Set(members.map((m) => m.personId));
  const directory = await db.person.findMany({ orderBy: { name: "asc" } });
  const availableFromDirectory = directory.filter((p) => !memberPersonIds.has(p.id));

  return (
    <AppShell
      project={project}
      basePath={`/p/${project.code}`}
      currentPhase="equipo"
      allowedPhases={STAFF_PHASE_ACCESS[staff.tier]}
      viewerLabel={<StaffViewerLabel staff={staff} />}
    >
      <ModHead
        step="01"
        title="Asignación de equipo"
        lead="Da de alta a cada colaborador por perfil, define sus permisos y envíale la convocatoria por WhatsApp con el enlace a su ficha."
      />

      <div className="panel">
        <div className="phdr">
          <h3>Equipo asignado</h3>
          <span className="tag">
            {members.filter((m) => m.confirmed).length}/{members.length} confirmados
          </span>
        </div>
        <table className="roster">
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Permisos de acceso</th>
              <th>Estado</th>
              <th style={{ textAlign: "right" }}>Convocatoria</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  <div className="person">
                    <div className="avatar">{m.person.initials}</div>
                    <div>
                      <div className="nm">{m.person.name}</div>
                      <div className="rl">{m.role}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="perm">{m.permisos.join(" · ")}</span>
                </td>
                <td>
                  <form action={toggleConfirmedAction}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="memberId" value={m.id} />
                    <button
                      type="submit"
                      className={`status ${m.confirmed ? "ok" : "pend"}`}
                      style={{ cursor: "pointer" }}
                    >
                      <span className="s-dot"></span>
                      {m.confirmed ? "Confirmado" : "Sin responder"}
                    </button>
                  </form>
                </td>
                <td>
                  <div className="row-actions">
                    <form action={convocarAction}>
                      <input type="hidden" name="code" value={code} />
                      <input type="hidden" name="memberId" value={m.id} />
                      <button className="btn" type="submit">
                        {m.confirmed ? "Reenviar" : "Convocar"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty">Todavía no hay colaboradores en este proyecto.</div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="phdr">
          <h3>Añadir colaborador</h3>
        </div>
        <form action={addMemberAction} className="alta">
          <input type="hidden" name="code" value={code} />
          <div className="fgrid">
            <div className="field full">
              <label htmlFor="existingPersonId">Del directorio de colaboradores</label>
              <select id="existingPersonId" name="existingPersonId" defaultValue="">
                <option value="">— Nuevo colaborador (rellenar nombre y teléfono abajo) —</option>
                {availableFromDirectory.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.phone ? ` · ${p.phone}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="name">Nombre y apellidos (si es nuevo)</label>
              <input id="name" name="name" />
            </div>
            <div className="field">
              <label htmlFor="role">Perfil / rol</label>
              <input id="role" name="role" placeholder="Ej. DOP, Food Stylist..." required />
            </div>
            <div className="field">
              <label htmlFor="phone">Teléfono (WhatsApp, si es nuevo)</label>
              <input id="phone" name="phone" placeholder="+34600000000" />
            </div>
            <div className="field">
              <label htmlFor="rate">Tarifa por jornada (€)</label>
              <input id="rate" name="rate" type="number" min={0} defaultValue={0} />
            </div>
            <div className="field">
              <label htmlFor="dias">Jornadas</label>
              <input id="dias" name="dias" type="number" min={1} defaultValue={1} />
            </div>
            <div className="field">
              <label htmlFor="presupuestoGasto">Presupuesto de gasto de la partida (€)</label>
              <input id="presupuestoGasto" name="presupuestoGasto" type="number" min={0} defaultValue={0} />
            </div>
            <div className="field">
              <label>Requiere alta en Seguridad Social</label>
              <input type="checkbox" name="requiereAlta" style={{ width: "auto" }} />
            </div>
            <div className="field">
              <label>Es equipo de casa (Jakiens/Ricorico)</label>
              <input type="checkbox" name="esEquipoCore" style={{ width: "auto" }} />
              <span className="hint">Va en nómina: no se le imputa coste al proyecto</span>
            </div>
            <div className="field full">
              <label>Permisos de acceso</label>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {ALL_PERMISOS.map((p) => (
                  <label
                    key={p}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "var(--body)",
                      fontSize: 14,
                      textTransform: "none",
                      letterSpacing: 0,
                    }}
                  >
                    <input type="checkbox" name={`perm_${p}`} style={{ width: "auto" }} defaultChecked />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="form-foot">
            <span className="hint">El enlace mágico se genera al convocar por primera vez</span>
            <button className="btn solid" type="submit">
              + Añadir colaborador
            </button>
          </div>
        </form>
      </div>

      {staff.tier === "FULL" ? (
        <div className="panel">
          <div className="phdr">
            <h3>Notificaciones a Slack</h3>
            <span className="tag">{project.slackWebhookUrl ? "Conectado" : "Sin conectar"}</span>
          </div>
          <form action={updateSlackWebhookAction} className="alta">
            <input type="hidden" name="code" value={code} />
            <div className="fgrid">
              <div className="field full">
                <label htmlFor="slackWebhookUrl">Webhook del canal del proyecto</label>
                <input
                  id="slackWebhookUrl"
                  name="slackWebhookUrl"
                  placeholder="https://hooks.slack.com/services/..."
                  defaultValue={project.slackWebhookUrl ?? ""}
                />
              </div>
            </div>
            <div className="form-foot">
              <span className="hint">
                Se avisa al canal cuando alguien se confirma, se sube material o hay una petición de postproducción
              </span>
              <button className="btn solid" type="submit">
                Guardar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}
