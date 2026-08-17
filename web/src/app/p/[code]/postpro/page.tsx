import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { AppShell, ModHead, StaffViewerLabel } from "@/components/AppShell";
import { STAFF_PHASE_ACCESS } from "@/lib/phases";
import { addMaterialRequestAction, toggleRequestStatusAction, updateDriveLinkAction } from "./actions";

export default async function PostproPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { project, staff } = await requireStaffAccess(code, "postpro");

  const requests = await db.materialRequest.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell
      project={project}
      basePath={`/p/${project.code}`}
      currentPhase="postpro"
      allowedPhases={STAFF_PHASE_ACCESS[staff.tier]}
      viewerLabel={<StaffViewerLabel staff={staff} />}
    >
      <ModHead
        step="06"
        title="Postproducción"
        lead="Carpeta con todo el material de montaje y el listado de peticiones pendientes al resto del equipo."
      />

      <div className="panel">
        <div className="phdr">
          <h3>Carpeta de Drive</h3>
        </div>
        <div className="kv" style={{ alignItems: "center" }}>
          <span className="k">Enlace</span>
          <span className="v">
            {project.driveFolderUrl ? (
              <a className="btn ghost" href={project.driveFolderUrl} target="_blank" rel="noopener noreferrer">
                Abrir carpeta
              </a>
            ) : (
              "Sin configurar"
            )}
          </span>
        </div>
        <form action={updateDriveLinkAction} className="alta">
          <input type="hidden" name="code" value={code} />
          <div className="fgrid">
            <div className="field full">
              <label htmlFor="driveFolderUrl">Actualizar enlace de Drive</label>
              <input
                id="driveFolderUrl"
                name="driveFolderUrl"
                placeholder="https://drive.google.com/..."
                defaultValue={project.driveFolderUrl ?? ""}
              />
            </div>
          </div>
          <div className="form-foot">
            <span className="hint">Visible para todo el que tenga acceso a esta fase</span>
            <button className="btn solid" type="submit">
              Guardar enlace
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="phdr">
          <h3>Petición de materiales</h3>
          <span className="tag">
            {requests.filter((r) => r.status === "pendiente").length} pendientes
          </span>
        </div>
        {requests.map((r) => (
          <div className="kv" key={r.id} style={{ alignItems: "center" }}>
            <span className="k" style={{ textTransform: "none", fontFamily: "var(--body)", fontSize: 14 }}>
              {r.description}
              {r.requestedBy ? ` · ${r.requestedBy}` : ""}
            </span>
            <span className="v">
              <form action={toggleRequestStatusAction}>
                <input type="hidden" name="code" value={code} />
                <input type="hidden" name="requestId" value={r.id} />
                <button
                  type="submit"
                  className={`status ${r.status === "entregado" ? "ok" : "pend"}`}
                  style={{ cursor: "pointer" }}
                >
                  <span className="s-dot"></span>
                  {r.status === "entregado" ? "Entregado" : "Pendiente"}
                </button>
              </form>
            </span>
          </div>
        ))}
        {requests.length === 0 ? <div className="empty">Sin peticiones todavía.</div> : null}

        <form action={addMaterialRequestAction} className="alta">
          <input type="hidden" name="code" value={code} />
          <div className="fgrid">
            <div className="field full">
              <label htmlFor="description">Nueva petición</label>
              <input
                id="description"
                name="description"
                placeholder="Ej. Audio limpio de cámara B, jornada 2"
                required
              />
            </div>
          </div>
          <div className="form-foot">
            <span className="hint">Se avisa por Slack si el proyecto tiene webhook configurado</span>
            <button className="btn solid" type="submit">
              + Añadir petición
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
