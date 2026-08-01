-- Sprint 7 : Streak Shields — un jour manqué absorbé, traité comme une pause
-- par le calcul de série (voir lib/stats.ts). Voir PRO-PLAN.md.

CREATE TABLE "StreakShield" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreakShield_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StreakShield_userId_date_key" ON "StreakShield"("userId", "date");
CREATE INDEX "StreakShield_userId_idx" ON "StreakShield"("userId");

ALTER TABLE "StreakShield" ADD CONSTRAINT "StreakShield_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
