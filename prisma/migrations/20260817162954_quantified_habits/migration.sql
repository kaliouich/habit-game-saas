-- CreateEnum
CREATE TYPE "HabitUnit" AS ENUM ('TIMES', 'MINUTES', 'HOURS', 'COUNT', 'STEPS', 'KM', 'CALORIES');

-- AlterTable: Habit — unit/targetValue/unitLabel (Phase 1 roadmap)
ALTER TABLE "Habit" ADD COLUMN     "unit" "HabitUnit" NOT NULL DEFAULT 'TIMES';
ALTER TABLE "Habit" ADD COLUMN     "targetValue" DOUBLE PRECISION;
ALTER TABLE "Habit" ADD COLUMN     "unitLabel" TEXT;

-- AlterTable: HabitLog.completed (Boolean, always true per project convention —
-- check = create row, uncheck = delete row) becomes HabitLog.value (Float).
-- `value = 1` for every existing row reproduces `completed: true` exactly.
ALTER TABLE "HabitLog" ADD COLUMN     "value" DOUBLE PRECISION NOT NULL DEFAULT 1;
UPDATE "HabitLog" SET "value" = 1 WHERE "completed" = true;
ALTER TABLE "HabitLog" DROP COLUMN "completed";
