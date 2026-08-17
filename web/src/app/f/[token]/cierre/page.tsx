import { notFound } from "next/navigation";
import { requireMemberByToken } from "@/lib/access";
import { AppShell, ComingSoon } from "@/components/AppShell";
import { PHASES, phaseAllowedForMember } from "@/lib/phases";

export default async function CollaboratorCierrePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const member = await requireMemberByToken(token);
  if (!phaseAllowedForMember(member, "cierre")) notFound();
  const allowedPhases = PHASES.map((p) => p.key).filter((k) => phaseAllowedForMember(member, k));

  return (
    <AppShell
      project={member.project}
      basePath={`/f/${token}`}
      currentPhase="cierre"
      allowedPhases={allowedPhases}
      viewerLabel={
        <>
          <div className="avatar">{member.person.initials}</div>
          <span className="tag">{member.person.name}</span>
        </>
      }
    >
      <ComingSoon step="06" title="Cierre" />
    </AppShell>
  );
}
