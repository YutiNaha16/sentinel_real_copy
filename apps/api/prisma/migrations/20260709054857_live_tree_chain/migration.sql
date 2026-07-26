-- CreateEnum
CREATE TYPE "ChainState" AS ENUM ('WAITING', 'NOTIFIED', 'ACKNOWLEDGED');

-- CreateTable
CREATE TABLE "IncidentChainEntry" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "state" "ChainState" NOT NULL DEFAULT 'WAITING',
    "notifiedAt" TIMESTAMP(3),
    "ackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentChainEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IncidentChainEntry_incidentId_nodeId_key" ON "IncidentChainEntry"("incidentId", "nodeId");

-- AddForeignKey
ALTER TABLE "IncidentChainEntry" ADD CONSTRAINT "IncidentChainEntry_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentChainEntry" ADD CONSTRAINT "IncidentChainEntry_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
