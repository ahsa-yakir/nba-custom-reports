-- 003_create_career_stats_tables.sql
-- NBA Database - Player Career Statistics Tables
-- Run this after 001_create_tables.sql and 002_create_indexes.sql

BEGIN;

-- =====================================================
-- PLAYER CAREER STATISTICS TABLES
-- =====================================================

-- Player season totals (regular season)
CREATE TABLE player_season_totals_regular (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(20) NOT NULL,
    season_id VARCHAR(10) NOT NULL,
    league_id VARCHAR(5) DEFAULT '00',
    team_id VARCHAR(20),
    team_abbreviation VARCHAR(5),
    player_age INTEGER,
    
    -- Game stats
    games_played INTEGER DEFAULT 0,
    games_started INTEGER DEFAULT 0,
    minutes_played DECIMAL(8,1) DEFAULT 0,
    
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
    points INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints - allow multiple teams per season
    UNIQUE(player_id, season_id, team_id),
    
    -- Foreign key constraints
    CONSTRAINT player_season_totals_regular_player_id_fkey 
        FOREIGN KEY (player_id) REFERENCES players(id),
    CONSTRAINT player_season_totals_regular_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Player career totals (regular season)
CREATE TABLE player_career_totals_regular (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(20) NOT NULL UNIQUE,
    league_id VARCHAR(5) DEFAULT '00',
    
    -- Game stats
    games_played INTEGER DEFAULT 0,
    games_started INTEGER DEFAULT 0,
    minutes_played DECIMAL(8,1) DEFAULT 0,
    
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
    points INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT player_career_totals_regular_player_id_fkey 
        FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Player season totals (playoffs)
CREATE TABLE player_season_totals_playoffs (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(20) NOT NULL,
    season_id VARCHAR(10) NOT NULL,
    league_id VARCHAR(5) DEFAULT '00',
    team_id VARCHAR(20),
    team_abbreviation VARCHAR(5),
    player_age INTEGER,
    
    -- Game stats
    games_played INTEGER DEFAULT 0,
    games_started INTEGER DEFAULT 0,
    minutes_played DECIMAL(8,1) DEFAULT 0,
    
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
    points INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints - allow multiple teams per season
    UNIQUE(player_id, season_id, team_id),
    
    -- Foreign key constraints
    CONSTRAINT player_season_totals_playoffs_player_id_fkey 
        FOREIGN KEY (player_id) REFERENCES players(id),
    CONSTRAINT player_season_totals_playoffs_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Player career totals (playoffs)
CREATE TABLE player_career_totals_playoffs (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(20) NOT NULL UNIQUE,
    league_id VARCHAR(5) DEFAULT '00',
    
    -- Game stats
    games_played INTEGER DEFAULT 0,
    games_started INTEGER DEFAULT 0,
    minutes_played DECIMAL(8,1) DEFAULT 0,
    
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
    points INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT player_career_totals_playoffs_player_id_fkey 
        FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Player season rankings (regular season)
CREATE TABLE player_season_rankings_regular (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(20) NOT NULL,
    season_id VARCHAR(10) NOT NULL,
    league_id VARCHAR(5) DEFAULT '00',
    team_id VARCHAR(20),
    team_abbreviation VARCHAR(5),
    player_age INTEGER,
    
    -- Game stats rankings
    games_played_rank INTEGER,
    games_started_rank INTEGER,
    minutes_played_rank INTEGER,
    
    -- Shooting stats rankings
    field_goals_made_rank INTEGER,
    field_goals_attempted_rank INTEGER,
    field_goal_percentage_rank INTEGER,
    
    -- Three-point stats rankings
    three_pointers_made_rank INTEGER,
    three_pointers_attempted_rank INTEGER,
    three_point_percentage_rank INTEGER,
    
    -- Free throw stats rankings
    free_throws_made_rank INTEGER,
    free_throws_attempted_rank INTEGER,
    free_throw_percentage_rank INTEGER,
    
    -- Rebounding stats rankings
    offensive_rebounds_rank INTEGER,
    defensive_rebounds_rank INTEGER,
    total_rebounds_rank INTEGER,
    
    -- Other stats rankings
    assists_rank INTEGER,
    steals_rank INTEGER,
    blocks_rank INTEGER,
    turnovers_rank INTEGER,
    personal_fouls_rank INTEGER,
    points_rank INTEGER,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints - allow multiple teams per season
    UNIQUE(player_id, season_id, team_id),
    
    -- Foreign key constraints
    CONSTRAINT player_season_rankings_regular_player_id_fkey 
        FOREIGN KEY (player_id) REFERENCES players(id),
    CONSTRAINT player_season_rankings_regular_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Player season rankings (playoffs)
CREATE TABLE player_season_rankings_playoffs (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(20) NOT NULL,
    season_id VARCHAR(10) NOT NULL,
    league_id VARCHAR(5) DEFAULT '00',
    team_id VARCHAR(20),
    team_abbreviation VARCHAR(5),
    player_age INTEGER,
    
    -- Game stats rankings
    games_played_rank INTEGER,
    games_started_rank INTEGER,
    minutes_played_rank INTEGER,
    
    -- Shooting stats rankings
    field_goals_made_rank INTEGER,
    field_goals_attempted_rank INTEGER,
    field_goal_percentage_rank INTEGER,
    
    -- Three-point stats rankings
    three_pointers_made_rank INTEGER,
    three_pointers_attempted_rank INTEGER,
    three_point_percentage_rank INTEGER,
    
    -- Free throw stats rankings
    free_throws_made_rank INTEGER,
    free_throws_attempted_rank INTEGER,
    free_throw_percentage_rank INTEGER,
    
    -- Rebounding stats rankings
    offensive_rebounds_rank INTEGER,
    defensive_rebounds_rank INTEGER,
    total_rebounds_rank INTEGER,
    
    -- Other stats rankings
    assists_rank INTEGER,
    steals_rank INTEGER,
    blocks_rank INTEGER,
    turnovers_rank INTEGER,
    personal_fouls_rank INTEGER,
    points_rank INTEGER,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints - allow multiple teams per season
    UNIQUE(player_id, season_id, team_id),
    
    -- Foreign key constraints
    CONSTRAINT player_season_rankings_playoffs_player_id_fkey 
        FOREIGN KEY (player_id) REFERENCES players(id),
    CONSTRAINT player_season_rankings_playoffs_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- =====================================================
-- INDEXES FOR CAREER STATISTICS
-- =====================================================

-- Season totals regular season indexes
CREATE INDEX idx_season_totals_regular_player_id ON player_season_totals_regular(player_id);
CREATE INDEX idx_season_totals_regular_season_id ON player_season_totals_regular(season_id);
CREATE INDEX idx_season_totals_regular_team_id ON player_season_totals_regular(team_id);
CREATE INDEX idx_season_totals_regular_points ON player_season_totals_regular(points);
CREATE INDEX idx_season_totals_regular_player_season ON player_season_totals_regular(player_id, season_id);
CREATE INDEX idx_season_totals_regular_player_team_season ON player_season_totals_regular(player_id, team_id, season_id);

-- Career totals regular season indexes
CREATE INDEX idx_career_totals_regular_player_id ON player_career_totals_regular(player_id);
CREATE INDEX idx_career_totals_regular_points ON player_career_totals_regular(points);
CREATE INDEX idx_career_totals_regular_games ON player_career_totals_regular(games_played);

-- Season totals playoffs indexes
CREATE INDEX idx_season_totals_playoffs_player_id ON player_season_totals_playoffs(player_id);
CREATE INDEX idx_season_totals_playoffs_season_id ON player_season_totals_playoffs(season_id);
CREATE INDEX idx_season_totals_playoffs_team_id ON player_season_totals_playoffs(team_id);
CREATE INDEX idx_season_totals_playoffs_points ON player_season_totals_playoffs(points);
CREATE INDEX idx_season_totals_playoffs_player_season ON player_season_totals_playoffs(player_id, season_id);
CREATE INDEX idx_season_totals_playoffs_player_team_season ON player_season_totals_playoffs(player_id, team_id, season_id);

-- Career totals playoffs indexes
CREATE INDEX idx_career_totals_playoffs_player_id ON player_career_totals_playoffs(player_id);
CREATE INDEX idx_career_totals_playoffs_points ON player_career_totals_playoffs(points);
CREATE INDEX idx_career_totals_playoffs_games ON player_career_totals_playoffs(games_played);

-- Season rankings regular season indexes
CREATE INDEX idx_season_rankings_regular_player_id ON player_season_rankings_regular(player_id);
CREATE INDEX idx_season_rankings_regular_season_id ON player_season_rankings_regular(season_id);
CREATE INDEX idx_season_rankings_regular_points_rank ON player_season_rankings_regular(points_rank);
CREATE INDEX idx_season_rankings_regular_player_season ON player_season_rankings_regular(player_id, season_id);
CREATE INDEX idx_season_rankings_regular_player_team_season ON player_season_rankings_regular(player_id, team_id, season_id);

-- Season rankings playoffs indexes
CREATE INDEX idx_season_rankings_playoffs_player_id ON player_season_rankings_playoffs(player_id);
CREATE INDEX idx_season_rankings_playoffs_season_id ON player_season_rankings_playoffs(season_id);
CREATE INDEX idx_season_rankings_playoffs_points_rank ON player_season_rankings_playoffs(points_rank);
CREATE INDEX idx_season_rankings_playoffs_player_season ON player_season_rankings_playoffs(player_id, season_id);
CREATE INDEX idx_season_rankings_playoffs_player_team_season ON player_season_rankings_playoffs(player_id, team_id, season_id);

-- =====================================================
-- VIEWS FOR CAREER ANALYTICS
-- =====================================================

-- Complete player career overview
CREATE VIEW player_career_overview AS
SELECT 
    p.id as player_id,
    p.name,
    p.age,
    p.position,
    t.team_code,
    t.team_name,
    
    -- Regular season career totals
    pctr.games_played as career_games,
    pctr.points as career_points,
    ROUND(pctr.points * 1.0 / NULLIF(pctr.games_played, 0), 1) as career_ppg,
    pctr.total_rebounds as career_rebounds,
    ROUND(pctr.total_rebounds * 1.0 / NULLIF(pctr.games_played, 0), 1) as career_rpg,
    pctr.assists as career_assists,
    ROUND(pctr.assists * 1.0 / NULLIF(pctr.games_played, 0), 1) as career_apg,
    pctr.field_goal_percentage as career_fg_pct,
    pctr.three_point_percentage as career_3p_pct,
    pctr.free_throw_percentage as career_ft_pct,
    
    -- Playoff career totals (if any)
    pctp.games_played as playoff_games,
    pctp.points as playoff_points,
    ROUND(pctp.points * 1.0 / NULLIF(pctp.games_played, 0), 1) as playoff_ppg,
    pctp.total_rebounds as playoff_rebounds,
    ROUND(pctp.total_rebounds * 1.0 / NULLIF(pctp.games_played, 0), 1) as playoff_rpg,
    pctp.assists as playoff_assists,
    ROUND(pctp.assists * 1.0 / NULLIF(pctp.games_played, 0), 1) as playoff_apg,
    pctp.field_goal_percentage as playoff_fg_pct,
    pctp.three_point_percentage as playoff_3p_pct,
    pctp.free_throw_percentage as playoff_ft_pct
    
FROM players p
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN player_career_totals_regular pctr ON p.id = pctr.player_id
LEFT JOIN player_career_totals_playoffs pctp ON p.id = pctp.player_id;

-- Player season progression (showing each team separately)
CREATE VIEW player_season_progression AS
SELECT 
    p.id as player_id,
    p.name,
    pstr.season_id,
    pstr.player_age,
    pstr.team_abbreviation,
    pstr.games_played,
    pstr.points,
    ROUND(pstr.points * 1.0 / NULLIF(pstr.games_played, 0), 1) as ppg,
    pstr.total_rebounds,
    ROUND(pstr.total_rebounds * 1.0 / NULLIF(pstr.games_played, 0), 1) as rpg,
    pstr.assists,
    ROUND(pstr.assists * 1.0 / NULLIF(pstr.games_played, 0), 1) as apg,
    pstr.field_goal_percentage,
    pstr.three_point_percentage,
    pstr.free_throw_percentage
FROM players p
JOIN player_season_totals_regular pstr ON p.id = pstr.player_id
ORDER BY p.id, pstr.season_id, pstr.team_abbreviation;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE player_season_totals_regular IS 'Player traditional statistics totals for each regular season (separate record per team if traded)';
COMMENT ON TABLE player_career_totals_regular IS 'Player career totals for regular season (all seasons combined)';
COMMENT ON TABLE player_season_totals_playoffs IS 'Player traditional statistics totals for each playoff season (separate record per team if traded)';
COMMENT ON TABLE player_career_totals_playoffs IS 'Player career totals for playoffs (all seasons combined)';
COMMENT ON TABLE player_season_rankings_regular IS 'Player league rankings for each regular season (separate record per team if traded)';
COMMENT ON TABLE player_season_rankings_playoffs IS 'Player league rankings for each playoff season (separate record per team if traded)';

COMMENT ON COLUMN player_season_totals_regular.season_id IS 'NBA Season ID (e.g., 2023-24)';
COMMENT ON COLUMN player_season_totals_regular.player_age IS 'Player age during that season';
COMMENT ON COLUMN player_season_rankings_regular.points_rank IS 'League ranking for points in that season (1 = highest)';

COMMIT;

-- Verification
SELECT 'Career statistics tables and views created successfully!' as status;
SELECT 'Career tables created: ' || COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
AND (table_name LIKE '%career%' OR table_name LIKE '%season%');