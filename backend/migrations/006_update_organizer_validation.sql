-- 006_update_organizer_validation.sql
-- NBA Database - Update organizer validation for new types
-- Run this to add support for last_period and date_range organizers

BEGIN;

-- Drop the existing constraint and validation function
ALTER TABLE saved_reports DROP CONSTRAINT IF EXISTS check_organizer_valid;
DROP FUNCTION IF EXISTS validate_organizer_json(JSONB);

-- Create updated validation function with new organizer types
CREATE OR REPLACE FUNCTION validate_organizer_json(organizer_data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if organizer has required 'type' field
  IF NOT (organizer_data ? 'type') THEN
    RETURN FALSE;
  END IF;
  
  -- Check if type is valid (now includes new types)
  IF NOT (organizer_data->>'type' IN ('all_games', 'last_games', 'game_range', 'home_away', 'last_period', 'date_range')) THEN
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

    WHEN 'last_period' THEN
      -- Must have 'period' and 'value' fields
      IF NOT (organizer_data ? 'period' AND organizer_data ? 'value') THEN
        RETURN FALSE;
      END IF;
      
      -- Validate period type
      IF NOT (organizer_data->>'period' IN ('days', 'weeks', 'months')) THEN
        RETURN FALSE;
      END IF;
      
      -- Validate value is positive integer
      IF NOT ((organizer_data->>'value')::INTEGER > 0) THEN
        RETURN FALSE;
      END IF;
      
      -- Validate reasonable limits
      CASE organizer_data->>'period'
        WHEN 'days' THEN
          IF (organizer_data->>'value')::INTEGER > 365 THEN
            RETURN FALSE;
          END IF;
        WHEN 'weeks' THEN
          IF (organizer_data->>'value')::INTEGER > 52 THEN
            RETURN FALSE;
          END IF;
        WHEN 'months' THEN
          IF (organizer_data->>'value')::INTEGER > 12 THEN
            RETURN FALSE;
          END IF;
      END CASE;

    WHEN 'date_range' THEN
      -- Must have 'fromDate' and 'toDate' fields
      IF NOT (organizer_data ? 'fromDate' AND organizer_data ? 'toDate') THEN
        RETURN FALSE;
      END IF;
      
      -- Validate date format (basic validation)
      BEGIN
        PERFORM (organizer_data->>'fromDate')::DATE;
        PERFORM (organizer_data->>'toDate')::DATE;
        
        -- Check that fromDate <= toDate
        IF (organizer_data->>'fromDate')::DATE > (organizer_data->>'toDate')::DATE THEN
          RETURN FALSE;
        END IF;
        
      EXCEPTION
        WHEN invalid_datetime_format THEN
          RETURN FALSE;
        WHEN datetime_field_overflow THEN
          RETURN FALSE;
      END;
      
    ELSE
      -- 'all_games' doesn't need additional validation
      NULL;
  END CASE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Re-add the constraint
ALTER TABLE saved_reports 
ADD CONSTRAINT check_organizer_valid 
CHECK (validate_organizer_json(organizer));

-- Update the organizer description function for new types
CREATE OR REPLACE FUNCTION get_organizer_description(organizer_data JSONB)
RETURNS TEXT AS $$
BEGIN
  CASE organizer_data->>'type'
    WHEN 'all_games' THEN
      RETURN 'All Games';
    WHEN 'last_games' THEN
      RETURN 'Last ' || (organizer_data->>'value') || ' Games (Season Position)';
    WHEN 'game_range' THEN
      RETURN 'Games ' || (organizer_data->>'from') || ' to ' || (organizer_data->>'to');
    WHEN 'home_away' THEN
      RETURN CASE 
        WHEN organizer_data->>'gameType' = 'home' THEN 'Home Games'
        WHEN organizer_data->>'gameType' = 'away' THEN 'Away Games'
        ELSE 'Home/Away Games'
      END;
    WHEN 'last_period' THEN
      DECLARE
        period_value INTEGER := (organizer_data->>'value')::INTEGER;
        period_type TEXT := organizer_data->>'period';
        period_label TEXT;
      BEGIN
        -- Handle singular/plural
        CASE period_type
          WHEN 'days' THEN
            period_label := CASE WHEN period_value = 1 THEN 'Day' ELSE 'Days' END;
          WHEN 'weeks' THEN
            period_label := CASE WHEN period_value = 1 THEN 'Week' ELSE 'Weeks' END;
          WHEN 'months' THEN
            period_label := CASE WHEN period_value = 1 THEN 'Month' ELSE 'Months' END;
        END CASE;
        
        RETURN 'Last ' || period_value || ' ' || period_label;
      END;
    WHEN 'date_range' THEN
      RETURN (organizer_data->>'fromDate') || ' to ' || (organizer_data->>'toDate');
    ELSE
      RETURN 'Unknown Organizer';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create updated organizer usage statistics view
DROP VIEW IF EXISTS organizer_usage_stats;
CREATE VIEW organizer_usage_stats AS
SELECT 
  organizer->>'type' as organizer_type,
  COUNT(*) as usage_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as usage_percentage,
  MIN(created_at) as first_used,
  MAX(created_at) as last_used,
  -- Add examples of configurations
  CASE organizer->>'type'
    WHEN 'last_games' THEN 
      'e.g., Last ' || MAX((organizer->>'value')::INTEGER) || ' Games'
    WHEN 'game_range' THEN 
      'e.g., Games ' || MIN((organizer->>'from')::INTEGER) || '-' || MAX((organizer->>'to')::INTEGER)
    WHEN 'home_away' THEN 
      'Home/Away Games'
    WHEN 'last_period' THEN
      'e.g., Last ' || MAX((organizer->>'value')::INTEGER) || ' ' || 
      UPPER(SUBSTRING(MAX(organizer->>'period'), 1, 1)) || SUBSTRING(MAX(organizer->>'period'), 2)
    WHEN 'date_range' THEN
      'e.g., Date ranges'
    ELSE 'All Games'
  END as example_config
FROM saved_reports
WHERE organizer IS NOT NULL
GROUP BY organizer->>'type'
ORDER BY usage_count DESC;

-- Create a function to get current season status for testing
CREATE OR REPLACE FUNCTION get_season_status()
RETURNS TABLE(
  current_game_position INTEGER,
  latest_game_date DATE,
  total_games_played INTEGER,
  season_progress_pct DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    MAX(GREATEST(
      COALESCE(g.home_team_game_number, 0),
      COALESCE(g.away_team_game_number, 0)
    )) as current_game_position,
    MAX(g.game_date) as latest_game_date,
    COUNT(*)::INTEGER as total_games_played,
    ROUND(
      MAX(GREATEST(
        COALESCE(g.home_team_game_number, 0),
        COALESCE(g.away_team_game_number, 0)
      )) * 100.0 / 82, 2
    ) as season_progress_pct
  FROM games g
  WHERE g.game_type = 'regular';
END;
$$ LANGUAGE plpgsql;

-- Add indexes for better performance with new organizer types
CREATE INDEX IF NOT EXISTS idx_games_date_type ON games(game_date, game_type);
CREATE INDEX IF NOT EXISTS idx_games_team_game_numbers ON games(home_team_game_number, away_team_game_number) WHERE game_type = 'regular';

-- Insert sample configurations for new organizer types (for testing)
-- Uncomment these if you want test data

/*
-- Sample last_period organizer
INSERT INTO saved_reports (
  dashboard_id, user_id, name, description, measure, filters, organizer, 
  sort_config, view_type
) VALUES (
  (SELECT id FROM dashboards LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  'Last 7 Days Performance',
  'Player performance over the last 7 days',
  'Players',
  '[{"type": "PTS", "operator": "greater than", "value": 15}]',
  '{"type": "last_period", "period": "days", "value": 7}',
  '{"column": "PTS", "direction": "desc"}',
  'traditional'
) ON CONFLICT DO NOTHING;

-- Sample date_range organizer
INSERT INTO saved_reports (
  dashboard_id, user_id, name, description, measure, filters, organizer, 
  sort_config, view_type
) VALUES (
  (SELECT id FROM dashboards LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  'December Performance',
  'Analysis of December games only',
  'Players',
  '[{"type": "MINS", "operator": "greater than", "value": 20}]',
  '{"type": "date_range", "fromDate": "2023-12-01", "toDate": "2023-12-31"}',
  '{"column": "PTS", "direction": "desc"}',
  'traditional'
) ON CONFLICT DO NOTHING;

-- Sample fixed last_games organizer
INSERT INTO saved_reports (
  dashboard_id, user_id, name, description, measure, filters, organizer, 
  sort_config, view_type
) VALUES (
  (SELECT id FROM dashboards LIMIT 1),
  (SELECT id FROM users LIMIT 1),
  'Last 5 Games (Season Position)',
  'Fixed last games based on season position',
  'Players',
  '[{"type": "PTS", "operator": "greater than", "value": 20}]',
  '{"type": "last_games", "value": 5}',
  '{"column": "PTS", "direction": "desc"}',
  'traditional'
) ON CONFLICT DO NOTHING;
*/

COMMIT;

-- Verification queries
SELECT 'Organizer validation updated successfully!' as status;

-- Show current season status
SELECT 'Current season status:' as info;
SELECT * FROM get_season_status();

-- Test new organizer types validation
SELECT 'Testing new organizer validation...' as test_status;

-- These should succeed
SELECT 
  'last_period validation: ' || validate_organizer_json('{"type": "last_period", "period": "days", "value": 7}'::jsonb) as test1,
  'date_range validation: ' || validate_organizer_json('{"type": "date_range", "fromDate": "2024-01-01", "toDate": "2024-01-31"}'::jsonb) as test2,
  'fixed last_games validation: ' || validate_organizer_json('{"type": "last_games", "value": 5}'::jsonb) as test3;

-- Show updated organizer usage stats
SELECT 'Updated organizer usage:' as info;
SELECT * FROM organizer_usage_stats;

-- Show sample organizer descriptions
SELECT 'Sample organizer descriptions:' as info;
SELECT 
  get_organizer_description('{"type": "all_games"}'::jsonb) as all_games,
  get_organizer_description('{"type": "last_games", "value": 5}'::jsonb) as last_games_fixed,
  get_organizer_description('{"type": "last_period", "period": "days", "value": 7}'::jsonb) as last_7_days,
  get_organizer_description('{"type": "date_range", "fromDate": "2024-01-01", "toDate": "2024-01-31"}'::jsonb) as date_range;