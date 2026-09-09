import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffTier } from "@/lib/access";
import { TopBar } from "@/components/AppShell";
import { STAFF_TIER_LABEL } from "@/lib/phases";
import { cambiarAccesoPresupuestoAction } from "./actions";

/**
 * Quién ve el presupuesto de venta.
 *
 * Es la única pantalla de permisos de la aplicación, y solo cubre este permiso a
 * propósito: el resto se deriva del nivel de cada persona, que se decide al dar
 * de alta la cuenta. Este no, porque no coincide con ningún nivel —Carmen es
 * LOGISTICS y ve costes pero no ventas— y porque cambia con el tiempo.
 */
export default async function EquipoPage() {
  const staff = await requireStaffTier(["FULL"]);
  const equipo = await db.staffUser.findMany({ orderBy: [{ tier: "asc" }, { name: "asc" }] });
  const conAcceso = equipo.filter((p) => p.accesoPresupuestoVenta).length;

  return (
    <div className="shell">
      <TopBar staff={staff} />

      <main>
        <div className="mod-head">
          <div className="htxt">
            <h2>Acceso al presupuesto de venta</h2>
            <p className="lead">
              Quién puede ver y preparar lo que se cotiza al cliente. Es un permiso aparte del nivel
              de cada persona: se ven cosas distintas y no coinciden.
            </p>
          </div>
          <Link href="/gestor" className="btn ghost">
            Volver al tablero
          </Link>
        </div>

        {conAcceso === 0 ? (
          <div className="form-error">
            Ahora mismo no lo ve nadie, así que el desplegable de «prepara el presupuesto» sale
            vacío al abrir una oportunidad. Concédeselo al menos a una persona.
          </div>
        ) : null}

        <div className="panel">
          <div className="phdr">
            <h3>Equipo</h3>
            <span className="tag">
              {conAcceso} de {equipo.length} con acceso
            </span>
          </div>
          {equipo.map((p) => (
            <div className="file" key={p.id}>
              <div className="ic" data-ext={p.accesoPresupuestoVenta ? "SI" : "NO"}></div>
              <div className="fmeta">
                <div className="fn">{p.name}</div>
                <div className="fd">
                  {STAFF_TIER_LABEL[p.tier]} · {p.email}
                </div>
              </div>
              <form action={cambiarAccesoPresupuestoAction}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="conceder" value={p.accesoPresupuestoVenta ? "0" : "1"} />
                <button className={p.accesoPresupuestoVenta ? "btn" : "btn solid"} type="submit">
                  {p.accesoPresupuestoVenta ? "Quitar acceso" : "Dar acceso"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </main>

      <div className="protonote">Gestor de proyectos · Jakiens</div>
    </div>
  );
}
