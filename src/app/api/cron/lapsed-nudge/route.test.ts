import { describe, it, expect, vi, beforeEach } from "vitest";
import { todayInTz, prevDay } from "@/lib/dates";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: vi.fn() } },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const mockedPrisma = vi.mocked(prisma, { deep: true });
const mockedSendEmail = vi.mocked(sendEmail);

const TZ = "Europe/Paris";
const today = todayInTz(TZ);
const threeDaysAgo = prevDay(prevDay(prevDay(today)));
const twoDaysAgo = prevDay(prevDay(today));
const fourDaysAgo = prevDay(threeDaysAgo);

function makeUser(overrides: { id: string; email: string; logDates: string[] }) {
  return {
    id: overrides.id,
    email: overrides.email,
    timezone: TZ,
    habits: [{ logs: overrides.logDates.map((date) => ({ date })) }],
  };
}

function makeRequest(secret: string | null): Request {
  return new Request("http://localhost/api/cron/lapsed-nudge", {
    method: "POST",
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

describe("POST /api/cron/lapsed-nudge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron_test_secret";
    mockedSendEmail.mockResolvedValue({ ok: true });
  });

  it("refuse une requête sans le bon secret", async () => {
    const res = await POST(makeRequest("wrong"));
    expect(res.status).toBe(401);
    expect(mockedPrisma.user.findMany).not.toHaveBeenCalled();
  });

  it("refuse une requête si CRON_SECRET n'est pas configuré côté serveur", async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(makeRequest("anything"));
    expect(res.status).toBe(401);
  });

  it("relance un compte dont le dernier log remonte à exactement 3 jours", async () => {
    mockedPrisma.user.findMany.mockResolvedValue([
      makeUser({ id: "u1", email: "lapsed@example.com", logDates: [threeDaysAgo] }),
    ] as never);

    const res = await POST(makeRequest("cron_test_secret"));
    expect(await res.json()).toEqual({ sent: 1, skipped: 0, total: 1 });
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "lapsed@example.com" }),
    );
  });

  it("ne relance pas un compte actif il y a 2 jours seulement", async () => {
    mockedPrisma.user.findMany.mockResolvedValue([
      makeUser({ id: "u1", email: "active@example.com", logDates: [twoDaysAgo] }),
    ] as never);

    const res = await POST(makeRequest("cron_test_secret"));
    expect(await res.json()).toEqual({ sent: 0, skipped: 1, total: 1 });
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it("ne relance plus un compte déjà inactif depuis 4 jours (évite le spam quotidien)", async () => {
    mockedPrisma.user.findMany.mockResolvedValue([
      makeUser({ id: "u1", email: "gone@example.com", logDates: [fourDaysAgo] }),
    ] as never);

    const res = await POST(makeRequest("cron_test_secret"));
    expect(await res.json()).toEqual({ sent: 0, skipped: 1, total: 1 });
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it("ignore un compte qui n'a jamais coché la moindre habitude", async () => {
    mockedPrisma.user.findMany.mockResolvedValue([
      makeUser({ id: "u1", email: "never@example.com", logDates: [] }),
    ] as never);

    const res = await POST(makeRequest("cron_test_secret"));
    expect(await res.json()).toEqual({ sent: 0, skipped: 1, total: 1 });
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it("utilise le log le plus récent parmi plusieurs habitudes, pas le premier trouvé", async () => {
    mockedPrisma.user.findMany.mockResolvedValue([
      {
        id: "u1",
        email: "multi@example.com",
        timezone: TZ,
        habits: [{ logs: [{ date: fourDaysAgo }] }, { logs: [{ date: threeDaysAgo }] }],
      },
    ] as never);

    const res = await POST(makeRequest("cron_test_secret"));
    expect(await res.json()).toEqual({ sent: 1, skipped: 0, total: 1 });
  });

  it("compte comme skip un envoi d'email en échec, sans faire planter la relance des autres", async () => {
    mockedSendEmail.mockResolvedValueOnce({ ok: false });
    mockedPrisma.user.findMany.mockResolvedValue([
      makeUser({ id: "u1", email: "fails@example.com", logDates: [threeDaysAgo] }),
    ] as never);

    const res = await POST(makeRequest("cron_test_secret"));
    expect(await res.json()).toEqual({ sent: 0, skipped: 1, total: 1 });
  });
});
