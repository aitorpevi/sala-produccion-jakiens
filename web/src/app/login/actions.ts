"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createStaffSession } from "@/lib/session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = email ? await db.staffUser.findUnique({ where: { email } }) : null;
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !valid) {
    redirect("/login?error=1");
  }

  await createStaffSession(user.id);
  redirect("/");
}
