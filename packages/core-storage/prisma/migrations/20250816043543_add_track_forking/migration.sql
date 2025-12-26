-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "fork_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "forked_from_id" TEXT,
ADD COLUMN     "is_fork" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_forked_from_id_fkey" FOREIGN KEY ("forked_from_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
