-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Timeline" ADD COLUMN     "description" TEXT,
ALTER COLUMN "bgColor" DROP NOT NULL,
ALTER COLUMN "spineColor" DROP NOT NULL,
ALTER COLUMN "tickColor" DROP NOT NULL,
ALTER COLUMN "textColor" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "endDay" INTEGER,
ADD COLUMN     "endIsBce" BOOLEAN,
ADD COLUMN     "endMonth" INTEGER,
ADD COLUMN     "endYear" INTEGER,
ADD COLUMN     "layerId" TEXT,
ADD COLUMN     "legacyDescription" TEXT;

-- CreateTable
CREATE TABLE "Layer" (
    "id" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Layer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Layer_timelineId_position_idx" ON "Layer"("timelineId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Layer_timelineId_nameKey_key" ON "Layer"("timelineId", "nameKey");

-- CreateIndex
CREATE INDEX "RateLimit_windowStart_idx" ON "RateLimit"("windowStart");

-- CreateIndex
CREATE INDEX "User_isGuest_lastActiveAt_idx" ON "User"("isGuest", "lastActiveAt");

-- CreateIndex
CREATE INDEX "Event_layerId_idx" ON "Event"("layerId");

-- AddForeignKey
ALTER TABLE "Layer" ADD CONSTRAINT "Layer_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "Timeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "Layer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
