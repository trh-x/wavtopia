/*
  Warnings:

  - You are about to drop the column `created_at` on the `components` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `components` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the column `original_format` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the column `original_url` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `components` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalFormat` to the `tracks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalUrl` to the `tracks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `tracks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "components" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "tracks" DROP COLUMN "created_at",
DROP COLUMN "original_format",
DROP COLUMN "original_url",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "originalFormat" TEXT NOT NULL,
ADD COLUMN     "originalUrl" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
