-- AlterEnum
ALTER TYPE "TrackStatus" ADD VALUE 'DELETED';

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tracks_status_deleted_at_idx" ON "tracks"("status", "deleted_at");
