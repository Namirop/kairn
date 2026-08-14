-- CreateEnum
CREATE TYPE "InputNature" AS ENUM ('FACTUEL', 'FICTION', 'PERSONNEL');

-- AlterTable
ALTER TABLE "Input" ADD COLUMN     "nature" "InputNature";
