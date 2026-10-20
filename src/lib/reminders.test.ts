import { describe, expect, it } from "vitest";
import { HABIT_REMINDER_ID_BASE, parseReminderTime, planHabitReminders, type ReminderHabit } from "./reminders";

const habit = (over: Partial<ReminderHabit> = {}): ReminderHabit => ({
  id: "h1",
  name: "Gym",
  emoji: "🏋",
  type: "BUILD",
  reminderTime: "07:30",
  ...over,
});

describe("parseReminderTime", () => {
  it("accepte HH:MM 24h, refuse le reste", () => {
    expect(parseReminderTime("07:30")).toEqual({ hour: 7, minute: 30 });
    expect(parseReminderTime("23:59")).toEqual({ hour: 23, minute: 59 });
    for (const bad of ["24:00", "7:30", "07:60", "", null, undefined, "abc"]) expect(parseReminderTime(bad)).toBeNull();
  });
});

describe("planHabitReminders", () => {
  it("une notification quotidienne pour une habitude de tous les jours", () => {
    const plan = planHabitReminders([habit()]);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ hour: 7, minute: 30, habitName: "Gym" });
    expect(plan[0].weekday).toBeUndefined();
    expect(plan[0].id).toBeGreaterThanOrEqual(HABIT_REMINDER_ID_BASE);
  });

  it("sept jours cochés équivalent à tous les jours", () => {
    expect(planHabitReminders([habit({ scheduleDays: [0, 1, 2, 3, 4, 5, 6] })])).toHaveLength(1);
  });

  it("une notification par jour prévu, weekday Capacitor = jour + 1", () => {
    const plan = planHabitReminders([habit({ scheduleDays: [5, 1, 3] })]);
    expect(plan.map((p) => p.weekday)).toEqual([2, 4, 6]); // lun, mer, ven
    expect(new Set(plan.map((p) => p.id)).size).toBe(3);
  });

  it("ignore QUIT, les heures absentes ou invalides", () => {
    const plan = planHabitReminders([
      habit({ id: "a", type: "QUIT" }),
      habit({ id: "b", reminderTime: null }),
      habit({ id: "c", reminderTime: "99:99" }),
      habit({ id: "d" }),
    ]);
    expect(plan.map((p) => p.habitId)).toEqual(["d"]);
  });

  it("ids stables d'un appel à l'autre et sans collision sur un lot réaliste", () => {
    const habits = Array.from({ length: 50 }, (_, i) => habit({ id: `cm${i}abcdefghijk`, scheduleDays: [1, 3] }));
    const a = planHabitReminders(habits).map((p) => p.id);
    const b = planHabitReminders(habits).map((p) => p.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
    expect(Math.max(...a)).toBeLessThan(2 ** 31);
  });
});
