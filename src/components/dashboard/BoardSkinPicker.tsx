"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { BOARD_SKINS, type BoardSkinKey } from "@/lib/config";
import { setBoardSkin } from "@/lib/actions/settings";

interface BoardSkinPickerProps {
  current: BoardSkinKey;
  plan: "FREE" | "PRO";
}

/**
 * Sélecteur de thème (Midnight rebuild) — 1 seul gratuit (imposé sur le plan
 * Free), 5 réservés au Pro. Le verrou est décoratif : `setBoardSkin` revalide
 * le tier côté serveur, et `resolveBoardSkin` force le thème gratuit au rendu.
 */
export function BoardSkinPicker({ current, plan }: BoardSkinPickerProps) {
  const t = useTranslations("Dashboard.skinPicker");
  const [, startTransition] = useTransition();
  const lockedCount = BOARD_SKINS.filter((s) => s.tier === "pro").length;

  return (
    <div className="skinpicker">
      <p className="skinpicker__label">
        {t("theme")}
        {plan !== "PRO" && <span className="skinpicker__badge">{t("free")}</span>}
      </p>
      <div className="skinpicker__row">
        {BOARD_SKINS.map((skin) => {
          const locked = skin.tier === "pro" && plan !== "PRO";
          return (
            <button
              key={skin.key}
              type="button"
              className={`skinpicker__swatch${current === skin.key ? " skinpicker__swatch--active" : ""}${
                locked ? " skinpicker__swatch--locked" : ""
              }`}
              style={{ background: skin.check }}
              title={locked ? t("proSuffix", { label: skin.label }) : skin.label}
              aria-label={locked ? t("requiresPro", { label: skin.label }) : t("useSkin", { label: skin.label })}
              onClick={() => {
                if (locked) return;
                startTransition(async () => {
                  await setBoardSkin({ skin: skin.key });
                });
              }}
            >
              {locked && <span className="skinpicker__lock">🔒</span>}
            </button>
          );
        })}
      </div>
      {plan !== "PRO" && (
        <Link href="/pricing" className="skinpicker__upsell">
          {t("unlockMore", { count: lockedCount })}
        </Link>
      )}
    </div>
  );
}
