/*
  Warnings:

  - The `wav_conversion_status` column on the `components` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `flac_conversion_status` column on the `components` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `wav_conversion_status` column on the `tracks` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `flac_conversion_status` column on the `tracks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AudioFileConversionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "components" DROP COLUMN "wav_conversion_status",
ADD COLUMN     "wav_conversion_status" "AudioFileConversionStatus" NOT NULL DEFAULT 'NOT_STARTED',
DROP COLUMN "flac_conversion_status",
ADD COLUMN     "flac_conversion_status" "AudioFileConversionStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "tracks" DROP COLUMN "wav_conversion_status",
ADD COLUMN     "wav_conversion_status" "AudioFileConversionStatus" NOT NULL DEFAULT 'NOT_STARTED',
DROP COLUMN "flac_conversion_status",
ADD COLUMN     "flac_conversion_status" "AudioFileConversionStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- DropEnum
DROP TYPE "FlacConversionStatus";

-- DropEnum
DROP TYPE "WavConversionStatus";
