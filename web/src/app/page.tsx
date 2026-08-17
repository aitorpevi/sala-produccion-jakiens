import { redirect } from "next/navigation";
import { getStaffUserId } from "@/lib/session";
import { db } from "@/lib/db";
import { firstAllowedPhaseForStaff } from "@/lib/phases";

export default async function Home() {
  const userId = await getStaffUserId();
  if (!userId) redirect("/login");

  const staff = await db.staffUser.findUnique({ where: { id: userId } });
  if (!staff) redirect("/login");

  const project = await db.project.findFirst({ orderBy: { createdAt: "asc" } });
  if (!project) redirect("/login");

  redirect(`/p/${project.code}/${firstAllowedPhaseForStaff(staff.tier)}`);
}
