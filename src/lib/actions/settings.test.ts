import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { update: vi.fn() } } }));
vi.mock("@/lib/user", () => ({ getCurrentUser: vi.fn() }));

import { setDayStartHour } from "./settings";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

const mockedPrisma = vi.mocked(prisma, { deep: true });

describe("setDayStartHour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user_1" } as never);
  });

  it("enregistre une heure valide pour l'utilisateur courant", async () => {
    await expect(setDayStartHour({ hour: 4 })).resolves.toEqual({ ok: true });
    expect(mockedPrisma.user.update).toHaveBeenCalledWith({ where: { id: "user_1" }, data: { dayStartHour: 4 } });
  });

  it.each([-1, 7, 24, 2.5, "4", null])("rejette %j sans toucher la base", async (hour) => {
    await expect(setDayStartHour({ hour })).rejects.toThrow();
    expect(mockedPrisma.user.update).not.toHaveBeenCalled();
  });
});
