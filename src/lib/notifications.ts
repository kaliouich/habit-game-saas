"use client";

/**
 * Rappel quotidien local (Local Notifications, pas de push serveur) — le
 * levier de rétention le plus évident manquait entièrement. Local plutôt que
 * push : aucune infra serveur/APNs/FCM à opérer pour un premier jet, et
 * l'heure choisie reste un réglage par appareil (localStorage), cohérent
 * avec la nature de la notif elle-même (elle ne sert que CET appareil).
 * No-op silencieux hors app native (voir AdMobBanner.tsx pour le même
 * pattern d'import dynamique + guard Capacitor.isNativePlatform()).
 */
export const REMINDER_STORAGE_KEY = "habitcade:reminderTime";
const REMINDER_NOTIFICATION_ID = 4200;

export async function isNativePlatform(): Promise<boolean> {
  const { Capacitor } = await import("@capacitor/core");
  return Capacitor.isNativePlatform();
}

export function getSavedReminderTime(): string | null {
  try {
    return localStorage.getItem(REMINDER_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** @param time "HH:MM", 24h. Retourne false si hors app native ou permission refusée. */
export async function scheduleDailyReminder(time: string): Promise<boolean> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return false;

  const [hour, minute] = time.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return false;

  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return false;

  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_NOTIFICATION_ID }] });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_NOTIFICATION_ID,
        title: "Habitcade",
        body: "Don't break the streak — log today's habits.",
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
      },
    ],
  });

  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, time);
  } catch {
    /* per-device convenience only — pas grave si indisponible */
  }
  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_NOTIFICATION_ID }] });
  }
  try {
    localStorage.removeItem(REMINDER_STORAGE_KEY);
  } catch {
    /* idem */
  }
}
