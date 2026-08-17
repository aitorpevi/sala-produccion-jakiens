import { redirect } from "next/navigation";
import { getStaffUserId } from "@/lib/session";

export default async function Home() {
  const userId = await getStaffUserId();
  if (!userId) redirect("/login");

  redirect("/p");
}
