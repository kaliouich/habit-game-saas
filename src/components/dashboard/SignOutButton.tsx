"use client";

import { useTransition } from "react";
import { signOutAction } from "@/lib/actions/auth";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="sidebar__signout"
      disabled={isPending}
      onClick={() => startTransition(() => signOutAction())}
    >
      Sign out
    </button>
  );
}
