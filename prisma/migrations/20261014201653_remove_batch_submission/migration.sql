-- Retire l'envoi groupé (Message Batches), abandonné au passage à OpenRouter :
-- plus aucun code ne crée de lot ni ne lit `batchId`.

-- DropForeignKey
ALTER TABLE "GenerationJob" DROP CONSTRAINT "GenerationJob_batchId_fkey";

-- DropIndex
DROP INDEX "GenerationJob_batchId_idx";

-- AlterTable
ALTER TABLE "GenerationJob" DROP COLUMN "batchId";

-- DropTable
DROP TABLE "AiBatch";

-- DropEnum
DROP TYPE "BatchStatus";
