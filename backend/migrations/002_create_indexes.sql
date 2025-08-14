-- Performance indexes for NBA Analytics queries
-- These indexes will speed up common filtering and sorting operations

-- Team indexes
CREATE INDEX idx_teams_team_code ON teams(team_code);
CREATE INDEX idx_teams_conference ON teams(conference);

-- Player indexes
CREATE INDEX idx_players_name ON players(name);
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_players_age ON players(age);
CREATE INDEX idx_players_position ON players(position);

-- Game indexes
CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_season ON games(season);
CREATE INDEX idx_games_type ON games(game_type);
CREATE INDEX idx_games_home_team ON games(home_team_id);
CREATE INDEX idx_games_away_team ON games(away_team_id);
CREATE INDEX idx_games_date_season ON games(game_date, season);

-- Player game stats indexes (most important for performance)
CREATE INDEX idx_player_stats_player_id ON player_game_stats(player_id);
CREATE INDEX idx_player_stats_game_id ON player_game_stats(game_id);
CREATE INDEX idx_player_stats_team_id ON player_game_stats(team_id);

-- Performance indexes for common filters
CREATE INDEX idx_player_stats_points ON player_game_stats(points);
CREATE INDEX idx_player_stats_minutes ON player_game_stats(minutes_played);
CREATE INDEX idx_player_stats_fgm ON player_game_stats(field_goals_made);
CREATE INDEX idx_player_stats_fga ON player_game_stats(field_goals_attempted);
CREATE INDEX idx_player_stats_fg_pct ON player_game_stats(field_goal_percentage);
CREATE INDEX idx_player_stats_3pm ON player_game_stats(three_pointers_made);
CREATE INDEX idx_player_stats_3pa ON player_game_stats(three_pointers_attempted);
CREATE INDEX idx_player_stats_3p_pct ON player_game_stats(three_point_percentage);
CREATE INDEX idx_player_stats_ftm ON player_game_stats(free_throws_made);
CREATE INDEX idx_player_stats_fta ON player_game_stats(free_throws_attempted);
CREATE INDEX idx_player_stats_ft_pct ON player_game_stats(free_throw_percentage);
CREATE INDEX idx_player_stats_rebounds ON player_game_stats(total_rebounds);
CREATE INDEX idx_player_stats_oreb ON player_game_stats(offensive_rebounds);
CREATE INDEX idx_player_stats_dreb ON player_game_stats(defensive_rebounds);
CREATE INDEX idx_player_stats_assists ON player_game_stats(assists);
CREATE INDEX idx_player_stats_steals ON player_game_stats(steals);
CREATE INDEX idx_player_stats_blocks ON player_game_stats(blocks);
CREATE INDEX idx_player_stats_turnovers ON player_game_stats(turnovers);
CREATE INDEX idx_player_stats_fouls ON player_game_stats(personal_fouls);
CREATE INDEX idx_player_stats_plus_minus ON player_game_stats(plus_minus);
CREATE INDEX idx_player_stats_game_type ON player_game_stats(game_type);

-- Composite indexes for common query patterns
CREATE INDEX idx_player_stats_team_points ON player_game_stats(team_id, points);
CREATE INDEX idx_player_stats_player_points ON player_game_stats(player_id, points);
CREATE INDEX idx_player_stats_points_assists ON player_game_stats(points, assists);
CREATE INDEX idx_player_stats_game_type_points ON player_game_stats(game_type, points);

-- Team game stats indexes
CREATE INDEX idx_team_stats_team_id ON team_game_stats(team_id);
CREATE INDEX idx_team_stats_game_id ON team_game_stats(game_id);
CREATE INDEX idx_team_stats_win ON team_game_stats(win);
CREATE INDEX idx_team_stats_points ON team_game_stats(points);
CREATE INDEX idx_team_stats_fgm ON team_game_stats(field_goals_made);
CREATE INDEX idx_team_stats_fga ON team_game_stats(field_goals_attempted);
CREATE INDEX idx_team_stats_fg_pct ON team_game_stats(field_goal_percentage);
CREATE INDEX idx_team_stats_3pm ON team_game_stats(three_pointers_made);
CREATE INDEX idx_team_stats_3pa ON team_game_stats(three_pointers_attempted);
CREATE INDEX idx_team_stats_3p_pct ON team_game_stats(three_point_percentage);
CREATE INDEX idx_team_stats_ftm ON team_game_stats(free_throws_made);
CREATE INDEX idx_team_stats_fta ON team_game_stats(free_throws_attempted);
CREATE INDEX idx_team_stats_ft_pct ON team_game_stats(free_throw_percentage);
CREATE INDEX idx_team_stats_rebounds ON team_game_stats(total_rebounds);
CREATE INDEX idx_team_stats_oreb ON team_game_stats(offensive_rebounds);
CREATE INDEX idx_team_stats_dreb ON team_game_stats(defensive_rebounds);
CREATE INDEX idx_team_stats_assists ON team_game_stats(assists);
CREATE INDEX idx_team_stats_steals ON team_game_stats(steals);
CREATE INDEX idx_team_stats_blocks ON team_game_stats(blocks);
CREATE INDEX idx_team_stats_turnovers ON team_game_stats(turnovers);
CREATE INDEX idx_team_stats_plus_minus ON team_game_stats(plus_minus);
CREATE INDEX idx_team_stats_game_type ON team_game_stats(game_type);

-- Composite indexes for team queries
CREATE INDEX idx_team_stats_team_wins ON team_game_stats(team_id, win);
CREATE INDEX idx_team_stats_team_points ON team_game_stats(team_id, points);
CREATE INDEX idx_team_stats_game_type_points ON team_game_stats(game_type, points);

-- Create partial indexes for better performance on boolean columns
CREATE INDEX idx_team_stats_wins_only ON team_game_stats(team_id, points) WHERE win = TRUE;
CREATE INDEX idx_player_stats_starters ON player_game_stats(player_id, points) WHERE started = TRUE;

-- Create indexes on commonly joined columns
CREATE INDEX idx_player_team_join ON players(team_id, name);
CREATE INDEX idx_stats_player_join ON player_game_stats(player_id, game_id);
CREATE INDEX idx_stats_game_join ON player_game_stats(game_id, team_id);

-- Analyze tables to update statistics for query planner
ANALYZE teams;
ANALYZE players;
ANALYZE games;
ANALYZE player_game_stats;
ANALYZE team_game_stats;