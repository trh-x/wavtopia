/*
  Warnings:

  - You are about to drop the column `format` on the `stems` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stems" DROP COLUMN "format",
ADD COLUMN     "is_flac_source" BOOLEAN NOT NULL DEFAULT false;
