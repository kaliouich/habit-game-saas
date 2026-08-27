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

/**
 * Pont de session Google natif (Custom Tabs → WebView) — voir MOBILE_SETUP.md.
 * Structurellement identique à signInWithGoogle, seul `redirectTo` change :
 * passe par /api/auth/mobile/bridge (émission du code d'échange) plutôt que
 * d'atterrir directement sur /app. Doit rester invoquée comme Server Action
 * (via un <form action>, voir src/app/auth/mobile/start/page.tsx) — appelée
 * depuis un Route Handler GET ordinaire, signIn() redirige vers la page de
 * connexion générique d'Auth.js (/api/auth/signin) au lieu d'aller direct
 * chez Google, seule la vraie Server Action déclenche le comportement attendu.
 */
export async function signInWithGoogleMobile() {
  await signIn("google", { redirectTo: "/api/auth/mobile/bridge" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
