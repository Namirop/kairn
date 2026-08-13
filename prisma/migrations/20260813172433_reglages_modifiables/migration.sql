-- CreateTable
CREATE TABLE "Reglages" (
    "id" TEXT NOT NULL DEFAULT 'reglages',
    "aiEnabled" BOOLEAN,
    "mockAi" BOOLEAN,
    "dailyCallCap" INTEGER,
    "userDailyCallCap" INTEGER,
    "model" TEXT,
    "maxTokens" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reglages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglageJournal" (
    "id" TEXT NOT NULL,
    "reglage" TEXT NOT NULL,
    "avant" TEXT,
    "apres" TEXT,
    "parEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReglageJournal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReglageJournal_createdAt_idx" ON "ReglageJournal"("createdAt");
