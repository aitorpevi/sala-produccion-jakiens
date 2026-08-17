import { redirect } from "next/navigation";
import { getProductionUserId } from "@/lib/session";
import { db } from "@/lib/db";

export default async function Home() {
  const userId = await getProductionUserId();
  if (!userId) redirect("/login");

  const project = await db.project.findFirst({ orderBy: { createdAt: "asc" } });
  if (!project) redirect("/login");

  redirect(`/p/${project.code}/equipo`);
}
