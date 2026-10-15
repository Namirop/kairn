-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvoisDeCode" (
    "cle" TEXT NOT NULL,
    "debutDeFenetre" TIMESTAMP(3) NOT NULL,
    "nombre" INTEGER NOT NULL,

    CONSTRAINT "EnvoisDeCode_pkey" PRIMARY KEY ("cle")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");
