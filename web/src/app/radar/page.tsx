import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { logoutAction } from "@/app/actions";
import { STAFF_TIER_LABEL } from "@/lib/phases";
import { FUENTES, VERTICALES } from "@/lib/ingesta";
import { movimientoWikipedia, destacadoDe, recienteDe, saludDeFuentes } from "@/lib/radar";

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

const NOMBRE_FUENTE: Record<string, string> = {
  WIKIPEDIA: "Wikipedia",
  GDELT: "GDELT",
  BLUESKY: "Bluesky · cuentas",
  BLUESKY_FEED: "Bluesky · feeds",
  BLUESKY_TRENDS: "Bluesky · tendencias",
  HACKERNEWS: "Hacker News",
  RSS: "Medios y newsletters",
  REDDIT: "Reddit",
};

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

  const [total, movimiento, tendencias, conversacion, medios, tech, salud] = await Promise.all([
    db.senal.count(vertical ? { where: { vertical } } : {}),
    movimientoWikipedia(),
    destacadoDe("BLUESKY_TRENDS", 8, vertical),
    destacadoDe("BLUESKY", 6, vertical),
    recienteDe("RSS", 8, vertical),
    destacadoDe("HACKERNEWS", 5, vertical),
    saludDeFuentes(),
  ]);

  const rotas = [...salud.ultima.values()].filter((p) => p.error);
  const ultimaPasada = [...salud.ultima.values()].sort(
    (a, b) => b.creadoEn.getTime() - a.creadoEn.getTime(),
  )[0]?.creadoEn;

  const suben = tendencias.filter((t) => t.tema === "subiendo");
  const enfrian = tendencias.filter((t) => t.tema !== "subiendo");

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
            <span className="step">Módulo creativo</span>
            <h2>Radar</h2>
            <p className="lead">
              Cada fuente en sus propias unidades. Las visitas de Wikipedia y los likes de Bluesky
              no se comparan entre sí: mezclarlas daría un número que parece significar algo y no
              significa nada.
            </p>
          </div>
          <div className="scope-note">
            {numero(total)} señales · actualizado {haceCuanto(ultimaPasada ?? null)}
          </div>
        </div>

        <div className="panel">
          <div className="phdr">
            <h3>Filtrar por vertical</h3>
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

        {/* ---------- Lo que se mueve ---------- */}
        <div className="panel">
          <div className="phdr">
            <h3>Qué se mueve</h3>
            <span className="tag">Wikipedia · 7 días vs 7 anteriores</span>
          </div>
          <div className="body-copy">
            <p className="hint">
              Que un tema tenga muchas visitas no dice nada: «moda» siempre las tiene. Lo que
              importa es la variación.
            </p>
          </div>
          {movimiento.length === 0 ? (
            <div className="empty">Aún no hay dos semanas de datos para comparar.</div>
          ) : (
            movimiento.map((m) => (
              <div className="kv" key={m.tema}>
                <span className="k">{m.tema}</span>
                <span className="v mono">
                  {m.variacion === null
                    ? `${numero(m.reciente)} · sin comparación`
                    : `${m.variacion >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(m.variacion))}% · ${numero(m.reciente)} visitas`}
                </span>
              </div>
            ))
          )}
        </div>

        {/* ---------- Conversación ---------- */}
        <div className="grid2">
          <div className="panel">
            <div className="phdr">
              <h3>Subiendo ahora</h3>
              <span className="tag">Bluesky</span>
            </div>
            {suben.length === 0 ? (
              <div className="empty">Nada subiendo con este filtro.</div>
            ) : (
              suben.map((s) => (
                <div className="kv" key={s.id}>
                  <span className="k">{s.titulo}</span>
                  <span className="v mono">{numero(s.metrica ?? 0)} posts</span>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <div className="phdr">
              <h3>Enfriándose</h3>
              <span className="tag">Bluesky</span>
            </div>
            {enfrian.length === 0 ? (
              <div className="empty">Nada enfriándose con este filtro.</div>
            ) : (
              enfrian.map((s) => (
                <div className="kv" key={s.id}>
                  <span className="k">{s.titulo}</span>
                  <span className="v mono">{numero(s.metrica ?? 0)} posts</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ---------- Lo más comentado ---------- */}
        <div className="panel">
          <div className="phdr">
            <h3>Lo más comentado</h3>
            <span className="tag">Bluesky · cuentas seguidas</span>
          </div>
          {conversacion.length === 0 ? (
            <div className="empty">Sin señales con este filtro.</div>
          ) : (
            conversacion.map((s) => (
              <div className="file" key={s.id}>
                <div className="fmeta">
                  <div className="fn">{s.titulo}</div>
                  <div className="fd">
                    @{s.autor} · {numero(s.metrica ?? 0)} interacciones · {haceCuanto(s.publicadaEn)}
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

        {/* ---------- Medios ---------- */}
        <div className="panel">
          <div className="phdr">
            <h3>Publicado esta semana</h3>
            <span className="tag">Medios y newsletters</span>
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

        {/* ---------- Tecnología ---------- */}
        {tech.length > 0 ? (
          <div className="panel">
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

        {/* ---------- Salud ---------- */}
        <div className="panel">
          <div className="phdr">
            <h3>Fuentes</h3>
            {rotas.length > 0 ? (
              <span className="status pend">
                <span className="s-dot"></span>
                {rotas.length} sin datos
              </span>
            ) : (
              <span className="status ok">
                <span className="s-dot"></span>Todas al día
              </span>
            )}
          </div>
          {FUENTES.map((f) => {
            const cuenta = salud.porFuente.find((x) => x.fuente === f)?._count ?? 0;
            const ult = salud.ultima.get(f);
            return (
              <div className="kv" key={f}>
                <span className="k">{NOMBRE_FUENTE[f] ?? f}</span>
                <span className="v mono">
                  {numero(cuenta)} señales
                  {ult?.error ? " · sin datos" : ult ? ` · ${haceCuanto(ult.creadoEn)}` : " · nunca"}
                </span>
              </div>
            );
          })}
        </div>
      </main>

      <div className="protonote">Sala de producción · Jakiens</div>
    </div>
  );
}
