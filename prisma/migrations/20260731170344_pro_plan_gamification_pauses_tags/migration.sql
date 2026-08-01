-- Sprint 6 : Pro à 0.99€/mois (facturé 9.99€/an), gamification, board skins,
-- pause / vacation mode, tags et notes de log. Voir PRO-PLAN.md.

-- Board skin (cosmétique, User)
ALTER TABLE "User" ADD COLUMN "boardSkin" TEXT NOT NULL DEFAULT 'classic';

-- Tags libres par habitude (Pro)
ALTER TABLE "Habit" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Note par log (Pro)
ALTER TABLE "HabitLog" ADD COLUMN "note" TEXT;

-- Pause / vacation mode (Pro) : les jours [from, to] n'entrent ni ne cassent un streak.
CREATE TABLE "HabitPause" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,

    CONSTRAINT "HabitPause_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HabitPause_habitId_idx" ON "HabitPause"("habitId");

ALTER TABLE "HabitPause" ADD CONSTRAINT "HabitPause_habitId_fkey"
  FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
