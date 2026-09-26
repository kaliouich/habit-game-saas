"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { signOutAction } from "@/lib/actions/auth";

export function SignOutButton() {
  const t = useTranslations("Dashboard.sidebar");
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="sidebar__signout"
      disabled={isPending}
      onClick={() => startTransition(() => signOutAction())}
    >
      {t("signOut")}
    </button>
  );
}
