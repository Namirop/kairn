-- AlterTable
ALTER TABLE "Atom" ADD COLUMN     "anonymousSessionId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Input" ADD COLUMN     "anonymousSessionId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AnonymousSession" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonymousSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnonymousSession_ipHash_createdAt_idx" ON "AnonymousSession"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "AnonymousSession_claimedAt_createdAt_idx" ON "AnonymousSession"("claimedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Atom_anonymousSessionId_idx" ON "Atom"("anonymousSessionId");

-- CreateIndex
CREATE INDEX "Input_anonymousSessionId_idx" ON "Input"("anonymousSessionId");

-- AddForeignKey
ALTER TABLE "Input" ADD CONSTRAINT "Input_anonymousSessionId_fkey" FOREIGN KEY ("anonymousSessionId") REFERENCES "AnonymousSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atom" ADD CONSTRAINT "Atom_anonymousSessionId_fkey" FOREIGN KEY ("anonymousSessionId") REFERENCES "AnonymousSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
