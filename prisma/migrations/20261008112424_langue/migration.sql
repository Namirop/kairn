-- CreateEnum
CREATE TYPE "Langue" AS ENUM ('FR', 'EN');

-- AlterTable
ALTER TABLE "Input" ADD COLUMN     "langue" "Langue" NOT NULL DEFAULT 'FR';

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "langue" "Langue" NOT NULL DEFAULT 'FR';
