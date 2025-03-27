-- Function to update track totals
CREATE OR REPLACE FUNCTION update_track_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'PLAY' THEN
        -- Update play count and last_played_at
        UPDATE tracks
        SET total_plays = total_plays + 1,
            last_played_at = NEW.created_at
        WHERE id = NEW.track_id;
    ELSIF NEW.event_type = 'DOWNLOAD' THEN
        -- Update download count
        UPDATE tracks
        SET total_downloads = total_downloads + 1
        WHERE id = NEW.track_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for track_events
CREATE TRIGGER track_events_update_totals
    AFTER INSERT ON track_events
    FOR EACH ROW
    EXECUTE FUNCTION update_track_totals();

-- Add comment explaining the trigger
COMMENT ON TRIGGER track_events_update_totals ON track_events IS 
    'Updates track play/download counts and last_played_at when new events occur'; 