-- CreateTable
CREATE TABLE "MonthlyUsage" (
    "userId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "concepts" INTEGER NOT NULL DEFAULT 0,
    "deposits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyUsage_pkey" PRIMARY KEY ("userId","periodStart")
);

-- AddForeignKey
ALTER TABLE "MonthlyUsage" ADD CONSTRAINT "MonthlyUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
