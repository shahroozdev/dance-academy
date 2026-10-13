-- CreateTable
CREATE TABLE "SiteMediaSlot" (
    "key" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteMediaSlot_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "SiteMediaSlot_assetId_idx" ON "SiteMediaSlot"("assetId");

-- AddForeignKey
ALTER TABLE "SiteMediaSlot" ADD CONSTRAINT "SiteMediaSlot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

