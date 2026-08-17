import "server-only";
import { notFound, redirect } from "next/navigation";
import type { StaffTier } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { getStaffUserId } from "@/lib/session";
import { resolveAccessToken } from "@/lib/tokens";
import { firstAllowedPhaseForStaff, staffPhaseAllowed, type PhaseKey } from "@/lib/phases";

export async function requireStaff() {
  const userId = await getStaffUserId();
  if (!userId) redirect("/login");

  const staff = await db.staffUser.findUnique({ where: { id: userId } });
  if (!staff) redirect("/login");
  return staff;
}

export async function requireStaffAccess(code: string, phase: PhaseKey) {
  const staff = await requireStaff();

  const project = await db.project.findUnique({ where: { code } });
  if (!project) notFound();

  if (!staffPhaseAllowed(staff.tier, phase)) {
    redirect(`/p/${code}/${firstAllowedPhaseForStaff(staff.tier)}`);
  }

  return { project, staff };
}

export async function requireStaffTier(allowedTiers: StaffTier[]) {
  const staff = await requireStaff();
  if (!allowedTiers.includes(staff.tier)) redirect("/p");
  return staff;
}

export async function requireMemberByToken(token: string) {
  const member = await resolveAccessToken(token);
  if (!member) notFound();
  return member;
}
