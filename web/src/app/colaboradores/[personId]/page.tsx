import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffTier } from "@/lib/access";
import { logoutAction } from "@/app/actions";
import { STAFF_TIER_LABEL } from "@/lib/phases";
import { notFound } from "next/navigation";
import { updatePersonAction } from "./actions";
import { registrarAcceso } from "@/lib/auditoria";

export default async function ColaboradorPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const staff = await requireStaffTier(["FULL", "LOGISTICS"]);
  // Los datos fiscales solo los ve el nivel con acceso a contabilidad. Sin esto,
  // LOGISTICS quedaba fuera de la fase de Altas pero llegaba a los mismos DNI e
  // IBAN entrando por aquí.
  const veDatosFiscales = staff.tier === "FULL";
  const { personId } = await params;

  const person = await db.person.findUnique({
    where: { id: personId },
    include: { memberships: { include: { project: true }, orderBy: { id: "desc" } } },
  });
  if (!person) notFound();

  await registrarAcceso({
    staffUserId: staff.id,
    staffNombre: staff.name,
    personId: person.id,
    personNombre: person.name,
    accion: "ver_ficha",
    detalle: veDatosFiscales ? "Ficha con datos fiscales" : "Ficha sin datos fiscales",
  });

  return (
    <div className="shell">
      <header className="top">
        <Link href="/p" className="brand">
          <span className="wordmark">Jakiens</span>
          <span className="sub">Sala de producción</span>
        </Link>
        <div className="viewer">
          <span className="tag">
            {staff.name} · {STAFF_TIER_LABEL[staff.tier]}
          </span>
          <form action={logoutAction}>
            <button className="btn ghost" type="submit">
              Salir
            </button>
          </form>
        </div>
      </header>

      <main>
        <div className="mod-head">
          <div className="htxt">
            <span className="step">Colaboradores</span>
            <h2>{person.name}</h2>
          </div>
          <Link href="/colaboradores" className="btn ghost">
            ← Volver al directorio
          </Link>
        </div>

        <div className="panel">
          <div className="phdr">
            <h3>Contacto y datos fiscales</h3>
            <span className="tag">Compartido entre proyectos</span>
          </div>
          <form action={updatePersonAction} className="alta">
            <input type="hidden" name="personId" value={person.id} />
            <div className="fgrid">
              <div className="field">
                <label htmlFor="name">Nombre y apellidos</label>
                <input id="name" name="name" defaultValue={person.name} required />
              </div>
              <div className="field">
                <label htmlFor="phone">Teléfono</label>
                <input id="phone" name="phone" defaultValue={person.phone ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" defaultValue={person.email ?? ""} />
              </div>
              {veDatosFiscales ? (
                <>
              <div className="field">
                <label htmlFor="dni">DNI / NIE</label>
                <input id="dni" name="dni" defaultValue={person.dni ?? ""} placeholder="00000000-X" />
              </div>
              <div className="field">
                <label htmlFor="naf">Nº afiliación SS (NAF)</label>
                <input id="naf" name="naf" defaultValue={person.naf ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="iban">IBAN</label>
                <input id="iban" name="iban" defaultValue={person.iban ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="irpf">Retención IRPF (%)</label>
                <input id="irpf" name="irpf" defaultValue={person.irpf ?? ""} />
              </div>
              <div className="field full">
                <label htmlFor="domicilio">Domicilio completo</label>
                <input id="domicilio" name="domicilio" defaultValue={person.domicilio ?? ""} />
              </div>
                </>
              ) : (
                <div className="field full">
                  <span className="hint">
                    DNI, NAF, IBAN y domicilio no están disponibles para tu nivel de acceso.
                  </span>
                </div>
              )}
              <div className="field">
                <label htmlFor="okTicketId">ID en OK Ticket (cuando esté conectado)</label>
                <input id="okTicketId" name="okTicketId" defaultValue={person.okTicketId ?? ""} />
              </div>
            </div>
            <div className="form-foot">
              <span className="hint">Estos datos se reutilizan en cualquier proyecto donde participe</span>
              <button className="btn solid" type="submit">
                Guardar
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="phdr">
            <h3>Historial de proyectos</h3>
            <span className="tag">{person.memberships.length}</span>
          </div>
          {person.memberships.map((m) => (
            <div className="kv" key={m.id}>
              <span className="k">
                {m.project.name} · {m.project.code}
              </span>
              <span className="v">{m.role}</span>
            </div>
          ))}
          {person.memberships.length === 0 ? (
            <div className="empty">Todavía no ha participado en ningún proyecto.</div>
          ) : null}
        </div>
      </main>

      <div className="protonote">Sala de producción · Jakiens</div>
    </div>
  );
}
