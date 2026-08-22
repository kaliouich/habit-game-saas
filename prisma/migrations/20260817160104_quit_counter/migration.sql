-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "quitStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "HabitRelapse" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "HabitRelapse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HabitRelapse_habitId_occurredAt_idx" ON "HabitRelapse"("habitId", "occurredAt");

-- AddForeignKey
ALTER TABLE "HabitRelapse" ADD CONSTRAINT "HabitRelapse_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
