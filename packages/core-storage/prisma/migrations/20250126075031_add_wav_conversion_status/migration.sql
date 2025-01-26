-- CreateEnum
CREATE TYPE "WavConversionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "wavConversionStatus" "WavConversionStatus" NOT NULL DEFAULT 'NOT_STARTED';
