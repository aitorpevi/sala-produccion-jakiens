import { notFound } from "next/navigation";
import { requireMemberByToken } from "@/lib/access";
import { AppShell, ModHead } from "@/components/AppShell";
import { PHASES, phaseAllowedForMember } from "@/lib/phases";
import { guardarDatosFiscalesAction } from "./actions";

export default async function CollaboratorAltasPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const member = await requireMemberByToken(token);
  if (!phaseAllowedForMember(member, "altas")) notFound();
  const allowedPhases = PHASES.map((p) => p.key).filter((k) => phaseAllowedForMember(member, k));

  const p = member.person;
  const completo =
    !!p.dni && !!p.naf && !!p.iban && !!p.domicilio && !!p.fechaNacimiento && !!p.sexo;

  return (
    <AppShell
      project={member.project}
      basePath={`/f/${token}`}
      currentPhase="altas"
      allowedPhases={allowedPhases}
      viewerLabel={
        <>
          <div className="avatar">{p.initials}</div>
          <span className="tag">{p.name}</span>
        </>
      }
    >
      <ModHead
        step="04"
        title="Tu alta laboral"
        lead="Los datos que necesita la gestoría para darte de alta en Seguridad Social por este rodaje."
        scope={`Vista de ${p.name} · solo tu información`}
      />

      <div className="panel">
        <div className="phdr">
          <h3>Tus datos</h3>
          {completo ? (
            <span className="status ok">
              <span className="s-dot"></span>Completo
            </span>
          ) : (
            <span className="status pend">
              <span className="s-dot"></span>Pendiente
            </span>
          )}
        </div>

        <div className="body-copy">
          <p className="hint">
            Solo hay que rellenarlos una vez: quedan guardados en tu ficha y no volveremos a
            pedírtelos en el siguiente proyecto.
          </p>

          <div className="empty" style={{ marginTop: 12, textAlign: "left" }}>
            <span className="em-mono">Protección de datos</span>
            <p style={{ marginTop: 6 }}>
              Responsable: <strong>Jakiens Video Design SL</strong> (B98733488), C/ Sevilla 25,
              Valencia. <strong>Para qué</strong>: darte de alta en la Seguridad Social y pagarte
              por este rodaje. <strong>Base legal</strong>: la ejecución de tu contrato y nuestras
              obligaciones laborales y fiscales. <strong>Quién los recibe</strong>: nuestra
              gestoría, la Tesorería General de la Seguridad Social y la Agencia Tributaria.{" "}
              <strong>Cuánto los guardamos</strong>: cuatro años desde el fin de la relación, que
              es el plazo de prescripción laboral y fiscal. Puedes ejercer tus derechos de acceso,
              rectificación, supresión, oposición, limitación y portabilidad escribiendo a{" "}
              <strong>aitor@jakiens.com</strong>, y reclamar ante la AEPD si no te atendemos.
            </p>
            <p style={{ marginTop: 6 }}>
              Tu DNI, NAF, IBAN, domicilio y fecha de nacimiento se guardan cifrados y solo los ve
              el equipo de producción. Cada consulta queda registrada.
            </p>
          </div>

          <form action={guardarDatosFiscalesAction} className="fgrid" style={{ marginTop: 14 }}>
            <input type="hidden" name="token" value={token} />

            <div className="field">
              <label htmlFor="dni">DNI o NIE</label>
              <input id="dni" name="dni" defaultValue={p.dni ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="naf">NAF (nº de afiliación a la Seguridad Social)</label>
              <input id="naf" name="naf" defaultValue={p.naf ?? ""} placeholder="12 dígitos" />
            </div>
            <div className="field">
              <label htmlFor="fechaNacimiento">Fecha de nacimiento</label>
              <input
                id="fechaNacimiento"
                name="fechaNacimiento"
                defaultValue={p.fechaNacimiento ?? ""}
                placeholder="dd/mm/aaaa"
              />
            </div>
            <div className="field">
              <label htmlFor="sexo">Sexo</label>
              <select id="sexo" name="sexo" defaultValue={p.sexo ?? ""}>
                <option value="">—</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="iban">IBAN</label>
              <input id="iban" name="iban" defaultValue={p.iban ?? ""} placeholder="ES.." />
            </div>
            <div className="field">
              <label htmlFor="irpf">% de retención de IRPF</label>
              <input id="irpf" name="irpf" defaultValue={p.irpf ?? ""} inputMode="decimal" />
            </div>
            <div className="field">
              <label htmlFor="phone">Teléfono</label>
              <input id="phone" name="phone" defaultValue={p.phone ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" defaultValue={p.email ?? ""} />
            </div>
            <div className="field full">
              <label htmlFor="domicilio">Dirección postal</label>
              <input id="domicilio" name="domicilio" defaultValue={p.domicilio ?? ""} />
            </div>
            <div className="field">
              <button className="btn solid" type="submit">
                Guardar mis datos
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="phdr">
          <h3>Tu contratación en este proyecto</h3>
          <span className="tag">{member.role}</span>
        </div>
        <div className="body-copy">
          <p className="hint">
            Fechas e importe los fija producción. Si algo no cuadra, díselo antes del rodaje.
          </p>
          <p style={{ marginTop: 8 }}>
            Alta: {member.altaLaboral?.fechaAlta ?? "por confirmar"} · Baja:{" "}
            {member.altaLaboral?.fechaBaja ?? "por confirmar"}
            {member.altaLaboral?.importeBruto
              ? ` · Bruto pactado: €${member.altaLaboral.importeBruto.toLocaleString("es-ES")}`
              : ""}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
