-- CreateEnum
CREATE TYPE "CompteurDeQuota" AS ENUM ('GLOBAL', 'COMPTE', 'ANONYME');

-- CreateTable
CREATE TABLE "AlerteQuota" (
    "day" DATE NOT NULL,
    "compteur" "CompteurDeQuota" NOT NULL,
    "cible" TEXT NOT NULL,
    "seuil" INTEGER NOT NULL,
    "envoyeeA" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlerteQuota_pkey" PRIMARY KEY ("day","compteur","cible","seuil")
);
