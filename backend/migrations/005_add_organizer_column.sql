-- 005_add_organizer_column.sql
-- NBA Database - Add organizer column to saved_reports table
-- Run this to add organizer support to existing saved reports

BEGIN;

-- Add organizer column to saved_reports table
ALTER TABLE saved_reports 
ADD COLUMN organizer JSONB DEFAULT '{"type": "all_games"}';

-- Create index on organizer column for better query performance
CREATE INDEX idx_saved_reports_organizer ON saved_reports USING GIN (organizer);

-- Add comment explaining the organizer column
COMMENT ON COLUMN saved_reports.organizer IS 'JSON configuration for game scope organizer (all_games, last_games, game_range, home_away)';

-- Create a function to validate organizer JSON structure
CREATE OR REPLACE FUNCTION validate_organizer_json(organizer_data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if organizer has required 'type' field
  IF NOT (organizer_data ? 'type') THEN
    RETURN FALSE;
  END IF;
  
  -- Check if type is valid
  IF NOT (organizer_data->>'type' IN ('all_games', 'last_games', 'game_range', 'home_away')) THEN
    RETURN FALSE;
  END IF;
  
  -- Validate specific organizer types
  CASE organizer_data->>'type'
    WHEN 'last_games' THEN
      -- Must have 'value' field that's a positive integer
      IF NOT (organizer_data ? 'value' AND 
              (organizer_data->>'value')::INTEGER > 0 AND 
              (organizer_data->>'value')::INTEGER <= 82) THEN
        RETURN FALSE;
      END IF;
      
    WHEN 'game_range' THEN
      -- Must have 'from' and 'to' fields
      IF NOT (organizer_data ? 'from' AND organizer_data ? 'to' AND
              (organizer_data->>'from')::INTEGER > 0 AND
              (organizer_data->>'to')::INTEGER > 0 AND
              (organizer_data->>'from')::INTEGER <= (organizer_data->>'to')::INTEGER AND
              (organizer_data->>'to')::INTEGER <= 82) THEN
        RETURN FALSE;
      END IF;
      
    WHEN 'home_away' THEN
      -- Must have 'gameType' field with valid value
      IF NOT (organizer_data ? 'gameType' AND 
              organizer_data->>'gameType' IN ('home', 'away')) THEN
        RETURN FALSE;
      END IF;
      
    ELSE
      -- 'all_games' doesn't need additional validation
      NULL;
  END CASE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add check constraint to validate organizer JSON structure
ALTER TABLE saved_reports 
ADD CONSTRAINT check_organizer_valid 
CHECK (validate_organizer_json(organizer));

-- Update any existing NULL organizer values to default
UPDATE saved_reports 
SET organizer = '{"type": "all_games"}'
WHERE organizer IS NULL;

-- Make organizer column NOT NULL now that we have defaults
ALTER TABLE saved_reports 
ALTER COLUMN organizer SET NOT NULL;

-- Create some helper views for organizer statistics

-- View to show organizer usage statistics
CREATE VIEW organizer_usage_stats AS
SELECT 
  organizer->>'type' as organizer_type,
  COUNT(*) as usage_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as usage_percentage,
  MIN(created_at) as first_used,
  MAX(created_at) as last_used
FROM saved_reports
GROUP BY organizer->>'type'
ORDER BY usage_count DESC;

-- View to show detailed organizer configurations
CREATE VIEW organizer_configurations AS
SELECT 
  id,
  name,
  measure,
  organizer->>'type' as organizer_type,
  CASE 
    WHEN organizer->>'type' = 'last_games' THEN 
      'Last ' || (organizer->>'value') || ' Games'
    WHEN organizer->>'type' = 'game_range' THEN 
      'Games ' || (organizer->>'from') || ' to ' || (organizer->>'to')
    WHEN organizer->>'type' = 'home_away' THEN 
      (organizer->>'gameType') || ' Games'
    ELSE 'All Games'
  END as organizer_description,
  organizer,
  created_at,
  last_viewed_at
FROM saved_reports
ORDER BY created_at DESC;

-- Insert sample organizer configurations for testing (optional)
-- Uncomment these if you want test data

/*
-- Sample saved report with last_games organizer
INSERT INTO saved_reports (
  dashboard_id, user_id, name, description, measure, filters, organizer, 
  sort_config, view_type
) VALUES (
  (SELECT id FROM dashboards LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  'Last 10 Games Analysis',
  'Player performance over their last 10 games',
  'Players',
  '[{"type": "PTS", "operator": "greater than", "value": 15}]',
  '{"type": "last_games", "value": 10}',
  '{"column": "PTS", "direction": "desc"}',
  'traditional'
) ON CONFLICT DO NOTHING;

-- Sample saved report with game_range organizer
INSERT INTO saved_reports (
  dashboard_id, user_id, name, description, measure, filters, organizer, 
  sort_config, view_type
) VALUES (
  (SELECT id FROM dashboards LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  'Mid-Season Performance',
  'Analysis of games 20-40 of the season',
  'Players',
  '[{"type": "MINS", "operator": "greater than", "value": 20}]',
  '{"type": "game_range", "from": 20, "to": 40}',
  '{"column": "PTS", "direction": "desc"}',
  'traditional'
) ON CONFLICT DO NOTHING;

-- Sample saved report with home_away organizer
INSERT INTO saved_reports (
  dashboard_id, user_id, name, description, measure, filters, organizer, 
  sort_config, view_type
) VALUES (
  (SELECT id FROM dashboards LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  'Home Game Performance',
  'Team and player stats for home games only',
  'Players',
  '[{"type": "Team", "operator": "in", "values": ["LAL", "GSW", "BOS"]}]',
  '{"type": "home_away", "gameType": "home"}',
  '{"column": "PTS", "direction": "desc"}',
  'traditional'
) ON CONFLICT DO NOTHING;
*/

-- Create function to migrate existing reports to include organizer descriptions
CREATE OR REPLACE FUNCTION get_organizer_description(organizer_data JSONB)
RETURNS TEXT AS $$
BEGIN
  CASE organizer_data->>'type'
    WHEN 'all_games' THEN
      RETURN 'All Games';
    WHEN 'last_games' THEN
      RETURN 'Last ' || (organizer_data->>'value') || ' Games';
    WHEN 'game_range' THEN
      RETURN 'Games ' || (organizer_data->>'from') || ' to ' || (organizer_data->>'to');
    WHEN 'home_away' THEN
      RETURN CASE 
        WHEN organizer_data->>'gameType' = 'home' THEN 'Home Games'
        WHEN organizer_data->>'gameType' = 'away' THEN 'Away Games'
        ELSE 'Home/Away Games'
      END;
    ELSE
      RETURN 'Unknown Organizer';
  END CASE;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Verification queries
SELECT 'Organizer column added successfully!' as status;

-- Show current organizer usage
SELECT 'Current organizer usage:' as info;
SELECT * FROM organizer_usage_stats;

-- Show sample organizer configurations
SELECT 'Sample organizer configurations:' as info;
SELECT 
  name,
  organizer_type,
  organizer_description,
  created_at
FROM organizer_configurations 
LIMIT 5;

-- Verify constraint is working
SELECT 'Testing organizer validation...' as test_status;
-- This should fail if constraint is working
-- INSERT INTO saved_reports (dashboard_id, user_id, name, measure, filters, organizer) 
-- VALUES (uuid_generate_v4(), uuid_generate_v4(), 'Test', 'Players', '[]', '{"type": "invalid"}');