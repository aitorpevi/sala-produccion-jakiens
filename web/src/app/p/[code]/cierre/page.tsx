import { requireProductionProject } from "@/lib/access";
import { AppShell, ComingSoon } from "@/components/AppShell";
import { PHASES } from "@/lib/phases";
import { logoutAction } from "@/app/actions";

export default async function CierrePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const project = await requireProductionProject(code);

  return (
    <AppShell
      project={project}
      basePath={`/p/${project.code}`}
      currentPhase="cierre"
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
      <ComingSoon step="06" title="Cierre" />
    </AppShell>
  );
}
