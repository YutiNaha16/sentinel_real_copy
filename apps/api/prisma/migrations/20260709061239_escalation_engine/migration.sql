-- CreateEnum
CREATE TYPE "EscalationEventKind" AS ENUM ('ESCALATION', 'REMINDER', 'ALARM');

-- AlterEnum
ALTER TYPE "ChainState" ADD VALUE 'ESCALATED';

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "adminAlarmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "IncidentChainEntry" ADD COLUMN     "lastRemindedAt" TIMESTAMP(3),
ADD COLUMN     "reminderCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EscalationConfig" (
    "id" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "escalateAfterSec" INTEGER NOT NULL,
    "remindEverySec" INTEGER NOT NULL,
    "maxReminders" INTEGER NOT NULL,
    "adminAlarmAfterSec" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationEvent" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "EscalationEventKind" NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "EscalationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EscalationConfig_severity_key" ON "EscalationConfig"("severity");

-- AddForeignKey
ALTER TABLE "EscalationEvent" ADD CONSTRAINT "EscalationEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
