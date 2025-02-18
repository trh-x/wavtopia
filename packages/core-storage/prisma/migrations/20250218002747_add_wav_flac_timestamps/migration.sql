-- AlterTable
ALTER TABLE "components" ADD COLUMN     "flac_created_at" TIMESTAMP(3),
ADD COLUMN     "flac_last_requested_at" TIMESTAMP(3),
ADD COLUMN     "wav_created_at" TIMESTAMP(3),
ADD COLUMN     "wav_last_requested_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "flac_created_at" TIMESTAMP(3),
ADD COLUMN     "flac_last_requested_at" TIMESTAMP(3),
ADD COLUMN     "wav_created_at" TIMESTAMP(3),
ADD COLUMN     "wav_last_requested_at" TIMESTAMP(3);
