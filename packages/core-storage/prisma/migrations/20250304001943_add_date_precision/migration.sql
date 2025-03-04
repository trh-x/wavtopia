-- CreateEnum
CREATE TYPE "DatePrecision" AS ENUM ('YEAR', 'MONTH', 'DAY');

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "original_release_date_precision" "DatePrecision" DEFAULT 'DAY',
ADD COLUMN     "release_date_precision" "DatePrecision" DEFAULT 'DAY';
