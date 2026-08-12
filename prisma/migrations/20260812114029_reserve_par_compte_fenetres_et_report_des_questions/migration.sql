-- AlterTable
ALTER TABLE "DailyUsage" ADD COLUMN     "actionWindowCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "actionWindowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "depositWindowCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "depositWindowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "GenerationJob" ADD COLUMN     "notBefore" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AiUserQuota" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUserQuota_pkey" PRIMARY KEY ("userId","day")
);

-- AddForeignKey
ALTER TABLE "AiUserQuota" ADD CONSTRAINT "AiUserQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
