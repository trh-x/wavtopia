/*
  Warnings:

  - Added the required column `originalUrl` to the `Track` table without a default value. This is not possible if the table is not empty.

*/
-- First, add the column as nullable
ALTER TABLE "Track" ADD COLUMN "originalUrl" TEXT;

-- Update existing records with a placeholder value
UPDATE "Track" SET "originalUrl" = 'legacy-file-' || id || '.xm' WHERE "originalUrl" IS NULL;

-- Now make the column required
ALTER TABLE "Track" ALTER COLUMN "originalUrl" SET NOT NULL;
