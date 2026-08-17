"use server";

import { redirect } from "next/navigation";
import { destroyStaffSession } from "@/lib/session";

export async function logoutAction() {
  await destroyStaffSession();
  redirect("/login");
}
