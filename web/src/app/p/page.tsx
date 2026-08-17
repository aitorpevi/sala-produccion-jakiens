import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { logoutAction } from "@/app/actions";
import { firstAllowedPhaseForStaff, STAFF_TIER_LABEL } from "@/lib/phases";

export default async function ProyectosPage() {
  const staff = await requireStaff();
  const landingPhase = firstAllowedPhaseForStaff(staff.tier);

  const projects = await db.project.findMany({ orderBy: { createdAt: "desc" } });
  const activos = projects.filter((p) => p.status !== "cerrado");
  const cerrados = projects.filter((p) => p.status === "cerrado");

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
            <span className="step">Proyectos</span>
            <h2>Proyectos activos</h2>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {staff.tier === "FULL" || staff.tier === "LOGISTICS" ? (
              <Link href="/colaboradores" className="btn ghost">
                Colaboradores
              </Link>
            ) : null}
            {staff.tier === "FULL" ? (
              <Link href="/p/nuevo" className="btn solid">
                + Nuevo proyecto
              </Link>
            ) : null}
          </div>
        </div>

        <div className="panel">
          {activos.map((p) => (
            <div className="file" key={p.id}>
              <div className="ic" data-ext={p.code.split("-")[0]?.slice(0, 4) ?? "PRJ"}></div>
              <div className="fmeta">
                <div className="fn">{p.name}</div>
                <div className="fd">
                  {p.client} · {p.code} · {p.shootLabel}
                </div>
              </div>
              <Link className="btn" href={`/p/${p.code}/${landingPhase}`}>
                Entrar
              </Link>
            </div>
          ))}
          {activos.length === 0 ? (
            <div className="empty">
              <span className="em-mono">Sin proyectos activos</span>
              {staff.tier === "FULL" ? "Crea el primero con el botón de arriba." : "Todavía no hay ningún proyecto asignado."}
            </div>
          ) : null}
        </div>

        {cerrados.length > 0 ? (
          <div className="panel">
            <div className="phdr">
              <h3>Proyectos cerrados</h3>
              <span className="tag">{cerrados.length}</span>
            </div>
            {cerrados.map((p) => (
              <div className="file" key={p.id}>
                <div className="ic" data-ext="OK"></div>
                <div className="fmeta">
                  <div className="fn">{p.name}</div>
                  <div className="fd">
                    {p.client} · {p.code}
                  </div>
                </div>
                <Link className="btn ghost" href={`/p/${p.code}/${landingPhase}`}>
                  Ver
                </Link>
              </div>
            ))}
          </div>
        ) : null}
      </main>

      <div className="protonote">Sala de producción · Jakiens</div>
    </div>
  );
}
