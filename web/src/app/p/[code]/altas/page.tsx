import { requireProductionProject } from "@/lib/access";
import { AppShell, ComingSoon } from "@/components/AppShell";
import { PHASES } from "@/lib/phases";
import { logoutAction } from "@/app/actions";

export default async function AltasPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const project = await requireProductionProject(code);

  return (
    <AppShell
      project={project}
      basePath={`/p/${project.code}`}
      currentPhase="altas"
      allowedPhases={PHASES.map((p) => p.key)}
      viewerLabel={
        <>
          <span className="tag">Producción</span>
          <form action={logoutAction}>
            <button className="btn ghost" type="submit">
              Salir
            </button>
          </form>
        </>
      }
    >
      <ComingSoon step="04" title="Altas laborales" />
    </AppShell>
  );
}
