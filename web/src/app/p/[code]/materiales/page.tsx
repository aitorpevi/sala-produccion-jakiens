import { db } from "@/lib/db";
import { requireProductionProject } from "@/lib/access";
import { AppShell, ModHead } from "@/components/AppShell";
import { PHASES } from "@/lib/phases";
import { logoutAction } from "@/app/actions";
import { uploadMaterialAction } from "./actions";

export default async function MaterialesPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const project = await requireProductionProject(code);

  const [materials, members] = await Promise.all([
    db.material.findMany({
      where: { projectId: project.id },
      include: { targets: { include: { projectMember: { include: { person: true } } } } },
      orderBy: { uploadedAt: "desc" },
    }),
    db.projectMember.findMany({
      where: { projectId: project.id },
      include: { person: true },
    }),
  ]);

  return (
    <AppShell
      project={project}
      basePath={`/p/${project.code}`}
      currentPhase="materiales"
      allowedPhases={PHASES.map((p) => p.key)}
      viewerLabel={
        <>
          <span className="tag">Producción</span>
          <form action={logoutAction}>
            <button className="btn ghost" type="submit">
              Salir
            </button>
          </form>
        </>
      }
    >
      <ModHead
        step="03"
        title="Materiales"
        lead="Dossier de arte, tratamiento de realización y documentos de trabajo. Controla qué ve cada perfil."
      />

      <div className="panel">
        <div className="phdr">
          <h3>Todos los documentos</h3>
          <span className="tag">{materials.length} archivos</span>
        </div>
        {materials.map((m) => (
          <div className="file" key={m.id}>
            <div className="ic" data-ext={m.ext}></div>
            <div className="fmeta">
              <div className="fn">{m.name}</div>
              <div className="fd">
                {m.sizeLabel ?? "—"} · {m.direction === "in" ? "Para descargar" : "A subir por colaborador"} ·{" "}
                {m.targets.map((t) => t.projectMember.person.name).join(", ") || "sin destinatarios"}
              </div>
            </div>
            {m.filePath ? (
              <a className="btn" href={`/api/materiales/${m.id}`}>
                Descargar
              </a>
            ) : (
              <span className="status pend">
                <span className="s-dot"></span>Pendiente de subir
              </span>
            )}
          </div>
        ))}
        {materials.length === 0 ? <div className="empty">Sin materiales todavía.</div> : null}
      </div>

      <div className="panel">
        <div className="phdr">
          <h3>Subir material nuevo</h3>
        </div>
        <form action={uploadMaterialAction} className="alta">
          <input type="hidden" name="code" value={code} />
          <div className="fgrid">
            <div className="field">
              <label htmlFor="name">Nombre del documento</label>
              <input id="name" name="name" placeholder="Ej. Dossier de arte" />
            </div>
            <div className="field">
              <label htmlFor="file">Archivo</label>
              <input id="file" name="file" type="file" required />
            </div>
            <div className="field full">
              <label>Destinatarios</label>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {members.map((m) => (
                  <label
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "var(--body)",
                      fontSize: 14,
                    }}
                  >
                    <input type="checkbox" name="targetIds" value={m.id} style={{ width: "auto" }} />
                    {m.person.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="form-foot">
            <span className="hint">El destinatario podrá descargarlo desde su ficha</span>
            <button className="btn solid" type="submit">
              Subir material
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
