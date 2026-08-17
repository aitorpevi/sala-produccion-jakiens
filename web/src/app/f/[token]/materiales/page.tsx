import { db } from "@/lib/db";
import { requireMemberByToken } from "@/lib/access";
import { AppShell, ModHead } from "@/components/AppShell";
import { PHASES, phaseAllowedForMember } from "@/lib/phases";
import { uploadFromCollaboratorAction } from "./actions";

export default async function CollaboratorMaterialesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const member = await requireMemberByToken(token);
  const allowedPhases = PHASES.map((p) => p.key).filter((k) => phaseAllowedForMember(member, k));

  const materials = await db.material.findMany({
    where: { targets: { some: { projectMemberId: member.id } } },
    select: {
      id: true,
      name: true,
      ext: true,
      sizeLabel: true,
      direction: true,
      fileName: true,
    },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <AppShell
      project={member.project}
      basePath={`/f/${token}`}
      currentPhase="materiales"
      allowedPhases={allowedPhases}
      viewerLabel={
        <>
          <div className="avatar">{member.person.initials}</div>
          <span className="tag">{member.person.name}</span>
        </>
      }
    >
      <ModHead
        step="03"
        title="Materiales"
        lead="Documentos de trabajo disponibles para tu perfil. Descárgalos y sube aquí lo que te toque entregar."
        scope={`Vista de ${member.person.name} · solo tu información`}
      />

      <div className="panel">
        <div className="phdr">
          <h3>Tus documentos</h3>
          <span className="tag">{materials.length} archivos</span>
        </div>
        {materials.map((m) => (
          <div className="file" key={m.id}>
            <div className="ic" data-ext={m.ext}></div>
            <div className="fmeta">
              <div className="fn">{m.name}</div>
              <div className="fd">{m.sizeLabel ?? "—"}</div>
            </div>
            {m.direction === "in" ? (
              m.fileName ? (
                <a className="btn" href={`/api/materiales/${m.id}?token=${token}`}>
                  Descargar
                </a>
              ) : (
                <span className="status pend">
                  <span className="s-dot"></span>Sin subir
                </span>
              )
            ) : m.fileName ? (
              <a className="btn ghost" href={`/api/materiales/${m.id}?token=${token}`}>
                Ver subido
              </a>
            ) : (
              <form action={uploadFromCollaboratorAction}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="materialId" value={m.id} />
                <input type="file" name="file" required style={{ display: "inline-block", marginRight: 8 }} />
                <button className="btn solid" type="submit">
                  Subir
                </button>
              </form>
            )}
          </div>
        ))}
        {materials.length === 0 ? (
          <div className="empty">
            <span className="em-mono">Sin materiales</span>
            Todavía no hay materiales asignados a tu perfil.
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
