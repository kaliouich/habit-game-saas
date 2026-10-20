"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { HABIT_REMINDER_ID_BASE, planHabitReminders, type ReminderHabit } from "@/lib/reminders";

/** Aligne les notifications locales de l'appareil sur les rappels enregistrés
 *  en base : l'heure se règle une fois dans le menu de l'habitude et suit
 *  l'utilisateur d'un appareil à l'autre. Sans effet hors app native. */
export function HabitReminderSync({ habits }: { habits: ReminderHabit[] }) {
  const t = useTranslations("Dashboard.habitMenu");
  const plan = planHabitReminders(habits);
  // Signature stable : ne resynchronise que si un rappel a réellement changé.
  const signature = JSON.stringify(plan.map((p) => [p.id, p.habitName, p.emoji, p.hour, p.minute, p.weekday ?? 0]));
  const body = t("reminderBody");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform() || cancelled) return;
        const { LocalNotifications } = await import("@capacitor/local-notifications");

        const pending = await LocalNotifications.getPending();
        const stale = pending.notifications.filter((n) => n.id >= HABIT_REMINDER_ID_BASE);
        if (stale.length > 0) await LocalNotifications.cancel({ notifications: stale.map((n) => ({ id: n.id })) });
        if (plan.length === 0 || cancelled) return;

        const perm = await LocalNotifications.requestPermissions();
        if (perm.display !== "granted") return;
        await LocalNotifications.schedule({
          notifications: plan.map((p) => ({
            id: p.id,
            title: `${p.emoji ? `${p.emoji} ` : ""}${p.habitName}`,
            body,
            schedule: {
              on: { ...(p.weekday ? { weekday: p.weekday } : {}), hour: p.hour, minute: p.minute },
              repeats: true,
              allowWhileIdle: true,
            },
          })),
        });
      } catch {
        /* rappel = confort : une erreur de plugin ne doit jamais casser le tableau de bord */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, body]);

  return null;
}
