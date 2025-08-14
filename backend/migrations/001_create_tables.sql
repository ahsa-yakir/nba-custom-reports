-- NBA Analytics Database Schema
-- This file creates all the necessary tables for NBA statistics

-- Enable UUID extension for unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_code VARCHAR(3) UNIQUE NOT NULL,  -- 'LAL', 'BOS', etc.
    team_name VARCHAR(100) NOT NULL,       -- 'Los Angeles Lakers'
    city VARCHAR(50) NOT NULL,             -- 'Los Angeles'
    conference VARCHAR(10) CHECK (conference IN ('Eastern', 'Western')),
    division VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    team_id UUID REFERENCES teams(id),
    age INTEGER CHECK (age > 0 AND age < 50),
    position VARCHAR(10),           -- 'PG', 'SG', 'SF', 'PF', 'C'
    height_inches INTEGER,          -- Player height in inches
    weight_pounds INTEGER,          -- Player weight in pounds
    years_experience INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table (stores game metadata)
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_date DATE NOT NULL,
    season VARCHAR(10) NOT NULL,    -- '2023-24'
    game_type VARCHAR(20) DEFAULT 'regular' CHECK (game_type IN ('regular', 'playoff', 'preseason')),
    home_team_id UUID REFERENCES teams(id),
    away_team_id UUID REFERENCES teams(id),
    home_score INTEGER,
    away_score INTEGER,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player statistics per game
CREATE TABLE player_game_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) NOT NULL,
    game_id UUID REFERENCES games(id) NOT NULL,
    team_id UUID REFERENCES teams(id) NOT NULL,
    
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
    
    -- Ensure one record per player per game
    UNIQUE(player_id, game_id)
);

-- Team statistics per game
CREATE TABLE team_game_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) NOT NULL,
    game_id UUID REFERENCES games(id) NOT NULL,
    
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
    
    -- Ensure one record per team per game
    UNIQUE(team_id, game_id)
);

-- Create a view for easy player season averages
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

-- Create a view for team season totals
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