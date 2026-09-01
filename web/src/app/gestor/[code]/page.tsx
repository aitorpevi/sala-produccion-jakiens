import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { TopBar } from "@/components/AppShell";
import { ETAPAS, ESTADOS, etapa as etapaDe, ordenEtapa } from "@/lib/etapas";
import { TIPOS_HITO, etiquetaFecha, urgencia } from "@/lib/hitos";
import { MARCAS } from "@/lib/marcas";
import {
  actualizarSituacionAction,
  borrarHitoAction,
  crearHitoAction,
  marcarGanadoAction,
} from "./actions";

/**
 * Ficha de proyecto del gestor.
 *
 * Es la vista transversal: en qué etapa está, qué fechas tiene y cómo se pasa de
 * una etapa a la siguiente. El detalle operativo (equipo, materiales, orden de
 * rodaje) vive en la sala de producción, a la que se entra desde aquí y solo si
 * el proyecto ya se ganó.
 */
export default async function FichaProyectoPage({ params }: { params: Promise<{ code: string }> }) {
  const staff = await requireStaff();
  const { code } = await params;

  const project = await db.project.findUnique({
    where: { code },
    include: { hitos: { orderBy: { fecha: "asc" } } },
  });
  if (!project) notFound();

  const hoy = new Date();
  const info = etapaDe(project.etapa);
  const enVenta = project.etapa === "VENTA";
  const puedeMover = staff.tier === "FULL";

  return (
    <div className="shell">
      <TopBar staff={staff} />

      <section className="proj" style={{ ["--etapa" as string]: info.color }}>
        <span className="eyebrow">— {project.client}</span>
        <h1>{project.name}</h1>
        <div className="meta">
          <div className="cell">
            <span className="k">Etapa</span>
            <span className="v etapa-v">
              <span className="etapa-punto" />
              {info.label}
            </span>
          </div>
          <div className="cell">
            <span className="k">Estado</span>
            <span className="v">{ESTADOS[project.estado].label}</span>
          </div>
          <div className="cell">
            <span className="k">Código</span>
            <span className="v mono">{project.code}</span>
          </div>
          <div className="cell">
            <span className="k">Productora</span>
            <span className="v">
              {MARCAS[(project.brand ?? "JAKIENS") as keyof typeof MARCAS]?.nombre ?? "Jakiens"}
            </span>
          </div>
          <div className="cell">
            <span className="k">Agencia</span>
            <span className="v">{project.agencia || "—"}</span>
          </div>
          <div className="cell">
            <span className="k">Realizador</span>
            <span className="v">{project.director || "—"}</span>
          </div>
        </div>
      </section>

      {/* Recorrido de las cinco etapas. Las ya pasadas quedan marcadas. */}
      <nav className="etapas" aria-label="Etapas del proyecto">
        {ETAPAS.map((e) => {
          const pos = ordenEtapa(e.clave) - ordenEtapa(project.etapa);
          const estado = pos < 0 ? "pasada" : pos === 0 ? "actual" : "futura";
          return (
            <div className={`etapa-paso ${estado}`} style={{ ["--etapa" as string]: e.color }} key={e.clave}>
              <span className="etapa-punto" />
              <span className="num">{e.n}</span>
              <span className="plabel">{e.label}</span>
            </div>
          );
        })}
      </nav>

      <main>
        <div className="panel">
          <div className="phdr">
            <h3>Fechas</h3>
            <span className="tag">
              {project.hitos.length} {project.hitos.length === 1 ? "hito" : "hitos"}
            </span>
          </div>

          {project.hitos.length === 0 ? (
            <div className="empty">
              <span className="em-mono">Sin fechas</span>
              Añade la primera abajo. Lo que no tiene fecha no sale en el calendario.
            </div>
          ) : (
            project.hitos.map((h) => (
              <div className="file" key={h.id}>
                <span className={`hito-fecha u-${urgencia(h.fecha, hoy)}`}>
                  {etiquetaFecha(h.fecha, h.fechaFin)}
                </span>
                <div className="fmeta">
                  <div className="fn">{h.titulo}</div>
                  <div className="fd">
                    {TIPOS_HITO[h.tipo].label} · {etapaDe(h.etapa).label}
                    {h.origen !== "manual" ? " · derivado" : ""}
                    {h.notas ? ` · ${h.notas}` : ""}
                  </div>
                </div>
                {h.origen === "manual" ? (
                  <form action={borrarHitoAction}>
                    <input type="hidden" name="code" value={project.code} />
                    <input type="hidden" name="id" value={h.id} />
                    <button className="btn ghost" type="submit">
                      Quitar
                    </button>
                  </form>
                ) : (
                  // Se dice por qué no se puede tocar, en vez de esconder el
                  // botón y dejar a la gente preguntándose si es un fallo.
                  <span className="tag" title="Se regenera desde la orden de rodaje o el alta del proyecto">
                    Automático
                  </span>
                )}
              </div>
            ))
          )}

          <form action={crearHitoAction} className="alta">
            <div className="fgrid">
              <div className="field">
                <label htmlFor="titulo">Nueva fecha</label>
                <input id="titulo" name="titulo" placeholder="Ej. PPM con cliente" required />
              </div>
              <div className="field">
                <label htmlFor="tipo">Tipo</label>
                <select id="tipo" name="tipo" defaultValue="OTRO">
                  {Object.entries(TIPOS_HITO).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="fecha">Día</label>
                <input id="fecha" name="fecha" type="date" required />
              </div>
              <div className="field">
                <label htmlFor="fechaFin">Hasta (si dura varios días)</label>
                <input id="fechaFin" name="fechaFin" type="date" />
              </div>
            </div>
            <input type="hidden" name="code" value={project.code} />
            <div className="form-foot">
              <span className="hint">Las fechas de esta ficha son las que verá el calendario</span>
              <button className="btn solid" type="submit">
                Añadir
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="phdr">
            <h3>Situación</h3>
          </div>

          {enVenta ? (
            <div className="file">
              <div className="fmeta">
                <div className="fn">La sala de producción está cerrada</div>
                <div className="fd">
                  Se abre al ganar el proyecto: entonces se crean las siete fases y se puede empezar
                  a cerrar equipo.
                </div>
              </div>
              {puedeMover ? (
                <form action={marcarGanadoAction}>
                  <input type="hidden" name="code" value={project.code} />
                  <button className="btn solid" type="submit">
                    Ganado — abrir producción
                  </button>
                </form>
              ) : null}
            </div>
          ) : (
            <div className="file">
              <div className="fmeta">
                <div className="fn">Sala de producción</div>
                <div className="fd">Equipo, materiales, altas, orden de rodaje y cierre</div>
              </div>
              <Link className="btn solid" href={`/p/${project.code}/equipo`}>
                Entrar
              </Link>
            </div>
          )}

          {puedeMover ? (
            <form action={actualizarSituacionAction} className="alta">
              <div className="fgrid">
                <div className="field">
                  <label htmlFor="etapa">Etapa</label>
                  <select id="etapa" name="etapa" defaultValue={project.etapa}>
                    {ETAPAS.map((e) => (
                      <option key={e.clave} value={e.clave}>
                        {e.n} · {e.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="estado">Estado</label>
                  <select id="estado" name="estado" defaultValue={project.estado}>
                    {Object.entries(ESTADOS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <input type="hidden" name="code" value={project.code} />
              <div className="form-foot">
                <span className="hint">
                  Un proyecto perdido se archiva y se puede consultar — no se borra
                </span>
                <button className="btn" type="submit">
                  Guardar
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </main>

      <div className="protonote">Gestor de proyectos · Jakiens</div>
    </div>
  );
}
