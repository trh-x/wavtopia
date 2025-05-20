/*
  Warnings:

  - You are about to drop the column `total_quota_bytes` on the `tracks` table. All the data in the column will be lost.
  - You are about to drop the column `extra_quota_bytes` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `free_quota_bytes` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_over_storage_quota` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `used_storage_bytes` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tracks" DROP COLUMN "total_quota_bytes",
ADD COLUMN     "total_quota_seconds" INTEGER;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "extra_quota_bytes",
DROP COLUMN "free_quota_bytes",
DROP COLUMN "is_over_storage_quota",
DROP COLUMN "used_storage_bytes",
ADD COLUMN     "current_used_quota_seconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "free_quota_seconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_over_quota" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paid_quota_seconds" INTEGER NOT NULL DEFAULT 0;
