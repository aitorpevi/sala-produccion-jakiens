"use server";

import { redirect } from "next/navigation";
import { destroyProductionSession } from "@/lib/session";

export async function logoutAction() {
  await destroyProductionSession();
  redirect("/login");
}
