-- 002_create_indexes.sql
-- NBA Database - Performance Indexes
-- Run this after 001_create_tables.sql to add all performance indexes

BEGIN;

-- =====================================================
-- TEAM TABLE INDEXES
-- =====================================================

-- Primary lookups
CREATE INDEX idx_teams_team_code ON teams(team_code);
CREATE INDEX idx_teams_conference ON teams(conference);
CREATE INDEX idx_teams_division ON teams(division);

-- Search optimization
CREATE INDEX idx_teams_name_search ON teams(team_name);
CREATE INDEX idx_teams_city_search ON teams(city);

-- =====================================================
-- PLAYER TABLE INDEXES
-- =====================================================

-- Primary lookups
CREATE INDEX idx_players_name ON players(name);
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_players_age ON players(age);
CREATE INDEX idx_players_position ON players(position);

-- Advanced filtering
CREATE INDEX idx_players_experience ON players(years_experience);
CREATE INDEX idx_players_height ON players(height_inches);
CREATE INDEX idx_players_team_age ON players(team_id, age);

-- Search optimization
CREATE INDEX idx_players_name_lower ON players(LOWER(name));

-- =====================================================
-- GAME TABLE INDEXES
-- =====================================================

-- Primary lookups
CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_season ON games(season);
CREATE INDEX idx_games_type ON games(game_type);
CREATE INDEX idx_games_status ON games(status);

-- Team lookups
CREATE INDEX idx_games_home_team ON games(home_team_id);
CREATE INDEX idx_games_away_team ON games(away_team_id);

-- Composite indexes for common queries
CREATE INDEX idx_games_date_season ON games(game_date, season);
CREATE INDEX idx_games_season_type ON games(season, game_type);
CREATE INDEX idx_games_team_date ON games(home_team_id, game_date);

-- Score lookups
CREATE INDEX idx_games_scores ON games(home_score, away_score);

-- =====================================================
-- PLAYER GAME STATS INDEXES
-- =====================================================

-- Foreign key indexes
CREATE INDEX idx_player_stats_player_id ON player_game_stats(player_id);
CREATE INDEX idx_player_stats_game_id ON player_game_stats(game_id);
CREATE INDEX idx_player_stats_team_id ON player_game_stats(team_id);

-- Statistical filtering indexes
CREATE INDEX idx_player_stats_points ON player_game_stats(points);
CREATE INDEX idx_player_stats_minutes ON player_game_stats(minutes_played);
CREATE INDEX idx_player_stats_rebounds ON player_game_stats(total_rebounds);
CREATE INDEX idx_player_stats_assists ON player_game_stats(assists);
CREATE INDEX idx_player_stats_turnovers ON player_game_stats(turnovers);
CREATE INDEX idx_player_stats_steals ON player_game_stats(steals);
CREATE INDEX idx_player_stats_blocks ON player_game_stats(blocks);
CREATE INDEX idx_player_stats_plus_minus ON player_game_stats(plus_minus);

-- Shooting percentage indexes
CREATE INDEX idx_player_stats_fg_pct ON player_game_stats(field_goal_percentage);
CREATE INDEX idx_player_stats_3p_pct ON player_game_stats(three_point_percentage);
CREATE INDEX idx_player_stats_ft_pct ON player_game_stats(free_throw_percentage);

-- Composite indexes for common report queries
CREATE INDEX idx_player_stats_player_points ON player_game_stats(player_id, points);
CREATE INDEX idx_player_stats_team_points ON player_game_stats(team_id, points);
CREATE INDEX idx_player_stats_player_minutes ON player_game_stats(player_id, minutes_played);

-- Game context indexes
CREATE INDEX idx_player_stats_started ON player_game_stats(started);
CREATE INDEX idx_player_stats_game_type ON player_game_stats(game_type);

-- =====================================================
-- TEAM GAME STATS INDEXES
-- =====================================================

-- Foreign key indexes
CREATE INDEX idx_team_stats_team_id ON team_game_stats(team_id);
CREATE INDEX idx_team_stats_game_id ON team_game_stats(game_id);

-- Win/loss tracking
CREATE INDEX idx_team_stats_win ON team_game_stats(win);
CREATE INDEX idx_team_stats_team_win ON team_game_stats(team_id, win);

-- Statistical filtering indexes
CREATE INDEX idx_team_stats_points ON team_game_stats(points);
CREATE INDEX idx_team_stats_opponent_points ON team_game_stats(opponent_points);
CREATE INDEX idx_team_stats_point_diff ON team_game_stats((points - opponent_points));

-- Shooting statistics
CREATE INDEX idx_team_stats_fg_pct ON team_game_stats(field_goal_percentage);
CREATE INDEX idx_team_stats_3p_pct ON team_game_stats(three_point_percentage);
CREATE INDEX idx_team_stats_ft_pct ON team_game_stats(free_throw_percentage);

-- Rebounding and other stats
CREATE INDEX idx_team_stats_rebounds ON team_game_stats(total_rebounds);
CREATE INDEX idx_team_stats_assists ON team_game_stats(assists);
CREATE INDEX idx_team_stats_turnovers ON team_game_stats(turnovers);
CREATE INDEX idx_team_stats_plus_minus ON team_game_stats(plus_minus);

-- Game context
CREATE INDEX idx_team_stats_game_type ON team_game_stats(game_type);

-- =====================================================
-- COMPOSITE INDEXES FOR ADVANCED QUERIES
-- =====================================================

-- Player performance over time
CREATE INDEX idx_player_game_date ON player_game_stats(player_id, game_id);

-- Team performance tracking
CREATE INDEX idx_team_game_date ON team_game_stats(team_id, game_id);

-- Cross-table optimization (for joins)
CREATE INDEX idx_player_team_game ON player_game_stats(player_id, team_id, game_id);
CREATE INDEX idx_team_game_win ON team_game_stats(team_id, game_id, win);

-- Statistical range queries
CREATE INDEX idx_player_age_points ON players(age) WHERE age BETWEEN 18 AND 40;
CREATE INDEX idx_high_scoring_games ON player_game_stats(points) WHERE points >= 30;
CREATE INDEX idx_efficient_shooters ON player_game_stats(field_goal_percentage) WHERE field_goal_percentage >= 0.5;

COMMIT;

-- Verification and performance analysis
SELECT 'Indexes created successfully!' as status;

-- Count indexes created
SELECT 
    schemaname,
    tablename,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Show largest tables for index impact analysis
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;