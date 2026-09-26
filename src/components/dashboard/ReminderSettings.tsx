"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  cancelDailyReminder,
  getSavedReminderTime,
  isNativePlatform,
  scheduleDailyReminder,
} from "@/lib/notifications";

const DEFAULT_TIME = "08:00";

/** Web no-op (voir notifications.ts) : ne se rend que dans l'app native,
 *  où seul un rappel local a un sens. */
export function ReminderSettings() {
  const t = useTranslations("Dashboard.reminders");
  const [native, setNative] = useState(false);
  const [checked, setChecked] = useState(false);
  const [time, setTime] = useState(DEFAULT_TIME);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    isNativePlatform().then((isNative) => {
      setNative(isNative);
      setChecked(true);
      if (isNative) {
        const saved = getSavedReminderTime();
        if (saved) {
          setTime(saved);
          setEnabled(true);
        }
      }
    });
  }, []);

  if (!checked || !native) return null;

  function save() {
    setError(null);
    startTransition(async () => {
      const ok = await scheduleDailyReminder(time);
      if (ok) {
        setEnabled(true);
      } else {
        setError(t("permissionError"));
      }
    });
  }

  function turnOff() {
    startTransition(async () => {
      await cancelDailyReminder();
      setEnabled(false);
    });
  }

  return (
    <div className="remindersettings">
      <p className="remindersettings__text">🔔 {t("title")}</p>
      <div className="remindersettings__row">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="remindersettings__time"
          aria-label={t("timeAria")}
        />
        <button type="button" className="btn btn--secondary btn--nav" onClick={save} disabled={isPending}>
          {isPending ? "…" : enabled ? t("update") : t("set")}
        </button>
      </div>
      {enabled && (
        <p className="remindersettings__hint">
          {t("remindingAt", { time })}{" "}
          <button type="button" className="remindersettings__off" onClick={turnOff}>
            {t("turnOff")}
          </button>
        </p>
      )}
      {error && <p className="remindersettings__error">{error}</p>}
    </div>
  );
}
