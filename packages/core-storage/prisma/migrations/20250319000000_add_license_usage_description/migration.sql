-- First add the column as nullable
ALTER TABLE "licenses" ADD COLUMN "usage_description" TEXT;

-- Update existing rows with the description field as a temporary value
UPDATE "licenses" SET "usage_description" = description;

-- Now make the column required
ALTER TABLE "licenses" ALTER COLUMN "usage_description" SET NOT NULL; 

-- Make the description column required
ALTER TABLE "licenses" ALTER COLUMN "description" SET NOT NULL;