-- Les deux modes de révision. Un passage d'entraînement ne replanifie rien :
-- il est enregistré comme histoire, pas comme mesure de mémoire.

-- CreateEnum
CREATE TYPE "ReviewMode" AS ENUM ('SESSION', 'TRAINING');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "mode" "ReviewMode" NOT NULL DEFAULT 'SESSION';

-- AlterTable : les compteurs existants sont renommés, pas recréés. Ils portent
-- les passages en session déjà faits, et la rotation s'en sert pour choisir la
-- prochaine formulation — les perdre reviendrait à reservir ce qui vient d'être
-- vu.
ALTER TABLE "Variant" RENAME COLUMN "seenCount" TO "sessionCount";
ALTER TABLE "Variant" RENAME COLUMN "lastSeenAt" TO "lastSessionAt";

ALTER TABLE "Variant" ADD COLUMN "trainingCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Variant" ADD COLUMN "lastTrainedAt" TIMESTAMP(3);
