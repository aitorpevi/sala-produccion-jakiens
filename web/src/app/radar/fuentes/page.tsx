import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { logoutAction } from "@/app/actions";
import { STAFF_TIER_LABEL } from "@/lib/phases";
import { FUENTES, VERTICALES, FICHAS, NOMBRE_FUENTE, type Fuente } from "@/lib/ingesta";
import { metricasDeFuente } from "@/lib/radar";
import { crearVigiladoAction, guardarVigiladoAction, eliminarVigiladoAction } from "./actions";

export const dynamic = "force-dynamic";

const ETIQUETA_VERTICAL: Record<string, string> = {
  MODA: "Moda",
  DISENO: "Diseño",
  CULTURA: "Cultura",
  MEME: "Meme",
  CINE: "Cine",
  TECNOLOGIA: "Tecnología",
  INTERNET: "Internet",
};

/** Qué escribir en el campo "término" según la fuente, para no dejar a nadie adivinando el formato. */
const AYUDA_TERMINO: Record<Fuente, string> = {
  WIKIPEDIA: "El título exacto del artículo, p. ej. Streetwear",
  GDELT: "Palabras de búsqueda, p. ej. advertising campaign",
  BLUESKY: "El handle, con o sin @, p. ej. dieworkwear.bsky.social",
  BLUESKY_FEED: "La URL de bsky.app/profile/.../feed/... o el URI at://",
  BLUESKY_TRENDS: "",
  HACKERNEWS: "Una palabra para filtrar la portada. Vacío = toda la portada.",
  RSS: "La URL del feed, p. ej. https://www.dezeen.com/feed/",
  REDDIT: "El nombre del subreddit, con o sin r/, p. ej. streetwear",
  TELEGRAM: "El @handle público del canal, sin arroba, p. ej. chollometro",
  YOUTUBE: "El ID de categoría de YouTube, p. ej. 24 (Entretenimiento). Vacío = top general de España.",
};

const numero = (n: number) => Math.round(n).toLocaleString("es-ES");

function haceCuanto(d: Date | null) {
  if (!d) return "nunca";
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export default async function FuentesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const staff = await requireStaff();
  const { error } = await searchParams;
  const puedeEditar = staff.tier === "FULL";

  const [vigilados, ...metricas] = await Promise.all([
    db.temaSeguido.findMany({ orderBy: [{ fuente: "asc" }, { creadoEn: "asc" }] }),
    ...FUENTES.map((f) => metricasDeFuente(f)),
  ]);

  const metricasPorFuente = new Map(metricas.map((m) => [m.fuente, m]));

  return (
    <div className="shell">
      <header className="top">
        <Link href="/p" className="brand">
          <span className="wordmark">Jakiens</span>
          <span className="sub">Fuentes del radar</span>
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
            <span className="step">Módulo creativo</span>
            <h2>Fuentes</h2>
            <p className="lead">
              Cada plataforma se despliega al hacer clic. Dentro, cada término vigilado también —
              para editarlo, ábrelo; para verlo de un vistazo, no hace falta.
            </p>
          </div>
          <Link href="/radar" className="btn ghost">
            ← Volver al radar
          </Link>
        </div>

        {error ? <div className="form-error">{error}</div> : null}
        {!puedeEditar ? (
          <div className="empty">
            <span className="em-mono">Solo lectura</span>
            Tu nivel de acceso puede ver esta pantalla pero no editarla. Solo acceso total añade,
            desactiva o borra fuentes.
          </div>
        ) : null}

        {FUENTES.map((fuente, i) => {
          const ficha = FICHAS[fuente];
          const m = metricasPorFuente.get(fuente);
          const delaFuente = vigilados.filter((v) => v.fuente === fuente);
          const activos = delaFuente.filter((v) => v.activo);
          const inactivos = delaFuente.filter((v) => !v.activo);
          const fallando = !!m?.ultimaPasadaError;

          return (
            <details className="panel" key={fuente} id={fuente} open={i === 0}>
              <summary className="fuente-resumen">
                <span className="fuente-resumen-left">
                  <span className="chevron">▸</span>
                  <h3>{NOMBRE_FUENTE[fuente]}</h3>
                </span>
                <span className="fuente-resumen-right">
                  <span className="tag">
                    {activos.length} activos
                    {inactivos.length > 0 ? ` · ${inactivos.length} apagados` : ""}
                  </span>
                  {fallando ? (
                    <span className="status pend">
                      <span className="s-dot"></span>Sin datos
                    </span>
                  ) : (
                    <span className="status ok">
                      <span className="s-dot"></span>Al día
                    </span>
                  )}
                </span>
              </summary>

              <div className="body-copy">
                <p>{ficha.cualitativo}</p>
                <p className="hint" style={{ marginTop: 6 }}>
                  <strong>Coste:</strong> {ficha.coste}
                </p>
                <p className="hint" style={{ marginTop: 4 }}>
                  <strong>Fiabilidad observada:</strong> {ficha.fiabilidad}
                </p>
                {ficha.riesgo ? (
                  <p className="hint" style={{ marginTop: 4 }}>
                    <strong>Riesgo:</strong> {ficha.riesgo}
                  </p>
                ) : null}

                <div className="kv" style={{ marginTop: 12 }}>
                  <span className="k">Señales totales</span>
                  <span className="v mono">{numero(m?.totalSenales ?? 0)}</span>
                </div>
                <div className="kv">
                  <span className="k">Última señal capturada</span>
                  <span className="v mono">{haceCuanto(m?.ultimaSenal ?? null)}</span>
                </div>
                <div className="kv">
                  <span className="k">Últimas 10 pasadas</span>
                  <span className="v mono">
                    {(m?.pasadasRecientes ?? 0) - (m?.fallosRecientes ?? 0)}/{m?.pasadasRecientes ?? 0}{" "}
                    sin fallo
                  </span>
                </div>
              </div>

              {ficha.admiteVigilados ? (
                <div style={{ borderTop: "1px solid var(--hair)" }}>
                  {delaFuente.length === 0 ? (
                    <p className="hint" style={{ padding: "12px 16px" }}>
                      Nada vigilado todavía en esta fuente.
                    </p>
                  ) : (
                    delaFuente.map((v) => (
                      <details className="vigilado" key={v.id}>
                        <summary>
                          <span className="vigilado-info">
                            <span className={`dot-estado ${v.activo ? "on" : "off"}`} />
                            <span className="vigilado-termino">{v.etiqueta || v.termino}</span>
                            {v.vertical ? (
                              <span className="tag">{ETIQUETA_VERTICAL[v.vertical] ?? v.vertical}</span>
                            ) : null}
                          </span>
                          <span className="chevron">▸</span>
                        </summary>
                        <div className="vigilado-edit">
                          <form action={guardarVigiladoAction} className="fgrid">
                            <input type="hidden" name="id" value={v.id} />
                            <div className="field full">
                              <label>Término</label>
                              <input value={v.termino} readOnly disabled />
                            </div>
                            <div className="field">
                              <label htmlFor={`et-${v.id}`}>Etiqueta</label>
                              <input
                                id={`et-${v.id}`}
                                name="etiqueta"
                                defaultValue={v.etiqueta ?? ""}
                                disabled={!puedeEditar}
                              />
                            </div>
                            <div className="field">
                              <label htmlFor={`vt-${v.id}`}>Vertical</label>
                              <select
                                id={`vt-${v.id}`}
                                name="vertical"
                                defaultValue={v.vertical ?? ""}
                                disabled={!puedeEditar}
                              >
                                <option value="">Sin vertical</option>
                                {VERTICALES.map((vv) => (
                                  <option key={vv} value={vv}>
                                    {ETIQUETA_VERTICAL[vv] ?? vv}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {fuente === "WIKIPEDIA" ? (
                              <div className="field">
                                <label htmlFor={`id-${v.id}`}>Idioma</label>
                                <input
                                  id={`id-${v.id}`}
                                  name="idioma"
                                  defaultValue={v.idioma ?? "es"}
                                  disabled={!puedeEditar}
                                />
                              </div>
                            ) : null}
                            <div className="field">
                              <label>
                                <input
                                  type="checkbox"
                                  name="activo"
                                  defaultChecked={v.activo}
                                  style={{ width: "auto", marginRight: 6 }}
                                  disabled={!puedeEditar}
                                />
                                Activo
                              </label>
                            </div>
                            {puedeEditar ? (
                              <div className="field" style={{ display: "flex", gap: 8, alignItems: "end" }}>
                                <button className="btn" type="submit">
                                  Guardar
                                </button>
                                <button
                                  className="btn ghost"
                                  type="submit"
                                  formAction={eliminarVigiladoAction}
                                >
                                  Eliminar
                                </button>
                              </div>
                            ) : null}
                          </form>
                        </div>
                      </details>
                    ))
                  )}

                  {puedeEditar ? (
                    <div className="body-copy">
                      <form action={crearVigiladoAction} className="fgrid">
                        <input type="hidden" name="fuente" value={fuente} />
                        <div className="field full">
                          <label htmlFor={`nuevo-${fuente}`}>Añadir</label>
                          <input
                            id={`nuevo-${fuente}`}
                            name="termino"
                            placeholder={AYUDA_TERMINO[fuente]}
                            required
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`ne-${fuente}`}>Etiqueta</label>
                          <input id={`ne-${fuente}`} name="etiqueta" placeholder="Nombre legible" />
                        </div>
                        <div className="field">
                          <label htmlFor={`nv-${fuente}`}>Vertical</label>
                          <select id={`nv-${fuente}`} name="vertical" defaultValue="">
                            <option value="">Sin vertical</option>
                            {VERTICALES.map((vv) => (
                              <option key={vv} value={vv}>
                                {ETIQUETA_VERTICAL[vv] ?? vv}
                              </option>
                            ))}
                          </select>
                        </div>
                        {fuente === "WIKIPEDIA" ? (
                          <div className="field">
                            <label htmlFor={`ni-${fuente}`}>Idioma</label>
                            <input id={`ni-${fuente}`} name="idioma" placeholder="es" />
                          </div>
                        ) : null}
                        <div className="field">
                          <button className="btn solid" type="submit">
                            Añadir
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="hint" style={{ padding: "12px 16px", borderTop: "1px solid var(--hair)" }}>
                  Esta fuente no admite términos vigilados: siempre trae las tendencias globales de
                  la red.
                </p>
              )}
            </details>
          );
        })}
      </main>

      <div className="protonote">Sala de producción · Jakiens</div>
    </div>
  );
}
