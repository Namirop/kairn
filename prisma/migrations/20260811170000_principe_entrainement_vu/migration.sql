-- L'explication du principe de l'entraînement libre n'est montrée qu'une fois.

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN "trainingIntroSeenAt" TIMESTAMP(3);
