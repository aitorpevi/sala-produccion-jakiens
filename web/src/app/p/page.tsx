import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { logoutAction } from "@/app/actions";
import { firstAllowedPhaseForStaff, STAFF_TIER_LABEL } from "@/lib/phases";
import { CLAVES_MARCA, MARCAS } from "@/lib/marcas";
import { IconoRadar } from "@/components/IconoRadar";

export default async function ProyectosPage() {
  const staff = await requireStaff();
  const landingPhase = firstAllowedPhaseForStaff(staff.tier);

  const projects = await db.project.findMany({ orderBy: { createdAt: "desc" } });
  const activos = projects.filter((p) => p.status !== "cerrado");
  const cerrados = projects.filter((p) => p.status === "cerrado");

  // Un bloque por productora. El flujo de trabajo es el mismo en las dos, pero
  // verlas separadas evita confundir un rodaje de 40k con una pieza de social.
  const porMarca = CLAVES_MARCA.map((clave) => ({
    clave,
    marca: MARCAS[clave],
    proyectos: activos.filter((p) => (p.brand ?? "JAKIENS") === clave),
  })).filter((b) => b.proyectos.length > 0);

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
            <Link
              href="/radar"
              className="btn solid"
              style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
            >
              <IconoRadar size={15} />
              Radar
            </Link>
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

        {porMarca.map(({ clave, marca, proyectos }) => (
          <div className="panel marca" style={{ ["--marca" as string]: marca.color }} key={clave}>
            <div className="phdr">
              <h3>
                <span className="marca-punto" />
                {marca.nombre}
              </h3>
              <span className="tag">
                {proyectos.length} {proyectos.length === 1 ? "proyecto" : "proyectos"}
              </span>
            </div>
            {proyectos.map((p) => (
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
          </div>
        ))}

        {activos.length === 0 ? (
          <div className="panel">
            <div className="empty">
              <span className="em-mono">Sin proyectos activos</span>
              {staff.tier === "FULL"
                ? "Crea el primero con el botón de arriba."
                : "Todavía no hay ningún proyecto asignado."}
            </div>
          </div>
        ) : null}

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
                    {MARCAS[(p.brand ?? "JAKIENS") as keyof typeof MARCAS]?.nombre ?? "Jakiens"} ·{" "}
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
