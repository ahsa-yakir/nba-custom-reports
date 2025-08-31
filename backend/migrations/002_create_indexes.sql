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

-- NEW: Game numbering indexes for organizers
CREATE INDEX idx_games_home_team_game_number ON games(home_team_game_number);
CREATE INDEX idx_games_away_team_game_number ON games(away_team_game_number);
CREATE INDEX idx_games_home_team_game_type_number ON games(home_team_game_type_number);
CREATE INDEX idx_games_away_team_game_type_number ON games(away_team_game_type_number);

-- Composite indexes for game numbering queries
CREATE INDEX idx_games_home_team_season_game_num ON games(home_team_id, season, home_team_game_number);
CREATE INDEX idx_games_away_team_season_game_num ON games(away_team_id, season, away_team_game_number);
CREATE INDEX idx_games_home_team_type_game_num ON games(home_team_id, game_type, home_team_game_type_number);
CREATE INDEX idx_games_away_team_type_game_num ON games(away_team_id, game_type, away_team_game_type_number);

-- Indexes for "last X games" type queries
CREATE INDEX idx_games_home_team_season_num_desc ON games(home_team_id, season, home_team_game_number DESC);
CREATE INDEX idx_games_away_team_season_num_desc ON games(away_team_id, season, away_team_game_number DESC);

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
-- PLAYER ADVANCED STATS INDEXES
-- =====================================================

-- Foreign key indexes
CREATE INDEX idx_player_adv_stats_player_id ON player_advanced_stats(player_id);
CREATE INDEX idx_player_adv_stats_game_id ON player_advanced_stats(game_id);
CREATE INDEX idx_player_adv_stats_team_id ON player_advanced_stats(team_id);

-- Advanced efficiency metrics indexes
CREATE INDEX idx_player_adv_stats_off_rating ON player_advanced_stats(offensive_rating);
CREATE INDEX idx_player_adv_stats_def_rating ON player_advanced_stats(defensive_rating);
CREATE INDEX idx_player_adv_stats_net_rating ON player_advanced_stats(net_rating);
CREATE INDEX idx_player_adv_stats_usage_pct ON player_advanced_stats(usage_percentage);

-- Advanced percentage indexes
CREATE INDEX idx_player_adv_stats_ts_pct ON player_advanced_stats(true_shooting_percentage);
CREATE INDEX idx_player_adv_stats_efg_pct ON player_advanced_stats(effective_field_goal_percentage);
CREATE INDEX idx_player_adv_stats_ast_pct ON player_advanced_stats(assist_percentage);
CREATE INDEX idx_player_adv_stats_reb_pct ON player_advanced_stats(rebound_percentage);
CREATE INDEX idx_player_adv_stats_tov_pct ON player_advanced_stats(turnover_percentage);

-- Impact metrics indexes
CREATE INDEX idx_player_adv_stats_pie ON player_advanced_stats(pie);
CREATE INDEX idx_player_adv_stats_pace ON player_advanced_stats(pace);

-- Composite indexes for advanced queries
CREATE INDEX idx_player_adv_stats_player_rating ON player_advanced_stats(player_id, offensive_rating);
CREATE INDEX idx_player_adv_stats_player_usage ON player_advanced_stats(player_id, usage_percentage);
CREATE INDEX idx_player_adv_stats_efficiency ON player_advanced_stats(true_shooting_percentage, usage_percentage);

-- Game context
CREATE INDEX idx_player_adv_stats_game_type ON player_advanced_stats(game_type);

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
-- TEAM ADVANCED STATS INDEXES
-- =====================================================

-- Foreign key indexes
CREATE INDEX idx_team_adv_stats_team_id ON team_advanced_stats(team_id);
CREATE INDEX idx_team_adv_stats_game_id ON team_advanced_stats(game_id);

-- Advanced efficiency metrics indexes
CREATE INDEX idx_team_adv_stats_off_rating ON team_advanced_stats(offensive_rating);
CREATE INDEX idx_team_adv_stats_def_rating ON team_advanced_stats(defensive_rating);
CREATE INDEX idx_team_adv_stats_net_rating ON team_advanced_stats(net_rating);
CREATE INDEX idx_team_adv_stats_pace ON team_advanced_stats(pace);

-- Advanced percentage indexes
CREATE INDEX idx_team_adv_stats_ts_pct ON team_advanced_stats(true_shooting_percentage);
CREATE INDEX idx_team_adv_stats_efg_pct ON team_advanced_stats(effective_field_goal_percentage);
CREATE INDEX idx_team_adv_stats_ast_pct ON team_advanced_stats(assist_percentage);
CREATE INDEX idx_team_adv_stats_reb_pct ON team_advanced_stats(rebound_percentage);
CREATE INDEX idx_team_adv_stats_tov_pct ON team_advanced_stats(turnover_percentage);

-- Impact metrics indexes
CREATE INDEX idx_team_adv_stats_pie ON team_advanced_stats(pie);

-- Composite indexes for team analysis
CREATE INDEX idx_team_adv_stats_team_rating ON team_advanced_stats(team_id, offensive_rating);
CREATE INDEX idx_team_adv_stats_team_defense ON team_advanced_stats(team_id, defensive_rating);
CREATE INDEX idx_team_adv_stats_efficiency ON team_advanced_stats(offensive_rating, defensive_rating);

-- Game context
CREATE INDEX idx_team_adv_stats_game_type ON team_advanced_stats(game_type);

-- =====================================================
-- COMPOSITE INDEXES FOR ADVANCED QUERIES
-- =====================================================

-- Player performance over time
CREATE INDEX idx_player_game_date ON player_game_stats(player_id, game_id);
CREATE INDEX idx_player_adv_game_date ON player_advanced_stats(player_id, game_id);

-- Team performance tracking
CREATE INDEX idx_team_game_date ON team_game_stats(team_id, game_id);
CREATE INDEX idx_team_adv_game_date ON team_advanced_stats(team_id, game_id);

-- Cross-table optimization (for joins)
CREATE INDEX idx_player_team_game ON player_game_stats(player_id, team_id, game_id);
CREATE INDEX idx_player_adv_team_game ON player_advanced_stats(player_id, team_id, game_id);
CREATE INDEX idx_team_game_win ON team_game_stats(team_id, game_id, win);

-- Advanced analytics composite indexes
CREATE INDEX idx_player_efficiency_usage ON player_advanced_stats(player_id, true_shooting_percentage, usage_percentage);
CREATE INDEX idx_team_pace_efficiency ON team_advanced_stats(team_id, pace, offensive_rating);

-- Statistical range queries
CREATE INDEX idx_player_age_points ON players(age) WHERE age BETWEEN 18 AND 40;
CREATE INDEX idx_high_scoring_games ON player_game_stats(points) WHERE points >= 30;
CREATE INDEX idx_efficient_shooters ON player_game_stats(field_goal_percentage) WHERE field_goal_percentage >= 0.5;
CREATE INDEX idx_elite_efficiency ON player_advanced_stats(true_shooting_percentage) WHERE true_shooting_percentage >= 0.6;
CREATE INDEX idx_high_usage_players ON player_advanced_stats(usage_percentage) WHERE usage_percentage >= 0.25;

-- =====================================================
-- SPECIALIZED INDEXES FOR ANALYTICS
-- =====================================================

-- Player comparison indexes
CREATE INDEX idx_player_multi_metric ON player_advanced_stats(player_id, offensive_rating, defensive_rating, usage_percentage, true_shooting_percentage);

-- Team comparison indexes  
CREATE INDEX idx_team_multi_metric ON team_advanced_stats(team_id, offensive_rating, defensive_rating, pace, true_shooting_percentage);

-- Season analysis indexes
CREATE INDEX idx_season_player_performance ON player_game_stats(player_id) 
    INCLUDE (points, assists, total_rebounds, minutes_played);
CREATE INDEX idx_season_team_performance ON team_game_stats(team_id) 
    INCLUDE (points, opponent_points, win, field_goal_percentage);

-- Advanced season analysis indexes
CREATE INDEX idx_season_player_advanced ON player_advanced_stats(player_id) 
    INCLUDE (offensive_rating, defensive_rating, usage_percentage, true_shooting_percentage);
CREATE INDEX idx_season_team_advanced ON team_advanced_stats(team_id) 
    INCLUDE (offensive_rating, defensive_rating, pace, net_rating);

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