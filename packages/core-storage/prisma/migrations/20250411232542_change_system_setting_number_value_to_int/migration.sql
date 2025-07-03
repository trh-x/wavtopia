/*
  Warnings:

  - You are about to alter the column `number_value` on the `system_settings` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "system_settings" ALTER COLUMN "number_value" SET DATA TYPE INTEGER;
