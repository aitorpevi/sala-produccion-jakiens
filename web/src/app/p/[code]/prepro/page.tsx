import { db } from "@/lib/db";
import { requireStaffAccess } from "@/lib/access";
import { AppShell, ModHead, StaffViewerLabel } from "@/components/AppShell";
import { STAFF_PHASE_ACCESS } from "@/lib/phases";

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

  const totalHonorarios = members.reduce((s, m) => s + m.rate * m.dias, 0);
  const totalGasto = members.reduce((s, m) => s + m.presupuestoGasto, 0);

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
            <h3>Necesidades del equipo</h3>
          </div>
          <div className="kv">
            <span className="k">Óptica macro</span>
            <span className="v">Confirmada</span>
          </div>
          <div className="kv">
            <span className="k">Dobles de producto</span>
            <span className="v">8 uds/hero</span>
          </div>
          <div className="kv">
            <span className="k">Talent</span>
            <span className="v">2 actores · J2</span>
          </div>
          <div className="kv">
            <span className="k">Catering set</span>
            <span className="v">Pendiente</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="phdr">
          <h3>Presupuesto asignado por perfil</h3>
          <span className="tag">Honorarios + gasto de materiales</span>
        </div>
        {members.map((m) => (
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
        <div className="bud-total">
          <span className="lbl">Total honorarios</span>
          <span className="amt">{eur(totalHonorarios)}</span>
        </div>
        <div className="bud-total">
          <span className="lbl">Total gasto de materiales</span>
          <span className="amt">{eur(totalGasto)}</span>
        </div>
        <div className="bud-total">
          <span className="lbl">Total proyecto</span>
          <span className="amt">{eur(totalHonorarios + totalGasto)}</span>
        </div>
      </div>
    </AppShell>
  );
}
