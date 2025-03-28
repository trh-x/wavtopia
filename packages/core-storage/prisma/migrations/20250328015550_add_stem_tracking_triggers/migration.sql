-- This is an empty migration.

-- Function to update stem totals
CREATE OR REPLACE FUNCTION update_stem_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'PLAY' THEN
        -- Update play count and last_played_at
        UPDATE stems
        SET total_plays = total_plays + 1,
            last_played_at = NEW.created_at
        WHERE id = NEW.stem_id;
    ELSIF NEW.event_type = 'DOWNLOAD' THEN
        -- Update download count
        UPDATE stems
        SET total_downloads = total_downloads + 1
        WHERE id = NEW.stem_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stem_events
CREATE TRIGGER stem_events_update_totals
    AFTER INSERT ON stem_events
    FOR EACH ROW
    EXECUTE FUNCTION update_stem_totals();

-- Add comment explaining the trigger
COMMENT ON TRIGGER stem_events_update_totals ON stem_events IS 
    'Updates stem play/download counts and last_played_at when new events occur';