import "server-only";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getProductionUserId } from "@/lib/session";
import { resolveAccessToken } from "@/lib/tokens";

export async function requireProductionProject(code: string) {
  const userId = await getProductionUserId();
  if (!userId) redirect("/login");

  const project = await db.project.findUnique({ where: { code } });
  if (!project) notFound();
  return project;
}

export async function requireMemberByToken(token: string) {
  const member = await resolveAccessToken(token);
  if (!member) notFound();
  return member;
}
