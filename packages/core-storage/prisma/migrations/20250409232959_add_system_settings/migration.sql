/*
  Warnings:

  - You are about to drop the `plans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_plans` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SystemSettingKey" AS ENUM ('FREE_STORAGE_QUOTA_BYTES');

-- CreateEnum
CREATE TYPE "SystemSettingValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- DropForeignKey
ALTER TABLE "user_plans" DROP CONSTRAINT "user_plans_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "user_plans" DROP CONSTRAINT "user_plans_user_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "extra_quota_bytes" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "used_storage_bytes" BIGINT NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "plans";

-- DropTable
DROP TABLE "user_plans";

-- DropEnum
DROP TYPE "PlanTier";

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" "SystemSettingKey" NOT NULL,
    "value_type" "SystemSettingValueType" NOT NULL,
    "string_value" TEXT,
    "number_value" BIGINT,
    "bool_value" BOOLEAN,
    "json_value" JSONB,
    "description" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");
