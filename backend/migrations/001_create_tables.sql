-- 001_create_tables.sql
-- NBA Database - Core Tables Creation
-- Run this first to create all tables with foreign key constraints

BEGIN;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Teams table
CREATE TABLE teams (
    id VARCHAR(20) PRIMARY KEY,
    team_code VARCHAR(3) UNIQUE NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    conference VARCHAR(10) CHECK (conference IN ('Eastern', 'Western')),
    division VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Players table
CREATE TABLE players (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    team_id VARCHAR(20),
    age INTEGER CHECK (age > 0 AND age < 50),
    position VARCHAR(10),
    height_inches INTEGER,
    weight_pounds INTEGER,
    years_experience INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT players_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Games table
CREATE TABLE games (
    id VARCHAR(20) PRIMARY KEY,
    game_date DATE NOT NULL,
    season VARCHAR(10) NOT NULL,
    game_type VARCHAR(20) DEFAULT 'regular' CHECK (game_type IN ('regular', 'playoff', 'preseason')),
    home_team_id VARCHAR(20),
    away_team_id VARCHAR(20),
    home_score INTEGER,
    away_score INTEGER,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT games_home_team_id_fkey 
        FOREIGN KEY (home_team_id) REFERENCES teams(id),
    CONSTRAINT games_away_team_id_fkey 
        FOREIGN KEY (away_team_id) REFERENCES teams(id)
);

-- Player game stats table
CREATE TABLE player_game_stats (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(20) NOT NULL,
    game_id VARCHAR(20) NOT NULL,
    team_id VARCHAR(20) NOT NULL,
    
    -- Basic stats
    minutes_played DECIMAL(4,1) DEFAULT 0,
    points INTEGER DEFAULT 0,
    
    -- Shooting stats
    field_goals_made INTEGER DEFAULT 0,
    field_goals_attempted INTEGER DEFAULT 0,
    field_goal_percentage DECIMAL(5,3) DEFAULT 0,
    
    -- Three-point stats
    three_pointers_made INTEGER DEFAULT 0,
    three_pointers_attempted INTEGER DEFAULT 0,
    three_point_percentage DECIMAL(5,3) DEFAULT 0,
    
    -- Free throw stats
    free_throws_made INTEGER DEFAULT 0,
    free_throws_attempted INTEGER DEFAULT 0,
    free_throw_percentage DECIMAL(5,3) DEFAULT 0,
    
    -- Rebounding stats
    offensive_rebounds INTEGER DEFAULT 0,
    defensive_rebounds INTEGER DEFAULT 0,
    total_rebounds INTEGER DEFAULT 0,
    
    -- Other stats
    assists INTEGER DEFAULT 0,
    steals INTEGER DEFAULT 0,
    blocks INTEGER DEFAULT 0,
    turnovers INTEGER DEFAULT 0,
    personal_fouls INTEGER DEFAULT 0,
    plus_minus DECIMAL(5,1) DEFAULT 0,
    
    -- Game context
    started BOOLEAN DEFAULT FALSE,
    game_type VARCHAR(10) DEFAULT 'Home' CHECK (game_type IN ('Home', 'Away')),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(player_id, game_id),
    
    -- Foreign key constraints
    CONSTRAINT player_game_stats_player_id_fkey 
        FOREIGN KEY (player_id) REFERENCES players(id),
    CONSTRAINT player_game_stats_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT player_game_stats_game_id_fkey 
        FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Player advanced stats table
CREATE TABLE player_advanced_stats (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(20) NOT NULL,
    game_id VARCHAR(20) NOT NULL,
    team_id VARCHAR(20) NOT NULL,
    
    -- Advanced efficiency metrics
    offensive_rating DECIMAL(6,2) DEFAULT 0,
    defensive_rating DECIMAL(6,2) DEFAULT 0,
    net_rating DECIMAL(7,2) DEFAULT 0,
    
    -- Advanced percentages
    assist_percentage DECIMAL(6,3) DEFAULT 0,
    assist_turnover_ratio DECIMAL(6,3) DEFAULT 0,
    assist_ratio DECIMAL(6,3) DEFAULT 0,
    offensive_rebound_percentage DECIMAL(6,3) DEFAULT 0,
    defensive_rebound_percentage DECIMAL(6,3) DEFAULT 0,
    rebound_percentage DECIMAL(6,3) DEFAULT 0,
    turnover_percentage DECIMAL(6,3) DEFAULT 0,
    effective_field_goal_percentage DECIMAL(6,3) DEFAULT 0,
    true_shooting_percentage DECIMAL(6,3) DEFAULT 0,
    usage_percentage DECIMAL(6,3) DEFAULT 0,
    
    -- Pace and impact
    pace DECIMAL(6,2) DEFAULT 0,
    pie DECIMAL(6,3) DEFAULT 0,
    
    -- Game context
    game_type VARCHAR(10) DEFAULT 'Home' CHECK (game_type IN ('Home', 'Away')),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(player_id, game_id),
    
    -- Foreign key constraints
    CONSTRAINT player_advanced_stats_player_id_fkey 
        FOREIGN KEY (player_id) REFERENCES players(id),
    CONSTRAINT player_advanced_stats_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT player_advanced_stats_game_id_fkey 
        FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Team game stats table
CREATE TABLE team_game_stats (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(20) NOT NULL,
    game_id VARCHAR(20) NOT NULL,
    
    -- Game result
    points INTEGER DEFAULT 0,
    opponent_points INTEGER DEFAULT 0,
    win BOOLEAN DEFAULT FALSE,
    
    -- Shooting stats
    field_goals_made INTEGER DEFAULT 0,
    field_goals_attempted INTEGER DEFAULT 0,
    field_goal_percentage DECIMAL(5,3) DEFAULT 0,
    
    -- Three-point stats
    three_pointers_made INTEGER DEFAULT 0,
    three_pointers_attempted INTEGER DEFAULT 0,
    three_point_percentage DECIMAL(5,3) DEFAULT 0,
    
    -- Free throw stats
    free_throws_made INTEGER DEFAULT 0,
    free_throws_attempted INTEGER DEFAULT 0,
    free_throw_percentage DECIMAL(5,3) DEFAULT 0,
    
    -- Rebounding stats
    offensive_rebounds INTEGER DEFAULT 0,
    defensive_rebounds INTEGER DEFAULT 0,
    total_rebounds INTEGER DEFAULT 0,
    
    -- Other stats
    assists INTEGER DEFAULT 0,
    steals INTEGER DEFAULT 0,
    blocks INTEGER DEFAULT 0,
    turnovers INTEGER DEFAULT 0,
    personal_fouls INTEGER DEFAULT 0,
    plus_minus DECIMAL(5,1) DEFAULT 0,
    
    -- Game context
    game_type VARCHAR(10) DEFAULT 'Home' CHECK (game_type IN ('Home', 'Away')),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(team_id, game_id),
    
    -- Foreign key constraints
    CONSTRAINT team_game_stats_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT team_game_stats_game_id_fkey 
        FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Team advanced stats table
CREATE TABLE team_advanced_stats (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(20) NOT NULL,
    game_id VARCHAR(20) NOT NULL,
    
    -- Advanced efficiency metrics
    offensive_rating DECIMAL(6,2) DEFAULT 0,
    defensive_rating DECIMAL(6,2) DEFAULT 0,
    net_rating DECIMAL(7,2) DEFAULT 0,
    
    -- Advanced percentages
    assist_percentage DECIMAL(6,3) DEFAULT 0,
    assist_turnover_ratio DECIMAL(6,3) DEFAULT 0,
    offensive_rebound_percentage DECIMAL(6,3) DEFAULT 0,
    defensive_rebound_percentage DECIMAL(6,3) DEFAULT 0,
    rebound_percentage DECIMAL(6,3) DEFAULT 0,
    turnover_percentage DECIMAL(6,3) DEFAULT 0,
    effective_field_goal_percentage DECIMAL(6,3) DEFAULT 0,
    true_shooting_percentage DECIMAL(6,3) DEFAULT 0,
    
    -- Pace and impact
    pace DECIMAL(6,2) DEFAULT 0,
    pie DECIMAL(6,3) DEFAULT 0,
    
    -- Game context
    game_type VARCHAR(10) DEFAULT 'Home' CHECK (game_type IN ('Home', 'Away')),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(team_id, game_id),
    
    -- Foreign key constraints
    CONSTRAINT team_advanced_stats_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT team_advanced_stats_game_id_fkey 
        FOREIGN KEY (game_id) REFERENCES games(id)
);

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- Player season averages view
CREATE VIEW player_season_averages AS
SELECT 
    p.id as player_id,
    p.name,
    t.team_code,
    t.team_name,
    p.age,
    g.season,
    COUNT(*) as games_played,
    ROUND(AVG(pgs.minutes_played), 1) as avg_minutes,
    ROUND(AVG(pgs.points), 1) as avg_points,
    ROUND(AVG(pgs.field_goals_made), 1) as avg_fgm,
    ROUND(AVG(pgs.field_goals_attempted), 1) as avg_fga,
    ROUND(AVG(pgs.field_goal_percentage), 3) as avg_fg_pct,
    ROUND(AVG(pgs.three_pointers_made), 1) as avg_3pm,
    ROUND(AVG(pgs.three_pointers_attempted), 1) as avg_3pa,
    ROUND(AVG(pgs.three_point_percentage), 3) as avg_3p_pct,
    ROUND(AVG(pgs.free_throws_made), 1) as avg_ftm,
    ROUND(AVG(pgs.free_throws_attempted), 1) as avg_fta,
    ROUND(AVG(pgs.free_throw_percentage), 3) as avg_ft_pct,
    ROUND(AVG(pgs.offensive_rebounds), 1) as avg_oreb,
    ROUND(AVG(pgs.defensive_rebounds), 1) as avg_dreb,
    ROUND(AVG(pgs.total_rebounds), 1) as avg_reb,
    ROUND(AVG(pgs.assists), 1) as avg_ast,
    ROUND(AVG(pgs.steals), 1) as avg_stl,
    ROUND(AVG(pgs.blocks), 1) as avg_blk,
    ROUND(AVG(pgs.turnovers), 1) as avg_tov,
    ROUND(AVG(pgs.personal_fouls), 1) as avg_pf,
    ROUND(AVG(pgs.plus_minus), 1) as avg_plus_minus
FROM players p
JOIN teams t ON p.team_id = t.id
JOIN player_game_stats pgs ON p.id = pgs.player_id
JOIN games g ON pgs.game_id = g.id
GROUP BY p.id, p.name, t.team_code, t.team_name, p.age, g.season;

-- Player advanced season averages view
CREATE VIEW player_advanced_season_averages AS
SELECT 
    p.id as player_id,
    p.name,
    t.team_code,
    t.team_name,
    g.season,
    COUNT(*) as games_played,
    ROUND(AVG(pas.offensive_rating), 2) as avg_off_rating,
    ROUND(AVG(pas.defensive_rating), 2) as avg_def_rating,
    ROUND(AVG(pas.net_rating), 2) as avg_net_rating,
    ROUND(AVG(pas.assist_percentage), 3) as avg_ast_pct,
    ROUND(AVG(pas.assist_turnover_ratio), 3) as avg_ast_tov_ratio,
    ROUND(AVG(pas.assist_ratio), 3) as avg_ast_ratio,
    ROUND(AVG(pas.offensive_rebound_percentage), 3) as avg_oreb_pct,
    ROUND(AVG(pas.defensive_rebound_percentage), 3) as avg_dreb_pct,
    ROUND(AVG(pas.rebound_percentage), 3) as avg_reb_pct,
    ROUND(AVG(pas.turnover_percentage), 3) as avg_tov_pct,
    ROUND(AVG(pas.effective_field_goal_percentage), 3) as avg_efg_pct,
    ROUND(AVG(pas.true_shooting_percentage), 3) as avg_ts_pct,
    ROUND(AVG(pas.usage_percentage), 3) as avg_usg_pct,
    ROUND(AVG(pas.pace), 2) as avg_pace,
    ROUND(AVG(pas.pie), 3) as avg_pie
FROM players p
JOIN teams t ON p.team_id = t.id
JOIN player_advanced_stats pas ON p.id = pas.player_id
JOIN games g ON pas.game_id = g.id
GROUP BY p.id, p.name, t.team_code, t.team_name, g.season;

-- Team season totals view
CREATE VIEW team_season_totals AS
SELECT 
    t.id as team_id,
    t.team_code,
    t.team_name,
    g.season,
    COUNT(*) as games_played,
    SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN tgs.win = FALSE THEN 1 ELSE 0 END) as losses,
    ROUND(SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as win_percentage,
    ROUND(AVG(tgs.points), 1) as avg_points,
    ROUND(AVG(tgs.opponent_points), 1) as avg_opponent_points,
    ROUND(AVG(tgs.field_goals_made), 1) as avg_fgm,
    ROUND(AVG(tgs.field_goals_attempted), 1) as avg_fga,
    ROUND(AVG(tgs.field_goal_percentage), 3) as avg_fg_pct,
    ROUND(AVG(tgs.three_pointers_made), 1) as avg_3pm,
    ROUND(AVG(tgs.three_pointers_attempted), 1) as avg_3pa,
    ROUND(AVG(tgs.three_point_percentage), 3) as avg_3p_pct,
    ROUND(AVG(tgs.free_throws_made), 1) as avg_ftm,
    ROUND(AVG(tgs.free_throws_attempted), 1) as avg_fta,
    ROUND(AVG(tgs.free_throw_percentage), 3) as avg_ft_pct,
    ROUND(AVG(tgs.offensive_rebounds), 1) as avg_oreb,
    ROUND(AVG(tgs.defensive_rebounds), 1) as avg_dreb,
    ROUND(AVG(tgs.total_rebounds), 1) as avg_reb,
    ROUND(AVG(tgs.assists), 1) as avg_ast,
    ROUND(AVG(tgs.steals), 1) as avg_stl,
    ROUND(AVG(tgs.blocks), 1) as avg_blk,
    ROUND(AVG(tgs.turnovers), 1) as avg_tov,
    ROUND(AVG(tgs.plus_minus), 1) as avg_plus_minus
FROM teams t
JOIN team_game_stats tgs ON t.id = tgs.team_id
JOIN games g ON tgs.game_id = g.id
GROUP BY t.id, t.team_code, t.team_name, g.season;

-- Team advanced season totals view
CREATE VIEW team_advanced_season_totals AS
SELECT 
    t.id as team_id,
    t.team_code,
    t.team_name,
    g.season,
    COUNT(*) as games_played,
    ROUND(AVG(tas.offensive_rating), 2) as avg_off_rating,
    ROUND(AVG(tas.defensive_rating), 2) as avg_def_rating,
    ROUND(AVG(tas.net_rating), 2) as avg_net_rating,
    ROUND(AVG(tas.assist_percentage), 3) as avg_ast_pct,
    ROUND(AVG(tas.assist_turnover_ratio), 3) as avg_ast_tov_ratio,
    ROUND(AVG(tas.offensive_rebound_percentage), 3) as avg_oreb_pct,
    ROUND(AVG(tas.defensive_rebound_percentage), 3) as avg_dreb_pct,
    ROUND(AVG(tas.rebound_percentage), 3) as avg_reb_pct,
    ROUND(AVG(tas.turnover_percentage), 3) as avg_tov_pct,
    ROUND(AVG(tas.effective_field_goal_percentage), 3) as avg_efg_pct,
    ROUND(AVG(tas.true_shooting_percentage), 3) as avg_ts_pct,
    ROUND(AVG(tas.pace), 2) as avg_pace,
    ROUND(AVG(tas.pie), 3) as avg_pie
FROM teams t
JOIN team_advanced_stats tas ON t.id = tas.team_id
JOIN games g ON tas.game_id = g.id
GROUP BY t.id, t.team_code, t.team_name, g.season;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE teams IS 'NBA teams with their basic information';
COMMENT ON TABLE players IS 'NBA players with their basic information';
COMMENT ON TABLE games IS 'NBA games with date, teams, and scores';
COMMENT ON TABLE player_game_stats IS 'Individual player traditional statistics for each game';
COMMENT ON TABLE player_advanced_stats IS 'Individual player advanced statistics for each game';
COMMENT ON TABLE team_game_stats IS 'Team traditional statistics for each game';
COMMENT ON TABLE team_advanced_stats IS 'Team advanced statistics for each game';

COMMENT ON COLUMN teams.id IS 'NBA API Team ID (e.g., 1610612737 for Atlanta Hawks)';
COMMENT ON COLUMN players.id IS 'NBA API Player ID (e.g., 2544 for LeBron James)';
COMMENT ON COLUMN games.id IS 'NBA API Game ID (e.g., 0022300001)';

-- Advanced stats column comments
COMMENT ON COLUMN player_advanced_stats.offensive_rating IS 'Points produced per 100 possessions';
COMMENT ON COLUMN player_advanced_stats.defensive_rating IS 'Points allowed per 100 possessions';
COMMENT ON COLUMN player_advanced_stats.net_rating IS 'Offensive rating minus defensive rating';
COMMENT ON COLUMN player_advanced_stats.true_shooting_percentage IS 'Shooting efficiency accounting for 2pt, 3pt, and FT';
COMMENT ON COLUMN player_advanced_stats.usage_percentage IS 'Percentage of team possessions used by player';
COMMENT ON COLUMN player_advanced_stats.pie IS 'Player Impact Estimate - overall contribution metric';

COMMENT ON COLUMN team_advanced_stats.offensive_rating IS 'Team points produced per 100 possessions';
COMMENT ON COLUMN team_advanced_stats.defensive_rating IS 'Team points allowed per 100 possessions';
COMMENT ON COLUMN team_advanced_stats.pace IS 'Number of possessions per 48 minutes';

COMMIT;

-- Verification
SELECT 'Tables and views created successfully!' as status;
SELECT 'Tables created: ' || COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT 'Views created: ' || COUNT(*) as view_count 
FROM information_schema.views 
WHERE table_schema = 'public';