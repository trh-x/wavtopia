/*
  Warnings:

  - Changed the type of `original_format` on the `tracks` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SourceFormat" AS ENUM ('xm', 'it');

-- AlterTable
ALTER TABLE "tracks" ALTER COLUMN "original_format" TYPE "SourceFormat" USING "original_format"::text::"SourceFormat";
