import { requireMemberByToken } from "@/lib/access";
import { AppShell, ModHead } from "@/components/AppShell";
import { PHASES, phaseAllowedForMember } from "@/lib/phases";
import { db } from "@/lib/db";
import { etiquetaDepartamento } from "@/lib/necesidades";

const eur = (n: number) => "€" + n.toLocaleString("es-ES");

export default async function CollaboratorPreproPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const member = await requireMemberByToken(token);
  const allowedPhases = PHASES.map((p) => p.key).filter((k) => phaseAllowedForMember(member, k));
  // Solo las necesidades de las que esta persona es responsable. En la práctica
  // eso son los jefes de cada vertical: a un ayudante no le llega nada, que es
  // justo lo que queremos.
  const needs = await db.necesidad.findMany({
    where: { responsableId: member.id, estado: { not: "descartada" } },
    orderBy: [{ departamento: "asc" }, { orden: "asc" }],
  });

  return (
    <AppShell
      project={member.project}
      basePath={`/f/${token}`}
      currentPhase="prepro"
      allowedPhases={allowedPhases}
      viewerLabel={
        <>
          <div className="avatar">{member.person.initials}</div>
          <span className="tag">{member.person.name}</span>
        </>
      }
    >
      <ModHead
        step="02"
        title="Preproducción"
        lead="Tu briefing, las fechas clave del proyecto y lo que necesitamos de ti."
        scope={`Vista de ${member.person.name} · solo tu información`}
      />

      <div className="panel">
        <div className="phdr">
          <h3>Briefing</h3>
          <span className="tag">tu ficha</span>
        </div>
        <div className="body-copy">
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
            {member.role} · {member.person.name}
          </p>
          <p>{member.brief}</p>
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="phdr">
            <h3>Fechas</h3>
          </div>
          <div className="kv">
            <span className="k">Preproducción</span>
            <span className="v mono">14–23 JUL</span>
          </div>
          <div className="kv">
            <span className="k">Rodaje J1 · Estudio</span>
            <span className="v mono">24 JUL</span>
          </div>
          <div className="kv">
            <span className="k">Rodaje J2 · Set gastro</span>
            <span className="v mono">25 JUL</span>
          </div>
          <div className="kv">
            <span className="k">Entrega de material</span>
            <span className="v mono">26 JUL</span>
          </div>
        </div>
        <div className="panel">
          <div className="phdr">
            <h3>Necesidades para tu perfil</h3>
          </div>
          {needs.length ? (
            needs.map((n) => (
              <div className="kv" key={n.id}>
                <span className="k">
                  {n.concepto}
                  <span className="hint"> · {etiquetaDepartamento(n.departamento)}</span>
                </span>
                <span className="v">
                  {n.detalle ?? "—"}
                  {n.estado === "confirmada" ? " · confirmada" : ""}
                </span>
              </div>
            ))
          ) : (
            <div className="empty">Sin necesidades asignadas a tu perfil.</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="phdr">
          <h3>Tu presupuesto</h3>
          <span className="tag">Honorarios netos</span>
        </div>
        <div className="kv">
          <span className="k">Tarifa jornada</span>
          <span className="v mono">{eur(member.rate)}</span>
        </div>
        <div className="kv">
          <span className="k">Jornadas</span>
          <span className="v mono">{member.dias}</span>
        </div>
        <div className="bud-total">
          <span className="lbl">Total honorarios</span>
          <span className="amt">{eur(member.rate * member.dias)}</span>
        </div>
        {member.presupuestoGasto > 0 ? (
          <div className="kv">
            <span className="k">Presupuesto de gasto de tu partida</span>
            <span className="v mono">{eur(member.presupuestoGasto)}</span>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
