import { requireStaffAccess } from "@/lib/access";
import { AppShell, ComingSoon, StaffViewerLabel } from "@/components/AppShell";
import { STAFF_PHASE_ACCESS } from "@/lib/phases";

export default async function CierrePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { project, staff } = await requireStaffAccess(code, "cierre");

  return (
    <AppShell
      project={project}
      basePath={`/p/${project.code}`}
      currentPhase="cierre"
      allowedPhases={STAFF_PHASE_ACCESS[staff.tier]}
      viewerLabel={<StaffViewerLabel staff={staff} />}
    >
      <ComingSoon step="07" title="Cierre" />
    </AppShell>
  );
}
