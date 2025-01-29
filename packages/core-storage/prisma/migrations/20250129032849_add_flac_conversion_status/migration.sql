-- CreateEnum
CREATE TYPE "FlacConversionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "components" ADD COLUMN     "flac_conversion_status" "FlacConversionStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "flac_conversion_status" "FlacConversionStatus" NOT NULL DEFAULT 'NOT_STARTED';
