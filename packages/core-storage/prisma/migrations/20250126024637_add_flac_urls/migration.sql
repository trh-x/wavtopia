-- AlterTable
ALTER TABLE "components" ADD COLUMN     "flac_url" TEXT;

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "full_track_flac_url" TEXT;
