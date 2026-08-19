import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMemberByToken } from "@/lib/access";
import { AppShell, ModHead } from "@/components/AppShell";
import { PHASES, phaseAllowedForMember } from "@/lib/phases";
import { subirFacturaAction } from "./actions";

const eur = (n: number) => "€" + n.toLocaleString("es-ES");

export default async function CollaboratorCierrePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const member = await requireMemberByToken(token);
  if (!phaseAllowedForMember(member, "cierre")) notFound();
  const allowedPhases = PHASES.map((p) => p.key).filter((k) => phaseAllowedForMember(member, k));

  const factura = await db.invoice.findUnique({ where: { projectMemberId: member.id } });
  const previsto = factura?.amount ?? member.rate * member.dias;
  const recibida = factura?.state === "recibida";

  return (
    <AppShell
      project={member.project}
      basePath={`/f/${token}`}
      currentPhase="cierre"
      allowedPhases={allowedPhases}
      viewerLabel={
        <>
          <div className="avatar">{member.person.initials}</div>
          <span className="tag">{member.person.name}</span>
        </>
      }
    >
      <ModHead
        step="07"
        title="Cierre"
        lead="Tu factura por este proyecto y los gastos que tengas autorizados."
        scope={`Vista de ${member.person.name} · solo tu información`}
      />

      <div className="panel">
        <div className="phdr">
          <h3>Tu factura</h3>
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
        <div className="body-copy">
          <p>
            <strong>{factura?.concept ?? `Honorarios ${member.role}`}</strong>
          </p>
          <p className="hint">
            {member.dias} {member.dias === 1 ? "jornada" : "jornadas"} × {eur(member.rate)} ={" "}
            {eur(previsto)}
            {member.presupuestoGasto > 0
              ? ` · más ${eur(member.presupuestoGasto)} de presupuesto de gasto`
              : ""}
          </p>

          {recibida && factura?.receivedAt ? (
            <>
              <p className="hint" style={{ marginTop: 8 }}>
                La recibimos el {factura.receivedAt.toLocaleDateString("es-ES")}. Si necesitas
                corregirla, sube la nueva y sustituirá a la anterior.
              </p>
              {factura.filePath ? (
                <p style={{ marginTop: 6 }}>
                  <a
                    className="btn ghost"
                    href={`/api/facturas/${member.id}?token=${token}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver la que enviaste
                  </a>
                </p>
              ) : null}
            </>
          ) : null}

          <form action={subirFacturaAction} style={{ marginTop: 14 }}>
            <input type="hidden" name="token" value={token} />
            <div className="fgrid">
              <div className="field">
                <label htmlFor="factura">Tu factura en PDF</label>
                <input id="factura" type="file" name="file" accept=".pdf,application/pdf" required />
              </div>
              <div className="field">
                <button className="btn solid" type="submit">
                  {recibida ? "Sustituir factura" : "Enviar factura"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="phdr">
          <h3>Gastos</h3>
          <span className="tag">OK Ticket</span>
        </div>
        <div className="body-copy">
          <p className="hint">
            Los gastos autorizados se registran en OK Ticket. La conexión con la intranet todavía no
            está activa, así que de momento sigue el circuito de siempre con producción.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
