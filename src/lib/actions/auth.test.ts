import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { signInWithEmail, signInWithGoogle, signInWithGoogleMobile, signOutAction } from "./auth";
import { signIn, signOut } from "@/lib/auth";

const mockedSignIn = vi.mocked(signIn);
const mockedSignOut = vi.mocked(signOut);

function emailForm(email: string) {
  const fd = new FormData();
  fd.set("email", email);
  return fd;
}

describe("auth server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signInWithEmail", () => {
    it("déclenche le lien magique Resend pour une adresse valide, redirige vers /app", async () => {
      await signInWithEmail(emailForm("user@example.com"));
      expect(mockedSignIn).toHaveBeenCalledWith("resend", { email: "user@example.com", redirectTo: "/app" });
    });

    it("normalise les espaces autour de l'adresse", async () => {
      await signInWithEmail(emailForm("  user@example.com  "));
      expect(mockedSignIn).toHaveBeenCalledWith("resend", { email: "user@example.com", redirectTo: "/app" });
    });

    it("rejette une adresse invalide sans jamais appeler signIn", async () => {
      await expect(signInWithEmail(emailForm("not-an-email"))).rejects.toThrow();
      expect(mockedSignIn).not.toHaveBeenCalled();
    });

    it("rejette un champ email absent", async () => {
      await expect(signInWithEmail(new FormData())).rejects.toThrow();
      expect(mockedSignIn).not.toHaveBeenCalled();
    });
  });

  it("signInWithGoogle redirige vers /app après le flux Google", async () => {
    await signInWithGoogle();
    expect(mockedSignIn).toHaveBeenCalledWith("google", { redirectTo: "/app" });
  });

  it("signInWithGoogleMobile redirige vers le pont de session mobile, pas /app directement", async () => {
    await signInWithGoogleMobile();
    expect(mockedSignIn).toHaveBeenCalledWith("google", { redirectTo: "/api/auth/mobile/bridge" });
  });

  it("signOutAction renvoie vers la page d'accueil, pas /login", async () => {
    await signOutAction();
    expect(mockedSignOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });
});
