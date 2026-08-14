-- AlterTable
ALTER TABLE "Reglages" ADD COLUMN     "anonymousDailyCallCap" INTEGER;

-- CreateTable
CREATE TABLE "AiAnonymousQuota" (
    "day" DATE NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAnonymousQuota_pkey" PRIMARY KEY ("day")
);
