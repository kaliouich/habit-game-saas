-- AlterTable: MoodLog.value devient nullable (une entrée peut ne renseigner
-- que motivation), et motivation est ajoutée. Aucune ligne existante affectée.
ALTER TABLE "MoodLog" ALTER COLUMN "value" DROP NOT NULL;
ALTER TABLE "MoodLog" ADD COLUMN "motivation" INTEGER;
