"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DONATION_PRESETS, DONATION_MIN, DONATION_MAX } from "@/lib/config";

interface DonateFormProps {
  /** Server Action — reçoit `amount` (montant libre en euros). */
  action: (formData: FormData) => void;
}

/**
 * Don à montant libre : les presets ne font que pré-remplir le champ, c'est
 * toujours la valeur du champ qui part au serveur (revalidée là-bas).
 */
export function DonateForm({ action }: DonateFormProps) {
  const t = useTranslations("Billing.donate");
  const [amount, setAmount] = useState<string>("5");

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed >= DONATION_MIN && parsed <= DONATION_MAX;

  return (
    <form action={action} className="donate__form">
      <div className="donate__amounts">
        {DONATION_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={
              Number(amount) === preset ? "donate__amount donate__amount--active" : "donate__amount"
            }
            onClick={() => setAmount(String(preset))}
            aria-pressed={Number(amount) === preset}
          >
            €{preset}
          </button>
        ))}
      </div>

      <label className="donate__custom">
        <span className="donate__customlabel">{t("customAmount")}</span>
        <span className="donate__inputwrap">
          <span className="donate__currency">€</span>
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min={DONATION_MIN}
            max={DONATION_MAX}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="donate__input"
            aria-label={t("amountAria")}
            required
          />
        </span>
      </label>

      <button type="submit" className="btn btn--primary" disabled={!valid}>
        {valid ? t("donate", { amount: parsed.toFixed(2) }) : t("enterRange", { min: DONATION_MIN, max: DONATION_MAX })}
      </button>
    </form>
  );
}
