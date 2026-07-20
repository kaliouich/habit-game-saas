-- Programme de parrainage (Sprint 5)
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN "referredById" TEXT;
ALTER TABLE "User" ADD COLUMN "referralCreditMonths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "referralCredited" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
