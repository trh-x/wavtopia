/*
  Warnings:

  - You are about to drop the column `originalFormat` on the `tracks` table. All the data in the column will be lost.
  - Added the required column `original_format` to the `tracks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tracks" DROP COLUMN "originalFormat",
ADD COLUMN     "original_format" TEXT NOT NULL;
