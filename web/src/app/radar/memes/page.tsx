import Link from "next/link";
import { requireStaff } from "@/lib/access";
import { logoutAction } from "@/app/actions";
import { STAFF_TIER_LABEL } from "@/lib/phases";
import { imagenesDestacadas } from "@/lib/radar";

export const dynamic = "force-dynamic";

function formatoVistas(n: number | null) {
  if (n === null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default async function MemesPage() {
  const staff = await requireStaff();
  const imagenes = await imagenesDestacadas(80);

  return (
    <div className="shell">
      <header className="top">
        <Link href="/p" className="brand">
          <span className="wordmark">Jakiens</span>
          <span className="sub">Memes del radar</span>
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
            <h2>Memes</h2>
            <p className="lead">
              Todo lo que traen los canales de meme, ordenado por lo que de verdad ha visto la
              gente — no por cuándo se publicó. Es volumen a propósito: la idea no es curar diez,
              es ver muchas y que algo salte.
            </p>
          </div>
          <Link href="/radar" className="btn ghost">
            ← Volver al radar
          </Link>
        </div>

        {imagenes.length === 0 ? (
          <div className="panel">
            <div className="empty">
              <span className="em-mono">Sin imágenes todavía</span>
              Hace falta al menos una pasada de los canales marcados como MEME en{" "}
              <Link href="/radar/fuentes">Fuentes</Link>.
            </div>
          </div>
        ) : (
          <div className="meme-grid">
            {imagenes.map((s) => (
              <a
                className="meme-tile"
                key={s.id}
                href={s.url ?? undefined}
                target="_blank"
                rel="noreferrer noopener"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- imagen externa de Telegram, sin dominio fijo que registrar en next/image */}
                <img src={s.imagenUrl ?? undefined} alt="" loading="lazy" />
                <span className="meme-overlay">
                  <span className="meme-fuente">{s.tema ?? s.autor}</span>
                  {s.metrica ? <span className="meme-vistas">{formatoVistas(s.metrica)}</span> : null}
                </span>
              </a>
            ))}
          </div>
        )}
      </main>

      <div className="protonote">Sala de producción · Jakiens</div>
    </div>
  );
}
