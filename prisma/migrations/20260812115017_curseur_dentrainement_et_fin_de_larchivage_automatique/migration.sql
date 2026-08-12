-- AlterTable
ALTER TABLE "Atom" ADD COLUMN     "trainedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Atom_userId_trainedAt_idx" ON "Atom"("userId", "trainedAt");
