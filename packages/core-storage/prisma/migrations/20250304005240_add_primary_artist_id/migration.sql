-- AlterTable
ALTER TABLE "tracks" ADD COLUMN "primary_artist_id" TEXT;

-- CreateIndex
CREATE INDEX "tracks_status_user_id_primary_artist_id_created_at_id_idx" ON "tracks"("status", "user_id", "primary_artist_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_primary_artist_id_fkey" FOREIGN KEY ("primary_artist_id") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
