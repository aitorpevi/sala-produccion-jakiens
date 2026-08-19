import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/access";
import { logoutAction } from "@/app/actions";
import { STAFF_TIER_LABEL } from "@/lib/phases";
import { FUENTES, VERTICALES } from "@/lib/ingesta";

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

function haceCuanto(d: Date | null) {
  if (!d) return "—";
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<{ fuente?: string; vertical?: string }>;
}) {
  const staff = await requireStaff();
  const { fuente, vertical } = await searchParams;

  const filtro = {
    ...(fuente && FUENTES.includes(fuente as never) ? { fuente } : {}),
    ...(vertical && VERTICALES.includes(vertical as never) ? { vertical } : {}),
  };

  const [total, senales, porFuente, pasadas, tendencias] = await Promise.all([
    db.senal.count({ where: filtro }),
    // Ordenadas por fuerza y no por fecha: el radar es para ver qué destaca.
    //
    // `nulls: "last"` es imprescindible: Postgres coloca los nulos primero al
    // ordenar de mayor a menor, así que sin esto los artículos de RSS —que no
    // tienen métrica— sepultaban a los posts con veinte mil interacciones, y la
    // pantalla enseñaba exactamente lo contrario de lo que promete.
    db.senal.findMany({
      where: filtro,
      orderBy: [{ metrica: { sort: "desc", nulls: "last" } }, { publicadaEn: "desc" }],
      take: 60,
    }),
    db.senal.groupBy({ by: ["fuente"], _count: true }),
    db.pasadaIngesta.findMany({ orderBy: { creadoEn: "desc" }, take: FUENTES.length }),
    // Wikipedia mide interés real y acumulado: es la única fuente con la que
    // tiene sentido hacer un ranking de temas.
    db.senal.groupBy({
      by: ["tema"],
      where: { fuente: "WIKIPEDIA" },
      _sum: { metrica: true },
      orderBy: { _sum: { metrica: "desc" } },
      take: 8,
    }),
  ]);

  const ultimaPasada = pasadas[0]?.creadoEn ?? null;
  const conError = pasadas.filter((p) => p.error);

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
              Lo que el cerebro ha captado de fuera. Se actualiza solo tres veces al día.
            </p>
          </div>
          <div className="scope-note">
            {total.toLocaleString("es-ES")} señales · última pasada {haceCuanto(ultimaPasada)}
          </div>
        </div>

        {conError.length > 0 ? (
          <div className="form-error">
            {conError.length} fuente(s) fallando: {conError.map((p) => p.fuente).join(", ")}. Una
            fuente rota no da error visible en ningún sitio más — por eso se avisa aquí.
          </div>
        ) : null}

        <div className="grid2">
          <div className="panel">
            <div className="phdr">
              <h3>Interés por tema</h3>
              <span className="tag">Wikipedia · 30 días</span>
            </div>
            {tendencias.length === 0 ? (
              <div className="empty">Sin datos todavía.</div>
            ) : (
              tendencias.map((t) => (
                <div className="kv" key={t.tema}>
                  <span className="k">{t.tema}</span>
                  <span className="v mono">
                    {Math.round(t._sum.metrica ?? 0).toLocaleString("es-ES")} visitas
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <div className="phdr">
              <h3>Estado de las fuentes</h3>
            </div>
            {FUENTES.map((f) => {
              const cuenta = porFuente.find((x) => x.fuente === f)?._count ?? 0;
              const ult = pasadas.find((p) => p.fuente === f);
              return (
                <div className="kv" key={f}>
                  <span className="k">{f}</span>
                  <span className="v mono">
                    {cuenta.toLocaleString("es-ES")}
                    {ult?.error ? " · fallando" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="phdr">
            <h3>Filtrar</h3>
          </div>
          <div className="body-copy">
            <p style={{ marginBottom: 8 }}>
              <Link className={`btn ${!fuente && !vertical ? "solid" : "ghost"}`} href="/radar">
                Todo
              </Link>
            </p>
            <p style={{ marginBottom: 8 }}>
              {VERTICALES.map((v) => (
                <Link
                  key={v}
                  className={`btn ${vertical === v ? "solid" : "ghost"}`}
                  href={`/radar?vertical=${v}`}
                  style={{ marginRight: 6, marginBottom: 6 }}
                >
                  {ETIQUETA_VERTICAL[v] ?? v}
                </Link>
              ))}
            </p>
            <p>
              {FUENTES.map((f) => (
                <Link
                  key={f}
                  className={`btn ${fuente === f ? "solid" : "ghost"}`}
                  href={`/radar?fuente=${f}`}
                  style={{ marginRight: 6, marginBottom: 6 }}
                >
                  {f}
                </Link>
              ))}
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="phdr">
            <h3>Señales</h3>
            <span className="tag">
              {senales.length} de {total.toLocaleString("es-ES")}
            </span>
          </div>
          {senales.length === 0 ? (
            <div className="empty">
              <span className="em-mono">Sin señales</span>
              No hay nada con ese filtro todavía.
            </div>
          ) : (
            senales.map((s) => (
              <div className="file" key={s.id}>
                <div className="ic" data-ext={s.fuente.slice(0, 4)}></div>
                <div className="fmeta">
                  <div className="fn">{s.titulo}</div>
                  <div className="fd">
                    {[
                      s.autor ? `@${s.autor}` : null,
                      s.tema,
                      s.vertical ? ETIQUETA_VERTICAL[s.vertical] : null,
                      s.metrica ? `${Math.round(s.metrica).toLocaleString("es-ES")}` : null,
                      haceCuanto(s.publicadaEn),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
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
      </main>

      <div className="protonote">Sala de producción · Jakiens</div>
    </div>
  );
}
