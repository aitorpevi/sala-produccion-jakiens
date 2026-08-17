import { requireStaffAccess } from "@/lib/access";
import { AppShell, ComingSoon, StaffViewerLabel } from "@/components/AppShell";
import { STAFF_PHASE_ACCESS } from "@/lib/phases";

export default async function RodajePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { project, staff } = await requireStaffAccess(code, "rodaje");

  return (
    <AppShell
      project={project}
      basePath={`/p/${project.code}`}
      currentPhase="rodaje"
      allowedPhases={STAFF_PHASE_ACCESS[staff.tier]}
      viewerLabel={<StaffViewerLabel staff={staff} />}
    >
      <ComingSoon step="05" title="Rodaje" />
    </AppShell>
  );
}
