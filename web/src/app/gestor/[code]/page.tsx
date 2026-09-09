import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff, puedeVerProyecto } from "@/lib/access";
import { TopBar } from "@/components/AppShell";
import { ArchivoLimitado } from "@/components/ArchivoLimitado";
import { ETAPAS, ESTADOS, etapa as etapaDe, ordenEtapa } from "@/lib/etapas";
import { TIPOS_HITO, etiquetaFecha, urgencia } from "@/lib/hitos";
import { PRODUCTORAS } from "@/lib/productoras";
import { ESTADOS_PRESUPUESTO_VENTA } from "@/lib/presupuesto-venta";
import {
  anadirBriefingAction,
  asignarAction,
  borrarDocumentoAction,
  borrarHitoAction,
  crearHitoAction,
  desasignarAction,
  guardarPresupuestoVentaAction,
  marcarCerradoAction,
  marcarHitoAction,
  marcarPerdidoAction,
  moverEtapaAction,
  reabrirAction,
} from "./actions";

/** "Chiara" → "CH". Para el cuadradito de cada persona. */
const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Ficha de proyecto del gestor.
 *
 * Es la vista transversal: dónde está, qué fechas tiene, quién lo trabaja y cómo
 * pasa a la etapa siguiente. El detalle operativo —equipo de rodaje, materiales,
 * orden del día— vive en la sala de producción, a la que se entra desde aquí y
 * solo si el proyecto ya se ganó.
 */
export default async function FichaProyectoPage({ params }: { params: Promise<{ code: string }> }) {
  const staff = await requireStaff();
  const { code } = await params;

  const project = await db.project.findUnique({
    where: { code },
    include: {
      cliente: true,
      hitos: { orderBy: { fecha: "asc" }, include: { completadoPor: true } },
      asignaciones: { include: { staff: true }, orderBy: [{ responsable: "desc" }, { creadoEn: "asc" }] },
      documentos: { orderBy: { creadoEn: "desc" } },
      // El presupuesto de venta ni siquiera se consulta si quien mira no tiene
      // permiso: traerlo y luego no pintarlo lo dejaría en el HTML del servidor.
      presupuestoVenta: staff.accesoPresupuestoVenta ? { include: { asignadoA: true } } : false,
    },
  });
  if (!project) notFound();
  if (!(await puedeVerProyecto(staff, project.id))) notFound();

  const equipo = await db.staffUser.findMany({ orderBy: { name: "asc" } });
  const puedenPresupuestar = equipo.filter((p) => p.accesoPresupuestoVenta);

  const hoy = new Date();
  const info = etapaDe(project.etapa);
  const enVenta = project.etapa === "VENTA";
  const puedeMover = staff.tier === "FULL";
  const archivado = project.estado === "PERDIDO" || project.estado === "CERRADO";
  const siguiente = ETAPAS[ordenEtapa(project.etapa) + 1];

  // El briefing lo ve el equipo; el presupuesto solo quien tiene permiso, y por
  // eso ni se ha traído de la base si no lo tiene.
  const briefings = project.documentos.filter((d) => d.tipo === "BRIEFING");
  const ppts = staff.accesoPresupuestoVenta
    ? project.documentos.filter((d) => d.tipo === "PRESUPUESTO")
    : [];

  return (
    <div className="shell">
      <TopBar staff={staff} />

      <section className="proj" style={{ ["--etapa" as string]: info.color }}>
        <div className="proj-top">
          <div className="proj-titulo">
            <span className="eyebrow">
              — {project.client}
              {project.marca ? ` · ${project.marca}` : ""}
            </span>
            <h1>{project.name}</h1>
          </div>

          {/*
            Etapa y estado, juntos y arriba. Antes eran dos controles al final de
            la página que se pisaban entre sí: un proyecto en preproducción es un
            proyecto ganado, y decirlo dos veces solo permitía que un día no
            coincidieran. Aquí solo hay dos salidas: avanzar o perderlo.
          */}
          {puedeMover ? (
            <div className="proj-situacion">
              {archivado ? (
                <form action={reabrirAction}>
                  <input type="hidden" name="code" value={project.code} />
                  <span className="estado-chip">{ESTADOS[project.estado].label}</span>
                  <button className="btn ghost" type="submit">
                    Reabrir
                  </button>
                </form>
              ) : (
                <>
                  {siguiente ? (
                    <form action={moverEtapaAction}>
                      <input type="hidden" name="code" value={project.code} />
                      <input type="hidden" name="etapa" value={siguiente.clave} />
                      <button className="btn solid" type="submit">
                        {enVenta ? "Ganado — abrir producción" : `Pasar a ${siguiente.label}`}
                      </button>
                    </form>
                  ) : (
                    <form action={marcarCerradoAction}>
                      <input type="hidden" name="code" value={project.code} />
                      <button className="btn solid" type="submit">
                        Cerrar proyecto
                      </button>
                    </form>
                  )}
                  <form action={marcarPerdidoAction}>
                    <input type="hidden" name="code" value={project.code} />
                    <button className="btn ghost" type="submit">
                      Perdido
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : (
            <div className="proj-situacion">
              <span className="estado-chip">{info.label}</span>
            </div>
          )}
        </div>

        <div className="meta">
          <div className="cell">
            <span className="k">Identificador</span>
            <span className="v mono">{project.refPresupuesto ?? project.code}</span>
          </div>
          <div className="cell">
            <span className="k">Productora</span>
            <span className="v">
              {PRODUCTORAS[(project.productora ?? "JAKIENS") as keyof typeof PRODUCTORAS]?.nombre ??
                "Jakiens"}
            </span>
          </div>
          <div className="cell">
            <span className="k">Cliente / Agencia</span>
            <span className="v">{project.client}</span>
          </div>
          <div className="cell">
            <span className="k">Realizador</span>
            <span className="v">{project.director || "—"}</span>
          </div>
        </div>
      </section>

      <nav className="etapas" aria-label="Etapas del proyecto">
        {ETAPAS.map((e) => {
          const pos = ordenEtapa(e.clave) - ordenEtapa(project.etapa);
          const estado = pos < 0 ? "pasada" : pos === 0 ? "actual" : "futura";
          return (
            <div
              className={`etapa-paso ${estado}`}
              style={{ ["--etapa" as string]: e.color }}
              key={e.clave}
            >
              <span className="etapa-punto" />
              <span className="num">{e.n}</span>
              <span className="plabel">{e.label}</span>
            </div>
          );
        })}
      </nav>

      <main>
        {!enVenta ? (
          <div className="panel">
            <div className="file">
              <div className="fmeta">
                <div className="fn">Sala de producción</div>
                <div className="fd">Equipo, materiales, altas, orden de rodaje y cierre</div>
              </div>
              <Link className="btn solid" href={`/p/${project.code}/equipo`}>
                Entrar
              </Link>
            </div>
          </div>
        ) : null}

        <div className="panel">
          <div className="phdr">
            <h3>Fechas</h3>
            <span className="tag">
              {project.hitos.filter((h) => !h.completadoEn).length} pendientes de{" "}
              {project.hitos.length}
            </span>
          </div>

          {project.hitos.length === 0 ? (
            <div className="empty">
              <span className="em-mono">Sin fechas</span>
              {enVenta
                ? "Solo la entrega de la propuesta, que se pone al abrir la oportunidad."
                : "Añade la primera abajo. Lo que no tiene fecha no sale en el calendario."}
            </div>
          ) : (
            project.hitos.map((h) => (
              <div className={`file${h.completadoEn ? " hecho" : ""}`} key={h.id}>
                <span className={`hito-fecha u-${urgencia(h.fecha, hoy, h.completadoEn)}`}>
                  {etiquetaFecha(h.fecha, h.fechaFin)}
                </span>
                <div className="fmeta">
                  <div className="fn">{h.titulo}</div>
                  <div className="fd">
                    {TIPOS_HITO[h.tipo].label} · {etapaDe(h.etapa).label}
                    {h.origen !== "manual" ? " · derivado" : ""}
                    {h.completadoEn
                      ? ` · hecho el ${etiquetaFecha(h.completadoEn)}${
                          h.completadoPor ? ` por ${h.completadoPor.name}` : ""
                        }`
                      : ""}
                  </div>
                </div>

                <form action={marcarHitoAction}>
                  <input type="hidden" name="code" value={project.code} />
                  <input type="hidden" name="id" value={h.id} />
                  <input type="hidden" name="hecho" value={h.completadoEn ? "0" : "1"} />
                  <button className={h.completadoEn ? "btn ghost" : "btn"} type="submit">
                    {h.completadoEn ? "Deshacer" : "Hecho"}
                  </button>
                </form>

                {h.origen === "manual" ? (
                  <form action={borrarHitoAction}>
                    <input type="hidden" name="code" value={project.code} />
                    <input type="hidden" name="id" value={h.id} />
                    <button className="btn ghost" type="submit">
                      Quitar
                    </button>
                  </form>
                ) : (
                  <span
                    className="tag"
                    title="Se regenera desde la orden de rodaje o el alta del proyecto"
                  >
                    Automático
                  </span>
                )}
              </div>
            ))
          )}

          {/*
            En venta no se añaden fechas. La única que importa es la entrega de
            la propuesta, y esa se pone al abrir la oportunidad; el calendario de
            verdad se define en preproducción. Tenerlo en los dos sitios era
            duplicar el trabajo y garantizar que un día no coincidieran.
          */}
          {enVenta ? (
            <div className="nota-panel">
              Las fechas del proyecto se definen en preproducción, cuando se gane. Aquí solo vive la
              entrega de la propuesta.
            </div>
          ) : (
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
          )}
        </div>

        <div className="panel">
          <div className="phdr">
            <h3>Briefing</h3>
            <span className="tag">{briefings.length}</span>
          </div>
          {briefings.length === 0 ? (
            <div className="empty">
              <span className="em-mono">Sin briefing</span>
              Sube el documento de la agencia o pega el enlace.
            </div>
          ) : (
            briefings.map((d) => (
              <div className="file" key={d.id}>
                <div className="ic" data-ext={d.linkUrl ? "WEB" : "DOC"}></div>
                <div className="fmeta">
                  <div className="fn">{d.nombre}</div>
                  <div className="fd">{d.linkUrl ?? "Archivo subido"}</div>
                </div>
                <a
                  className="btn"
                  href={d.linkUrl ?? `/api/documentos/${d.id}`}
                  target={d.linkUrl ? "_blank" : undefined}
                  rel={d.linkUrl ? "noopener noreferrer" : undefined}
                >
                  {d.linkUrl ? "Abrir" : "Descargar"}
                </a>
                <form action={borrarDocumentoAction}>
                  <input type="hidden" name="code" value={project.code} />
                  <input type="hidden" name="id" value={d.id} />
                  <button className="btn ghost" type="submit">
                    Quitar
                  </button>
                </form>
              </div>
            ))
          )}
          <form action={anadirBriefingAction} className="alta">
            <div className="fgrid">
              <div className="field">
                <label htmlFor="archivo-brief">Documento</label>
                <ArchivoLimitado id="archivo-brief" name="archivo" />
              </div>
              <div className="field">
                <label htmlFor="linkUrl">O enlace</label>
                <input id="linkUrl" name="linkUrl" placeholder="Drive, Dropbox, Canva..." />
              </div>
            </div>
            <input type="hidden" name="code" value={project.code} />
            <div className="form-foot">
              <span className="hint">Lo ve todo el equipo</span>
              <button className="btn" type="submit">
                Añadir
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="phdr">
            <h3>Quién lo trabaja</h3>
            <span className="tag">
              {project.asignaciones.length}{" "}
              {project.asignaciones.length === 1 ? "asignación" : "asignaciones"}
            </span>
          </div>

          {ETAPAS.map((e) => {
            const enEtapa = project.asignaciones.filter((a) => a.etapa === e.clave);
            if (enEtapa.length === 0) return null;
            return (
              <div key={e.clave}>
                <div className="sub-hdr" style={{ ["--etapa" as string]: e.color }}>
                  <span className="etapa-punto" />
                  {e.label}
                </div>
                {enEtapa.map((a) => (
                  <div className="file" key={a.id}>
                    <div className="ic" data-ext={iniciales(a.staff.name)}></div>
                    <div className="fmeta">
                      <div className="fn">
                        {a.staff.name}
                        {a.responsable ? " · responsable" : ""}
                      </div>
                      <div className="fd">{a.rol || "Sin rol definido"}</div>
                    </div>
                    <form action={desasignarAction}>
                      <input type="hidden" name="code" value={project.code} />
                      <input type="hidden" name="id" value={a.id} />
                      <button className="btn ghost" type="submit">
                        Quitar
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            );
          })}

          {project.asignaciones.length === 0 ? (
            <div className="empty">
              <span className="em-mono">Nadie asignado</span>
              El equipo cambia según la etapa. Apunta abajo quién entra en cada una.
            </div>
          ) : null}

          <form action={asignarAction} className="alta">
            <div className="fgrid">
              <div className="field">
                <label htmlFor="staffUserId">Persona</label>
                <select id="staffUserId" name="staffUserId" required>
                  {equipo.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="etapa-asig">Etapa</label>
                <select id="etapa-asig" name="etapa" defaultValue={project.etapa}>
                  {ETAPAS.map((e) => (
                    <option key={e.clave} value={e.clave}>
                      {e.n} · {e.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="rol">Qué hace</label>
                <input id="rol" name="rol" placeholder="Ej. Producer, Montaje, Cotización" />
              </div>
              <div className="field">
                <label htmlFor="responsable">Responsable de la etapa</label>
                <label className="check">
                  <input id="responsable" name="responsable" type="checkbox" />
                  <span>Es quien nutre la información y a quien se le pregunta</span>
                </label>
              </div>
            </div>
            <input type="hidden" name="code" value={project.code} />
            <div className="form-foot">
              <span className="hint">
                Solo equipo de casa — los colaboradores externos van en la sala de producción
              </span>
              <button className="btn solid" type="submit">
                Asignar
              </button>
            </div>
          </form>
        </div>

        {staff.accesoPresupuestoVenta ? (
          <div className="panel confidencial">
            <div className="phdr">
              <h3>Presupuesto de venta</h3>
              <span className="tag">Confidencial</span>
            </div>

            {ppts.length === 0 ? (
              <div className="empty">
                <span className="em-mono">Sin PPTO todavía</span>
                Al subir el PDF se toma su nombre como identificador del proyecto.
              </div>
            ) : (
              ppts.map((d) => (
                <div className="file" key={d.id}>
                  <div className="ic" data-ext="PPTO"></div>
                  <div className="fmeta">
                    <div className="fn">{d.nombre}</div>
                    <div className="fd">
                      {d.creadoEn.toISOString().slice(0, 10).split("-").reverse().join("/")}
                    </div>
                  </div>
                  <a className="btn" href={`/api/documentos/${d.id}`}>
                    Descargar
                  </a>
                  <form action={borrarDocumentoAction}>
                    <input type="hidden" name="code" value={project.code} />
                    <input type="hidden" name="id" value={d.id} />
                    <button className="btn ghost" type="submit">
                      Quitar
                    </button>
                  </form>
                </div>
              ))
            )}

            <form action={guardarPresupuestoVentaAction} className="alta">
              <div className="fgrid">
                <div className="field">
                  <label htmlFor="archivo-ppto">Subir PPTO (PDF)</label>
                  <ArchivoLimitado id="archivo-ppto" name="archivo" accept=".pdf" />
                  <span className="ayuda">
                    El nombre del archivo pasa a ser el identificador del proyecto.
                  </span>
                </div>
                <div className="field">
                  <label htmlFor="refPresupuesto">Referencia</label>
                  <input
                    id="refPresupuesto"
                    name="refPresupuesto"
                    defaultValue={project.refPresupuesto ?? ""}
                    placeholder="PPTO 57A-2026-Kids-Consum-Mascotas"
                  />
                </div>
                <div className="field">
                  <label htmlFor="estado-presu">Estado</label>
                  <select
                    id="estado-presu"
                    name="estado"
                    defaultValue={project.presupuestoVenta?.estado ?? "en_preparacion"}
                  >
                    {Object.entries(ESTADOS_PRESUPUESTO_VENTA).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="asignadoA">Lo prepara</label>
                  <select
                    id="asignadoA"
                    name="asignadoA"
                    defaultValue={project.presupuestoVenta?.asignadoAId ?? ""}
                  >
                    <option value="">— Sin asignar —</option>
                    {puedenPresupuestar.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field full">
                  <label htmlFor="notas-presu">Comentarios Canva</label>
                  <textarea
                    id="notas-presu"
                    name="notas"
                    rows={2}
                    defaultValue={project.presupuestoVenta?.notas ?? ""}
                  />
                </div>
              </div>
              <input type="hidden" name="code" value={project.code} />
              <div className="form-foot">
                <span className="hint">
                  {project.presupuestoVenta?.enviadoEn
                    ? `Enviado a cliente el ${project.presupuestoVenta.enviadoEn
                        .toISOString()
                        .slice(0, 10)
                        .split("-")
                        .reverse()
                        .join("/")}`
                    : "Solo lo ve quien tiene acceso al presupuesto de venta"}
                </span>
                <button className="btn solid" type="submit">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </main>

      <div className="protonote">Gestor de proyectos · Jakiens</div>
    </div>
  );
}
