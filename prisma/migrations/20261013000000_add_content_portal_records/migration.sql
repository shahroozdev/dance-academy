-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaAssetKind" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "FestivalMediaRole" AS ENUM ('POSTER', 'GALLERY', 'VIDEO', 'SPONSOR');

-- CreateEnum
CREATE TYPE "PressItemKind" AS ENUM ('COVERAGE', 'INTERVIEW', 'FEATURE', 'VIDEO', 'APPEARANCE');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "kind" "MediaAssetKind" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "altText" TEXT NOT NULL DEFAULT '',
    "attribution" TEXT,
    "focalX" INTEGER NOT NULL DEFAULT 50,
    "focalY" INTEGER NOT NULL DEFAULT 50,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Festival" (
    "id" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "venueTown" TEXT NOT NULL,
    "venueRegion" TEXT NOT NULL DEFAULT 'IL',
    "venueStreet" TEXT,
    "venuePostalCode" TEXT,
    "summary" TEXT NOT NULL,
    "ticketUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "publishedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Festival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestivalArtist" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "artForm" TEXT NOT NULL,
    "biography" TEXT,
    "photoId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FestivalArtist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestivalMedia" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "role" "FestivalMediaRole" NOT NULL,
    "caption" TEXT,
    "linkUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FestivalMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Performance" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" DATE,
    "venue" TEXT,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "coverId" TEXT,
    "videoUrl" TEXT,
    "externalUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "publishedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceMedia" (
    "id" TEXT NOT NULL,
    "performanceId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PerformanceMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PressItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "outlet" TEXT,
    "kind" "PressItemKind" NOT NULL DEFAULT 'COVERAGE',
    "publishedOn" DATE,
    "excerpt" TEXT,
    "externalUrl" TEXT,
    "imageId" TEXT,
    "documentId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "publishedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PressItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "biography" TEXT NOT NULL,
    "specializations" TEXT[],
    "photoId" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "whatsappUrl" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "seoDescription" TEXT NOT NULL,
    "homeIntro" TEXT NOT NULL,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaAsset_kind_idx" ON "MediaAsset"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Festival_year_key" ON "Festival"("year");

-- CreateIndex
CREATE INDEX "Festival_status_idx" ON "Festival"("status");

-- CreateIndex
CREATE INDEX "FestivalArtist_festivalId_idx" ON "FestivalArtist"("festivalId");

-- CreateIndex
CREATE INDEX "FestivalMedia_festivalId_idx" ON "FestivalMedia"("festivalId");

-- CreateIndex
CREATE INDEX "FestivalMedia_assetId_idx" ON "FestivalMedia"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "Performance_slug_key" ON "Performance"("slug");

-- CreateIndex
CREATE INDEX "Performance_status_idx" ON "Performance"("status");

-- CreateIndex
CREATE INDEX "PerformanceMedia_performanceId_idx" ON "PerformanceMedia"("performanceId");

-- CreateIndex
CREATE INDEX "PerformanceMedia_assetId_idx" ON "PerformanceMedia"("assetId");

-- CreateIndex
CREATE INDEX "PressItem_status_idx" ON "PressItem"("status");

-- CreateIndex
CREATE INDEX "PublicProfile_isVisible_idx" ON "PublicProfile"("isVisible");

-- CreateIndex
CREATE INDEX "ContentAuditLog_createdAt_idx" ON "ContentAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ContentAuditLog_entityType_entityId_idx" ON "ContentAuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "FestivalArtist" ADD CONSTRAINT "FestivalArtist_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestivalArtist" ADD CONSTRAINT "FestivalArtist_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestivalMedia" ADD CONSTRAINT "FestivalMedia_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestivalMedia" ADD CONSTRAINT "FestivalMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceMedia" ADD CONSTRAINT "PerformanceMedia_performanceId_fkey" FOREIGN KEY ("performanceId") REFERENCES "Performance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceMedia" ADD CONSTRAINT "PerformanceMedia_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PressItem" ADD CONSTRAINT "PressItem_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PressItem" ADD CONSTRAINT "PressItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicProfile" ADD CONSTRAINT "PublicProfile_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

