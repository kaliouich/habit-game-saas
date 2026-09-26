"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/lib/actions/locale";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";

interface LanguageSwitcherProps {
  className?: string;
  /** Options réduites au code ("FR") plutôt qu'au nom complet ("Français") —
   *  pour la nav marketing mobile, où même "Tableau de bord" (FR) + le
   *  sélecteur doivent tenir à côté du logo sans repasser par un masquage
   *  complet (l'ancienne solution privait les visiteurs mobiles de tout
   *  moyen de changer de langue sur la page d'accueil). */
  compact?: boolean;
}

export function LanguageSwitcher({ className, compact }: LanguageSwitcherProps) {
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
          {compact ? l.toUpperCase() : LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
