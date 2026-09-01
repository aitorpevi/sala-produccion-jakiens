import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { TopBar } from "@/components/AppShell";
import { ETAPAS, ESTADOS, estaVivo, estaArchivado } from "@/lib/etapas";
import { etiquetaFecha, urgencia } from "@/lib/hitos";
import { MARCAS } from "@/lib/marcas";

/**
 * Home del gestor: todos los proyectos de la compañía ordenados por etapa.
 *
 * Lo ve TODO el equipo interno, sea cual sea su nivel. Es el punto de la
 * herramienta: que cuando alguien entre sepa qué hay encima de la mesa y en qué
 * punto está, sin tener que preguntar. Los niveles siguen filtrando lo que se
 * puede hacer dentro de cada proyecto, no si el proyecto existe.
 */
export default async function GestorPage() {
  const staff = await requireStaff();
  const hoy = new Date();

  const proyectos = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      // Solo el próximo hito de cada proyecto: en la vista general interesa
      // "qué es lo siguiente", no la lista entera. La lista está en la ficha.
      hitos: { where: { fecha: { gte: hoy } }, orderBy: { fecha: "asc" }, take: 1 },
    },
  });

  const vivos = proyectos.filter((p) => estaVivo(p.estado));
  const archivados = proyectos.filter((p) => estaArchivado(p.estado));

  return (
    <div className="shell">
      <TopBar staff={staff} />

      <main>
        <div className="mod-head">
          <div className="htxt">
            <span className="step">Gestor</span>
            <h2>Todo lo que hay en marcha</h2>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/p" className="btn ghost">
              Sala de producción
            </Link>
            {staff.tier === "FULL" ? (
              <Link href="/gestor/nueva" className="btn solid">
                + Nueva oportunidad
              </Link>
            ) : null}
          </div>
        </div>

        {ETAPAS.map((e) => {
          const enEtapa = vivos.filter((p) => p.etapa === e.clave);
          if (enEtapa.length === 0) return null;

          return (
            <div className="panel etapa" style={{ ["--etapa" as string]: e.color }} key={e.clave}>
              <div className="phdr">
                <h3>
                  <span className="etapa-punto" />
                  {e.label}
                </h3>
                <span className="tag">{e.descripcion}</span>
              </div>
              {enEtapa.map((p) => {
                const proximo = p.hitos[0];
                return (
                  <div className="file" key={p.id}>
                    <div className="ic" data-ext={p.code.split("-")[0]?.slice(0, 4) ?? "PRJ"}></div>
                    <div className="fmeta">
                      <div className="fn">{p.name}</div>
                      <div className="fd">
                        {p.client} · {p.code} ·{" "}
                        {MARCAS[(p.brand ?? "JAKIENS") as keyof typeof MARCAS]?.nombre ?? "Jakiens"}
                        {p.estado !== "ACTIVO" && p.estado !== "OPORTUNIDAD"
                          ? ` · ${ESTADOS[p.estado].label}`
                          : ""}
                      </div>
                    </div>
                    {proximo ? (
                      <span className={`hito-proximo u-${urgencia(proximo.fecha, hoy)}`}>
                        {etiquetaFecha(proximo.fecha, proximo.fechaFin)} · {proximo.titulo}
                      </span>
                    ) : (
                      <span className="hito-proximo u-vacio">Sin fechas</span>
                    )}
                    <Link className="btn" href={`/gestor/${p.code}`}>
                      Ver
                    </Link>
                  </div>
                );
              })}
            </div>
          );
        })}

        {vivos.length === 0 ? (
          <div className="panel">
            <div className="empty">
              <span className="em-mono">Nada en marcha</span>
              {staff.tier === "FULL"
                ? "Abre la primera oportunidad con el botón de arriba."
                : "Todavía no hay ningún proyecto abierto."}
            </div>
          </div>
        ) : null}

        {archivados.length > 0 ? (
          <details className="panel">
            <summary className="phdr">
              <h3>Archivados</h3>
              <span className="tag">{archivados.length}</span>
            </summary>
            {archivados.map((p) => (
              <div className="file" key={p.id}>
                <div className="ic" data-ext={p.estado === "PERDIDO" ? "NO" : "OK"}></div>
                <div className="fmeta">
                  <div className="fn">{p.name}</div>
                  <div className="fd">
                    {ESTADOS[p.estado].label} · {p.client} · {p.code}
                  </div>
                </div>
                <Link className="btn ghost" href={`/gestor/${p.code}`}>
                  Ver
                </Link>
              </div>
            ))}
          </details>
        ) : null}
      </main>

      <div className="protonote">Gestor de proyectos · Jakiens</div>
    </div>
  );
}
