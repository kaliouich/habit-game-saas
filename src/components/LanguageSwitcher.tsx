"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/lib/actions/locale";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("Common");
  const [isPending, startTransition] = useTransition();

  return (
    <select
      className={className ?? "langswitcher"}
      value={locale}
      disabled={isPending}
      aria-label={t("language")}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await setLocale(next);
        });
      }}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
