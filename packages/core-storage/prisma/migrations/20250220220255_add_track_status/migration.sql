-- CreateEnum
CREATE TYPE "TrackStatus" AS ENUM ('ACTIVE', 'PENDING_DELETION');

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "status" "TrackStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "tracks_status_created_at_idx" ON "tracks"("status", "created_at");
