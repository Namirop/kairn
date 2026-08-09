-- CreateTable
CREATE TABLE "AiCallQuota" (
    "day" DATE NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCallQuota_pkey" PRIMARY KEY ("day")
);
