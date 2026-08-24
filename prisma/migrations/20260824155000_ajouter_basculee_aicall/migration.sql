-- AlterTable
ALTER TABLE "AiCall" ADD COLUMN "basculee" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex : on lit ces lignes tous les jours pour l'alerte, l'index les rend gratuites.
CREATE INDEX "AiCall_basculee_createdAt_idx" ON "AiCall"("basculee", "createdAt") WHERE "basculee" = true;
