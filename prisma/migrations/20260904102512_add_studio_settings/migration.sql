-- CreateEnum
CREATE TYPE "FontSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateTable
CREATE TABLE "StudioSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "primaryColor" TEXT NOT NULL DEFAULT '#9B1B5E',
    "secondaryColor" TEXT NOT NULL DEFAULT '#F5D0E0',
    "accentColor" TEXT NOT NULL DEFAULT '#E8A0D0',
    "fontSize" "FontSize" NOT NULL DEFAULT 'MEDIUM',
    "logoUrl" TEXT,
    "studioName" TEXT DEFAULT 'Malhaar Dance Company',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioSettings_pkey" PRIMARY KEY ("id")
);
