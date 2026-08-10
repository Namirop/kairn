-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('SUBMITTED', 'ENDED', 'FAILED');

-- AlterTable
ALTER TABLE "GenerationJob" ADD COLUMN     "atomIds" TEXT[],
ADD COLUMN     "batchId" TEXT;

-- AlterTable
ALTER TABLE "Input" DROP COLUMN "imageUrl",
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "imageData" BYTEA,
ADD COLUMN     "imageMediaType" TEXT,
ADD COLUMN     "submissionKey" TEXT;

-- CreateTable
CREATE TABLE "AiBatch" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'SUBMITTED',
    "requests" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "polledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "AiBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "userId" TEXT NOT NULL,
    "motif" TEXT,
    "askedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiBatch_providerId_key" ON "AiBatch"("providerId");

-- CreateIndex
CREATE INDEX "AiBatch_status_createdAt_idx" ON "AiBatch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_batchId_idx" ON "GenerationJob"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "Input_userId_submissionKey_key" ON "Input"("userId", "submissionKey");

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AiBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

