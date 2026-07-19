"use server";

import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";

const EmailSchema = z.string().trim().email();

export async function signInWithEmail(formData: FormData) {
  const email = EmailSchema.parse(String(formData.get("email") ?? ""));
  await signIn("resend", { email, redirectTo: "/app" });
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/app" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
