-- Set free quota for existing users from system setting, falling back to 1GB if not set
UPDATE "users"
SET free_quota_bytes = COALESCE(
  (SELECT number_value FROM "system_settings" WHERE key = 'FREE_STORAGE_QUOTA_BYTES'),
  1073741824  -- 1024 * 1024 * 1024 (1GB)
)
WHERE free_quota_bytes = 0;

-- Later, when the seed script runs, it can override this value if a different
-- FREE_STORAGE_QUOTA_BYTES is specified in the system settings 