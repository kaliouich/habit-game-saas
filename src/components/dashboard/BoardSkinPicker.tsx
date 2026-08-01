"use client";

import Link from "next/link";
import { useTransition } from "react";
import { BOARD_SKINS, type BoardSkinKey } from "@/lib/config";
import { setBoardSkin } from "@/lib/actions/settings";

interface BoardSkinPickerProps {
  current: BoardSkinKey;
  plan: "FREE" | "PRO";
}

/** Sélecteur de skin cosmétique — 2 gratuits, 6 verrouillés sans Pro (Sprint 6). */
export function BoardSkinPicker({ current, plan }: BoardSkinPickerProps) {
  const [, startTransition] = useTransition();
  const lockedCount = BOARD_SKINS.filter((s) => s.tier === "pro").length;

  return (
    <div className="skinpicker">
      <p className="skinpicker__label">Board skin</p>
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
              title={locked ? `${skin.label} (Pro)` : skin.label}
              aria-label={locked ? `${skin.label}, requires Pro` : `Use ${skin.label} skin`}
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
          Unlock all {lockedCount} Pro skins →
        </Link>
      )}
    </div>
  );
}
