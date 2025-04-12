/*
  Warnings:

  - You are about to alter the column `flac_size_bytes` on the `stems` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `mp3_size_bytes` on the `stems` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `wav_size_bytes` on the `stems` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `cover_art_size_bytes` on the `tracks` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `flac_size_bytes` on the `tracks` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `mp3_size_bytes` on the `tracks` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `original_size_bytes` on the `tracks` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `wav_size_bytes` on the `tracks` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `extra_quota_bytes` on the `users` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `used_storage_bytes` on the `users` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `free_quota_bytes` on the `users` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "stems" ALTER COLUMN "flac_size_bytes" SET DATA TYPE INTEGER,
ALTER COLUMN "mp3_size_bytes" SET DATA TYPE INTEGER,
ALTER COLUMN "wav_size_bytes" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "tracks" ALTER COLUMN "cover_art_size_bytes" SET DATA TYPE INTEGER,
ALTER COLUMN "flac_size_bytes" SET DATA TYPE INTEGER,
ALTER COLUMN "mp3_size_bytes" SET DATA TYPE INTEGER,
ALTER COLUMN "original_size_bytes" SET DATA TYPE INTEGER,
ALTER COLUMN "wav_size_bytes" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "extra_quota_bytes" SET DATA TYPE INTEGER,
ALTER COLUMN "used_storage_bytes" SET DATA TYPE INTEGER,
ALTER COLUMN "free_quota_bytes" SET DATA TYPE INTEGER;
