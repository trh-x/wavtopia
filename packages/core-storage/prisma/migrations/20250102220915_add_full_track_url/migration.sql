/*
  Warnings:

  - Added the required column `fullTrackUrl` to the `Track` table without a default value. This is not possible if the table is not empty.

*/
-- First, add the column as nullable
ALTER TABLE "Track" ADD COLUMN "fullTrackUrl" TEXT;

-- Update existing records with a placeholder value (using original file with .wav extension)
UPDATE "Track" SET "fullTrackUrl" = REPLACE("originalUrl", '.xm', '.wav') WHERE "fullTrackUrl" IS NULL;

-- Now make the column required
ALTER TABLE "Track" ALTER COLUMN "fullTrackUrl" SET NOT NULL;
