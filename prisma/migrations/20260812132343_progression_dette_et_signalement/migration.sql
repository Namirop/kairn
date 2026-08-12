-- CreateEnum
CREATE TYPE "MotifDeSignalement" AS ENUM ('INCOMPREHENSIBLE', 'FAUSSE', 'HORS_SUJET', 'TROP_FACILE');

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "spacingIntroSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserStats" ADD COLUMN     "backlogSince" DATE;

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "promptVersion" TEXT;

-- CreateTable
CREATE TABLE "Signalement" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "variantId" TEXT,
    "atomId" TEXT,
    "inputId" TEXT,
    "motif" "MotifDeSignalement" NOT NULL,
    "commentaire" TEXT,
    "question" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "reponse" TEXT NOT NULL,
    "format" "VariantFormat" NOT NULL,
    "facet" "VariantFacet" NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signalement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signalement_createdAt_idx" ON "Signalement"("createdAt");

-- AddForeignKey
ALTER TABLE "Signalement" ADD CONSTRAINT "Signalement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signalement" ADD CONSTRAINT "Signalement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
