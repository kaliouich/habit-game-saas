-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "scheduleDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
