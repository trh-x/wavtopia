-- Add license_type column to tracks table
ALTER TABLE "tracks" ADD COLUMN "license_type" "LicenseType";

-- Create index for efficient filtering by license type
CREATE INDEX tracks_license_type_idx ON tracks (license_type);

-- Create function to update license_type when license_id changes
CREATE OR REPLACE FUNCTION update_license_type() RETURNS TRIGGER AS $$
BEGIN
  -- If license_id is set, get the license type
  IF NEW.license_id IS NOT NULL THEN
    NEW.license_type := (SELECT type FROM licenses WHERE id = NEW.license_id);
  ELSE
    NEW.license_type := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update license_type when a track's license is changed
CREATE TRIGGER track_license_type_update
BEFORE INSERT OR UPDATE OF license_id ON tracks
FOR EACH ROW
EXECUTE FUNCTION update_license_type();

-- Create function to update license_type when license type changes
CREATE OR REPLACE FUNCTION update_license_type_on_license_update() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type <> OLD.type THEN
    UPDATE tracks
    SET license_type = NEW.type
    WHERE license_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update license_type when license type changes
CREATE TRIGGER license_type_update
AFTER UPDATE ON licenses
FOR EACH ROW
WHEN (NEW.type <> OLD.type)
EXECUTE FUNCTION update_license_type_on_license_update();

-- Populate license_type for existing data
UPDATE tracks t
SET license_type = l.type
FROM licenses l
WHERE t.license_id = l.id; 