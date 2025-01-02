/*
  Warnings:

  - Added the required column `mp3Url` to the `Component` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullTrackMp3Url` to the `Track` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Component" DROP CONSTRAINT "Component_trackId_fkey";

-- First, add the columns as nullable
ALTER TABLE "Track" ADD COLUMN "fullTrackMp3Url" TEXT;
ALTER TABLE "Component" ADD COLUMN "mp3Url" TEXT;

-- Update existing records with MP3 URLs derived from WAV URLs
UPDATE "Track" 
SET "fullTrackMp3Url" = REPLACE("fullTrackUrl", '.wav', '.mp3')
WHERE "fullTrackMp3Url" IS NULL;

UPDATE "Component"
SET "mp3Url" = REPLACE("wavUrl", '.wav', '.mp3')
WHERE "mp3Url" IS NULL;

-- Now make the columns required
ALTER TABLE "Track" ALTER COLUMN "fullTrackMp3Url" SET NOT NULL;
ALTER TABLE "Component" ALTER COLUMN "mp3Url" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
