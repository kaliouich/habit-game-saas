import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    habit: { count: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/user", () => ({
  getCurrentUser: vi.fn(),
}));

import { createHabit } from "./habits";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

const mockedPrisma = vi.mocked(prisma, { deep: true });
const mockedGetCurrentUser = vi.mocked(getCurrentUser);

describe("createHabit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentUser.mockResolvedValue({ id: "user_1", plan: "FREE" } as never);
    mockedPrisma.habit.findFirst.mockResolvedValue(null);
  });

  it("crée une habitude BUILD classique en position 0 pour un compte sans habitude", async () => {
    mockedPrisma.habit.count.mockResolvedValue(0);

    const res = await createHabit({ name: "Gym", emoji: "🏋" });

    expect(res).toEqual({ ok: true });
    expect(mockedPrisma.habit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_1",
        name: "Gym",
        emoji: "🏋",
        type: "BUILD",
        position: 0,
        quitStartedAt: null,
        unit: "TIMES",
        targetValue: null,
      }),
    });
  });

  it("place la nouvelle habitude juste après la dernière position existante", async () => {
    mockedPrisma.habit.count.mockResolvedValue(2);
    mockedPrisma.habit.findFirst.mockResolvedValue({ position: 4 } as never);

    await createHabit({ name: "Reading" });

    expect(mockedPrisma.habit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 5 }) }),
    );
  });

  it("une habitude QUIT démarre son compteur d'abstinence à la création", async () => {
    mockedPrisma.habit.count.mockResolvedValue(0);
    const before = Date.now();

    await createHabit({ name: "No smoking", type: "QUIT" });

    const call = mockedPrisma.habit.create.mock.calls[0][0];
    expect(call.data.type).toBe("QUIT");
    expect((call.data.quitStartedAt as Date).getTime()).toBeGreaterThanOrEqual(before);
  });

  it("refuse la création au-delà du quota du plan FREE, sans toucher la base", async () => {
    mockedPrisma.habit.count.mockResolvedValue(5); // FREE = 5 habitudes actives max

    const res = await createHabit({ name: "Une de trop" });

    expect(res.ok).toBe(false);
    expect(res.error).toContain("FREE");
    expect(mockedPrisma.habit.create).not.toHaveBeenCalled();
  });

  it("un compte PRO n'est pas plafonné à la même limite qu'un compte FREE", async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: "user_1", plan: "PRO" } as never);
    mockedPrisma.habit.count.mockResolvedValue(5); // aurait bloqué un FREE

    const res = await createHabit({ name: "Habitude PRO" });

    expect(res).toEqual({ ok: true });
    expect(mockedPrisma.habit.create).toHaveBeenCalled();
  });

  it("rejette un nom vide avant tout appel à la base", async () => {
    await expect(createHabit({ name: "" })).rejects.toThrow();
    expect(mockedPrisma.habit.count).not.toHaveBeenCalled();
  });

  it("une habitude COUNT garde son unitLabel, les autres unités l'ignorent", async () => {
    mockedPrisma.habit.count.mockResolvedValue(0);

    await createHabit({ name: "Verres d'eau", unit: "COUNT", unitLabel: "verres", targetValue: 8 });
    expect(mockedPrisma.habit.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ unitLabel: "verres", targetValue: 8 }) }),
    );

    await createHabit({ name: "Pas", unit: "STEPS", unitLabel: "ignoré", targetValue: 10000 });
    expect(mockedPrisma.habit.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ unitLabel: null, targetValue: 10000 }) }),
    );
  });
});
