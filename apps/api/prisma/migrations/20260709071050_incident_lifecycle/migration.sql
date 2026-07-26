-- AlterEnum
ALTER TYPE "EscalationEventKind" ADD VALUE 'STANDDOWN';

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "closeReason" TEXT,
ADD COLUMN     "closedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "reopenWindowHours" INTEGER NOT NULL DEFAULT 72,
    "retentionMonths" INTEGER NOT NULL DEFAULT 18,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);
