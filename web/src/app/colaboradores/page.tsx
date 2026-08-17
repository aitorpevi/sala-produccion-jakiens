import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffTier } from "@/lib/access";
import { logoutAction } from "@/app/actions";
import { STAFF_TIER_LABEL } from "@/lib/phases";

export default async function ColaboradoresPage() {
  const staff = await requireStaffTier(["FULL", "LOGISTICS"]);

  const people = await db.person.findMany({
    orderBy: { name: "asc" },
    include: { memberships: { include: { project: true } } },
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
            <span className="step">Directorio</span>
            <h2>Colaboradores</h2>
            <p className="lead">
              Todas las personas que han trabajado con Jakiens, con independencia del proyecto. Al añadir
              equipo a un proyecto nuevo, se elige de aquí en vez de crear a alguien duplicado.
            </p>
          </div>
          <Link href="/p" className="btn ghost">
            ← Volver a proyectos
          </Link>
        </div>

        <div className="panel">
          <div className="phdr">
            <h3>Todas las personas</h3>
            <span className="tag">{people.length}</span>
          </div>
          <table className="roster">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Datos fiscales</th>
                <th>Proyectos</th>
                <th style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="person">
                      <div className="avatar">{p.initials}</div>
                      <div className="nm">{p.name}</div>
                    </div>
                  </td>
                  <td>
                    <span className="perm">{p.phone ?? "—"}</span>
                  </td>
                  <td>
                    {p.dni ? (
                      <span className="status ok">
                        <span className="s-dot"></span>Completos
                      </span>
                    ) : (
                      <span className="status pend">
                        <span className="s-dot"></span>Sin datos
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="perm">
                      {p.memberships.map((m) => m.project.code).join(" · ") || "—"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link className="btn" href={`/colaboradores/${p.id}`}>
                        Ver ficha
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {people.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">Todavía no hay ningún colaborador registrado.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </main>

      <div className="protonote">Sala de producción · Jakiens</div>
    </div>
  );
}
