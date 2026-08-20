import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { logoutAction } from "@/app/actions";
import { STAFF_TIER_LABEL } from "@/lib/phases";
import { FUENTES, VERTICALES } from "@/lib/ingesta";
import { movimientoWikipedia, destacadoDe, recienteDe, saludDeFuentes } from "@/lib/radar";
import { MapaCerebro, type FilaFuente } from "./MapaCerebro";
import { FiltroFuentes } from "./FiltroFuentes";
import { IconoRadar } from "@/components/IconoRadar";

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

/** Fuentes que dan pie a una tarjeta filtrable en esta pantalla. */
const FUENTES_CON_TARJETA = [
  { fuente: "BLUESKY_TRENDS", etiqueta: "Termómetro (Bluesky)" },
  { fuente: "WIKIPEDIA", etiqueta: "Esta semana (Wikipedia)" },
  { fuente: "BLUESKY", etiqueta: "Lo más comentado (Bluesky)" },
  { fuente: "RSS", etiqueta: "Medios y newsletters" },
  { fuente: "HACKERNEWS", etiqueta: "Señal temprana (Hacker News)" },
];

function haceCuanto(d: Date | null) {
  if (!d) return "—";
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const numero = (n: number) => Math.round(n).toLocaleString("es-ES");

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<{ vertical?: string }>;
}) {
  const staff = await requireStaff();
  const { vertical: v } = await searchParams;
  const vertical = v && VERTICALES.includes(v as never) ? v : undefined;

  const [total, movimiento, tendencias, conversacion, medios, tech, salud, vigilados, porVertical] =
    await Promise.all([
      db.senal.count(vertical ? { where: { vertical } } : {}),
      // Antes no recibía `vertical`: filtrar cambiaba los demás paneles pero no
      // este, así que parecía que el selector no hacía nada.
      movimientoWikipedia(vertical),
      destacadoDe("BLUESKY_TRENDS", 10, vertical),
      destacadoDe("BLUESKY", 6, vertical),
      recienteDe("RSS", 8, vertical),
      destacadoDe("HACKERNEWS", 5, vertical),
      saludDeFuentes(),
      db.temaSeguido.groupBy({ by: ["fuente"], where: { activo: true }, _count: true }),
      db.senal.groupBy({ by: ["vertical"], _count: true }),
    ]);

  const filasMapa: FilaFuente[] = FUENTES.map((f) => ({
    fuente: f,
    senales: salud.porFuente.find((x) => x.fuente === f)?._count ?? 0,
    vigilados: vigilados.find((x) => x.fuente === f)?._count ?? 0,
    caida: !!salud.ultima.get(f)?.error,
  }));

  const verticalesConDatos = porVertical
    .filter((v) => v.vertical)
    .map((v) => ({ vertical: v.vertical as string, n: v._count }));

  const ultimaPasada = [...salud.ultima.values()].sort(
    (a, b) => b.creadoEn.getTime() - a.creadoEn.getTime(),
  )[0]?.creadoEn;

  // Máximos para dimensionar las barras del termómetro (dos escalas
  // independientes: Bluesky cuenta posts, Wikipedia cuenta visitas).
  const maxTendencia = Math.max(1, ...tendencias.map((t) => t.metrica ?? 0));
  const maxMovimiento = Math.max(1, ...movimiento.map((m) => m.reciente));

  return (
    <div className="shell">
      <header className="top">
        <Link href="/p" className="brand">
          <span className="wordmark">Jakiens</span>
          <span className="sub">Radar de tendencias</span>
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
            <span className="step" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <IconoRadar size={13} /> Módulo creativo
            </span>
            <h2>Radar</h2>
            <p className="lead">
              Cada fuente en sus propias unidades. Las visitas de Wikipedia y los likes de Bluesky
              no se comparan entre sí: mezclarlas daría un número que parece significar algo y no
              significa nada.
            </p>
          </div>
          <div className="scope-note" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span>
              {numero(total)} señales · actualizado {haceCuanto(ultimaPasada ?? null)}
            </span>
            <Link href="/radar/fuentes" className="btn ghost">
              Gestionar fuentes
            </Link>
          </div>
        </div>

        {/* ---------- Filtros ---------- */}
        <div className="panel">
          <div className="phdr">
            <h3>Vertical</h3>
            {vertical ? <span className="tag">{ETIQUETA_VERTICAL[vertical]}</span> : null}
          </div>
          <div className="body-copy">
            <Link
              className={`btn ${!vertical ? "solid" : "ghost"}`}
              href="/radar"
              style={{ marginRight: 6, marginBottom: 6 }}
            >
              Todo
            </Link>
            {VERTICALES.map((x) => (
              <Link
                key={x}
                className={`btn ${vertical === x ? "solid" : "ghost"}`}
                href={`/radar?vertical=${x}`}
                style={{ marginRight: 6, marginBottom: 6 }}
              >
                {ETIQUETA_VERTICAL[x] ?? x}
              </Link>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="phdr">
            <h3>Fuentes visibles</h3>
          </div>
          <FiltroFuentes opciones={FUENTES_CON_TARJETA} />
        </div>

        {/* ---------- Termómetro: el módulo principal ---------- */}
        <div className="panel" data-fuente="BLUESKY_TRENDS">
          <div className="phdr">
            <h3>Termómetro</h3>
            <span className="tag">qué sube, qué se enfría</span>
          </div>
          <div className="body-copy">
            <div className="term-legend">
              <span>
                <span className="dot" style={{ background: "var(--sube)" }} />▲ Subiendo
              </span>
              <span>
                <span className="dot" style={{ background: "var(--enfria)" }} />▼ Enfriándose
              </span>
            </div>

            <div className="term-sub">Ahora mismo · Bluesky</div>
            {tendencias.length === 0 ? (
              <div className="empty">Sin tendencias con este filtro.</div>
            ) : (
              tendencias.map((t) => {
                const sube = t.tema === "subiendo";
                const pct = Math.max(3, ((t.metrica ?? 0) / maxTendencia) * 100);
                return (
                  <div className="term-row" key={t.id}>
                    <span className={`term-dir ${sube ? "subir" : "enfriar"}`}>
                      {sube ? "▲" : "▼"}
                    </span>
                    <div className="term-bar-wrap">
                      <div
                        className={`term-bar ${sube ? "subir" : "enfriar"}`}
                        style={{ width: `${pct}%` }}
                      />
                      <span className="term-label">{t.titulo}</span>
                    </div>
                    <span className="term-count mono">{numero(t.metrica ?? 0)}</span>
                  </div>
                );
              })
            )}

            <div className="term-sub">Esta semana · Wikipedia (7 días vs 7 anteriores)</div>
            {movimiento.length === 0 ? (
              <div className="empty">Aún no hay dos semanas de datos para comparar.</div>
            ) : (
              movimiento.map((m) => {
                const sube = m.variacion === null || m.variacion >= 0;
                const pct = Math.max(3, (m.reciente / maxMovimiento) * 100);
                return (
                  <div className="term-row" key={m.tema}>
                    <span className={`term-dir ${sube ? "subir" : "enfriar"}`}>
                      {sube ? "▲" : "▼"}
                    </span>
                    <div className="term-bar-wrap">
                      <div
                        className={`term-bar ${sube ? "subir" : "enfriar"}`}
                        style={{ width: `${pct}%` }}
                      />
                      <span className="term-label">
                        {m.tema}
                        {m.variacion !== null
                          ? ` · ${Math.abs(Math.round(m.variacion))}%`
                          : " · sin comparación"}
                      </span>
                    </div>
                    <span className="term-count mono">{numero(m.reciente)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ---------- Tarjetas secundarias, en cuadrícula modular ---------- */}
        <div className="grid-cards">
          <div className="panel" data-fuente="BLUESKY">
            <div className="phdr">
              <h3>Lo más comentado</h3>
              <span className="tag">Bluesky · cuentas</span>
            </div>
            {conversacion.length === 0 ? (
              <div className="empty">Sin señales con este filtro.</div>
            ) : (
              conversacion.map((s) => (
                <div className="file" key={s.id}>
                  <div className="fmeta">
                    <div className="fn">{s.titulo}</div>
                    <div className="fd">
                      @{s.autor} · {numero(s.metrica ?? 0)} · {haceCuanto(s.publicadaEn)}
                    </div>
                  </div>
                  {s.url ? (
                    <a className="btn ghost" href={s.url} target="_blank" rel="noreferrer noopener">
                      Abrir
                    </a>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="panel" data-fuente="RSS">
            <div className="phdr">
              <h3>Publicado esta semana</h3>
              <span className="tag">Medios</span>
            </div>
            {medios.length === 0 ? (
              <div className="empty">Sin artículos con este filtro.</div>
            ) : (
              medios.map((s) => (
                <div className="file" key={s.id}>
                  <div className="fmeta">
                    <div className="fn">{s.titulo}</div>
                    <div className="fd">
                      {s.tema} · {haceCuanto(s.publicadaEn)}
                    </div>
                  </div>
                  {s.url ? (
                    <a className="btn ghost" href={s.url} target="_blank" rel="noreferrer noopener">
                      Leer
                    </a>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {tech.length > 0 ? (
            <div className="panel" data-fuente="HACKERNEWS">
              <div className="phdr">
                <h3>Señal temprana</h3>
                <span className="tag">Hacker News</span>
              </div>
              {tech.map((s) => (
                <div className="file" key={s.id}>
                  <div className="fmeta">
                    <div className="fn">{s.titulo}</div>
                    <div className="fd">
                      {numero(s.metrica ?? 0)} puntos · {haceCuanto(s.publicadaEn)}
                    </div>
                  </div>
                  {s.url ? (
                    <a className="btn ghost" href={s.url} target="_blank" rel="noreferrer noopener">
                      Abrir
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <MapaCerebro fuentes={filasMapa} totalSenales={total} verticales={verticalesConDatos} />
      </main>

      <div className="protonote">Sala de producción · Jakiens</div>
    </div>
  );
}
