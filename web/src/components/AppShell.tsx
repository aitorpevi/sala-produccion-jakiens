import Link from "next/link";
import type { StaffTier } from "@/generated/prisma/enums";
import { PHASES, PHASE_STATE, STAFF_TIER_LABEL, type PhaseKey } from "@/lib/phases";
import { logoutAction } from "@/app/actions";

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
        <Link href="/p" className="brand">
          <span className="wordmark">Jakiens</span>
          <span className="sub">Sala de producción</span>
        </Link>
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

      <nav className="phases" aria-label="Fases del proyecto">
        {PHASES.map((p) => {
          const state = PHASE_STATE[p.key];
          const dotClass = state === "done" ? "dot done" : state === "live" ? "dot live" : "dot";
          const allowed = allowedPhases.includes(p.key);
          const isCurrent = p.key === currentPhase;
          if (!allowed) {
            return (
              <button key={p.key} className="phase" disabled title="Sin acceso para este perfil">
                <span className={dotClass}></span>
                <span className="num">{p.n}</span>
                <span className="plabel">{p.label}</span>
              </button>
            );
          }
          return (
            <Link
              key={p.key}
              href={`${basePath}/${p.key}`}
              className="phase"
              aria-current={isCurrent ? "true" : undefined}
            >
              <span className={dotClass}></span>
              <span className="num">{p.n}</span>
              <span className="plabel">{p.label}</span>
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
export function TopBar({
  staff,
  href = "/gestor",
}: {
  staff: { name: string; tier: StaffTier };
  href?: string;
}) {
  return (
    <header className="top">
      <Link href={href} className="brand">
        <span className="wordmark">Jakiens</span>
        <span className="sub">Gestor de proyectos</span>
      </Link>
      <div className="viewer">
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
