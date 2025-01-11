/*
  Warnings:

  - You are about to drop the column `createdAt` on the `components` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `components` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the column `originalFormat` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the column `originalUrl` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `components` table without a default value. This is not possible if the table is not empty.
  - Added the required column `original_format` to the `tracks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `original_url` to the `tracks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `tracks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "components" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "tracks" DROP COLUMN "createdAt",
DROP COLUMN "originalFormat",
DROP COLUMN "originalUrl",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "original_format" TEXT NOT NULL,
ADD COLUMN     "original_url" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
