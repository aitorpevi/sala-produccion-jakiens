import Link from "next/link";
import type { StaffTier } from "@/generated/prisma/enums";
import { PHASES, PHASE_STATE, STAFF_TIER_LABEL, type PhaseKey } from "@/lib/phases";
import { etapa as etapaDe } from "@/lib/etapas";
import { logoutAction, marcarAvisosLeidosAction } from "@/app/actions";
import { avisosPendientes } from "@/lib/avisos";

type Project = {
  client: string;
  name: string;
  code: string;
  director: string;
  agencia: string;
  shootLabel: string;
  location: string;
  format: string;
};

export function AppShell({
  project,
  basePath,
  currentPhase,
  allowedPhases,
  viewerLabel,
  children,
}: {
  project: Project;
  basePath: string;
  currentPhase: PhaseKey;
  allowedPhases: PhaseKey[];
  viewerLabel: React.ReactNode;
  children: React.ReactNode;
}) {
  const cells: [string, string, boolean?][] = [
    ["Código", project.code, true],
    ["Realizador", project.director],
    ["Agencia", project.agencia],
    ["Rodaje", project.shootLabel, true],
    ["Localización", project.location],
    ["Formato", project.format],
  ];

  return (
    <div className="shell">
      <header className="top">
        <Link href="/gestor" className="brand">
          <span className="wordmark">Jakiens</span>
          <span className="sub">Sala de producción</span>
        </Link>
        {/*
          Volver a la ficha, solo para el equipo interno. Se deduce del
          `basePath` en vez de pasarse como prop porque las vistas de
          colaborador (`/f/[token]`) usan este mismo armazón y NO deben ver un
          enlace al gestor: no tienen acceso y el enlace solo les daría un 404 y
          la sensación de que se les esconde algo.
        */}
        {basePath.startsWith("/p/") ? (
          <Link href={`/gestor/${project.code}`} className="volver-ficha">
            ← Ficha del proyecto
          </Link>
        ) : null}
        <div className="viewer">{viewerLabel}</div>
      </header>

      <section className="proj">
        <span className="eyebrow">— {project.client}</span>
        <h1>{project.name}</h1>
        <div className="meta">
          {cells.map(([k, v, mono]) => (
            <div className="cell" key={k}>
              <span className="k">{k}</span>
              <span className={`v ${mono ? "mono" : ""}`}>{v}</span>
            </div>
          ))}
        </div>
      </section>

      {/*
        Las mesas de trabajo, agrupadas bajo la etapa a la que pertenecen.
        
        Antes esta tira enseñaba números grandes 01..07 exactamente igual que la
        tira de etapas del gestor, que va de 01 a 05. Dos escalas distintas con
        la misma pinta: "03" era Materiales aquí y Rodaje allí. El número se ha
        ido y en su sitio está la etapa, que es lo que sí comparten las dos
        pantallas y lo que permite saber dónde estás.
      */}
      <nav className="phases" aria-label="Mesas de trabajo de la sala de producción">
        {PHASES.map((p) => {
          const state = PHASE_STATE[p.key];
          const dotClass = state === "done" ? "dot done" : state === "live" ? "dot live" : "dot";
          const allowed = allowedPhases.includes(p.key);
          const isCurrent = p.key === currentPhase;
          const info = etapaDe(p.etapa);
          const estilo = { ["--etapa" as string]: info.color };
          const cuerpo = (
            <>
              <span className={dotClass}></span>
              <span className="fase-etapa">
                <span className="etapa-punto" />
                {info.label}
              </span>
              <span className="plabel">{p.label}</span>
            </>
          );

          if (!allowed) {
            return (
              <button
                key={p.key}
                className="phase"
                style={estilo}
                disabled
                title="Sin acceso para este perfil"
              >
                {cuerpo}
              </button>
            );
          }
          return (
            <Link
              key={p.key}
              href={`${basePath}/${p.key}`}
              className="phase"
              style={estilo}
              aria-current={isCurrent ? "true" : undefined}
            >
              {cuerpo}
            </Link>
          );
        })}
      </nav>

      <main>{children}</main>

      <div className="protonote">Sala de producción · Jakiens</div>
    </div>
  );
}

/**
 * Cabecera de las pantallas que no cuelgan de un proyecto concreto (gestor,
 * alta de oportunidad, ficha). `AppShell` no sirve aquí porque incluye la barra
 * de las siete fases, que solo tiene sentido dentro de la sala de producción.
 */
export async function TopBar({
  staff,
  href = "/gestor",
}: {
  staff: { id: string; name: string; tier: StaffTier };
  href?: string;
}) {
  const avisos = await avisosPendientes(staff.id);

  return (
    <header className="top">
      <Link href={href} className="brand">
        <span className="wordmark">Jakiens</span>
        <span className="sub">Gestor de proyectos</span>
      </Link>
      <div className="viewer">
        {avisos.length > 0 ? (
          // `<details>` y no un menú de JavaScript: son cuatro líneas de HTML,
          // funcionan sin hidratar y no hay estado que se quede pegado.
          <details className="avisos">
            <summary className="btn ghost">
              Avisos <span className="avisos-punto">{avisos.length}</span>
            </summary>
            <div className="avisos-lista">
              {avisos.map((a) => (
                <Link key={a.id} href={a.url ?? "/gestor"} className="aviso">
                  {a.texto}
                </Link>
              ))}
              <form action={marcarAvisosLeidosAction}>
                <button className="btn ghost" type="submit">
                  Marcar como leídos
                </button>
              </form>
            </div>
          </details>
        ) : null}
        <StaffViewerLabel staff={staff} />
      </div>
    </header>
  );
}

export function ModHead({
  step,
  title,
  lead,
  scope,
}: {
  step: string;
  title: string;
  lead?: string;
  scope?: React.ReactNode;
}) {
  return (
    <div className="mod-head">
      <div className="htxt">
        <span className="step">Fase {step}</span>
        <h2>{title}</h2>
        {lead ? <p className="lead">{lead}</p> : null}
      </div>
      {scope ? <div className="scope-note">{scope}</div> : null}
    </div>
  );
}

export function ComingSoon({ step, title }: { step: string; title: string }) {
  return (
    <>
      <ModHead step={step} title={title} />
      <div className="empty">
        <span className="em-mono">Próximamente</span>
        Esta fase todavía no está conectada — llega en la siguiente iteración.
      </div>
    </>
  );
}

export function StaffViewerLabel({ staff }: { staff: { name: string; tier: StaffTier } }) {
  return (
    <>
      <span className="tag">
        {staff.name} · {STAFF_TIER_LABEL[staff.tier]}
      </span>
      <form action={logoutAction}>
        <button className="btn ghost" type="submit">
          Salir
        </button>
      </form>
    </>
  );
}
