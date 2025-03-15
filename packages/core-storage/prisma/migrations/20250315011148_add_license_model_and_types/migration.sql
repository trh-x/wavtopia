/*
  Warnings:

  - You are about to drop the column `terms` on the `licenses` table. All the data in the column will be lost.
  - Added the required column `type` to the `licenses` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('CC_BY', 'CC_BY_SA', 'CC_BY_NC', 'CC_BY_NC_SA', 'CC_BY_ND', 'CC_BY_NC_ND', 'ALL_RIGHTS_RESERVED', 'CUSTOM');

-- DropIndex
DROP INDEX "licenses_name_key";

-- AlterTable
ALTER TABLE "licenses" DROP COLUMN "terms",
ADD COLUMN     "allows_commercial_use" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allows_remixing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allows_sharing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allows_stem_separation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allows_stem_sharing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "credit_format" TEXT,
ADD COLUMN     "custom_terms" TEXT,
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_attribution" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requires_credit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "royalty_terms" TEXT,
ADD COLUMN     "territory_restrictions" TEXT,
ADD COLUMN     "type" "LicenseType" NOT NULL,
ADD COLUMN     "usage_restrictions" TEXT;
