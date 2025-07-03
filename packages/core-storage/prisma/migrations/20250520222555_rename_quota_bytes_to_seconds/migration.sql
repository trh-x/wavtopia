/*
  Warnings:

  - The values [FREE_STORAGE_QUOTA_BYTES] on the enum `SystemSettingKey` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SystemSettingKey_new" AS ENUM ('FREE_STORAGE_QUOTA_SECONDS');
ALTER TABLE "system_settings" ALTER COLUMN "key" TYPE "SystemSettingKey_new" USING ("key"::text::"SystemSettingKey_new");
ALTER TYPE "SystemSettingKey" RENAME TO "SystemSettingKey_old";
ALTER TYPE "SystemSettingKey_new" RENAME TO "SystemSettingKey";
DROP TYPE "SystemSettingKey_old";

-- Set free quota for existing users from system setting, falling back to 10 hours if not set
UPDATE "users"
SET free_quota_seconds = COALESCE(
  (SELECT number_value FROM "system_settings" WHERE key = 'FREE_STORAGE_QUOTA_SECONDS'),
  600 * 60  -- 10 hours in seconds
)
WHERE free_quota_seconds = 0;

-- Later, when the seed script runs, it can override this value if a different
-- FREE_STORAGE_QUOTA_SECONDS is specified in the system settings 
COMMIT;
