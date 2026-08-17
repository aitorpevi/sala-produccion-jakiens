import { redirect } from "next/navigation";
import { requireMemberByToken } from "@/lib/access";
import { firstAllowedPhase } from "@/lib/phases";

export default async function CollaboratorHome({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const member = await requireMemberByToken(token);
  redirect(`/f/${token}/${firstAllowedPhase(member)}`);
}
