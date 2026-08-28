-- CreateEnum
CREATE TYPE "SujetDeRetour" AS ENUM ('BUG', 'TEXTE', 'COMPORTEMENT', 'AUTRE');

-- CreateTable
CREATE TABLE "Retour" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sujet" "SujetDeRetour" NOT NULL,
    "message" TEXT NOT NULL,
    "ecran" TEXT,
    "contexte" TEXT,
    "captureData" BYTEA,
    "captureMediaType" TEXT,
    "traiteLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Retour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Retour_traiteLe_createdAt_idx" ON "Retour"("traiteLe", "createdAt");

-- CreateIndex
CREATE INDEX "Retour_userId_createdAt_idx" ON "Retour"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Retour" ADD CONSTRAINT "Retour_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
