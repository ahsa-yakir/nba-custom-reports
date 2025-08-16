#!/usr/bin/env python3
"""
Database utilities - shared database operations
"""

import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
import logging
from typing import Dict, List, Set

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Handles database connections and common operations"""
    
    def __init__(self, db_config: Dict[str, str]):
        """Initialize with database configuration"""
        self.db_config = db_config
    
    def get_connection(self) -> psycopg2.extensions.connection:
        """Create database connection"""
        return psycopg2.connect(**self.db_config)
    
    def get_existing_players(self) -> Set[str]:
        """Get set of existing player IDs from database"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM players")
            player_ids = {str(row[0]) for row in cursor.fetchall()}
            cursor.close()
            return player_ids
    
    def team_exists(self, team_id: str) -> bool:
        """Check if a team exists in the database"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1 FROM teams WHERE id = %s", [team_id])
                exists = cursor.fetchone() is not None
                cursor.close()
                return exists
        except Exception as e:
            logger.error(f"Error checking if team {team_id} exists: {e}")
            return False
    
    def get_game_info(self, game_id: str) -> Dict:
        """Get basic game information from database"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                cursor.execute("""
                    SELECT id, home_team_id, away_team_id, status
                    FROM games 
                    WHERE id = %s
                """, [game_id])
                
                result = cursor.fetchone()
                cursor.close()
                
                if result:
                    return dict(result)
                else:
                    logger.warning(f"Game {game_id} not found in database")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching game info for {game_id}: {e}")
            return None
    
    def get_completed_games_for_date(self, game_date) -> List[Dict]:
        """Get all completed games for a specific date"""
        with self.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("""
                SELECT id, home_team_id, away_team_id, status
                FROM games 
                WHERE game_date = %s AND status = 'completed'
                ORDER BY id
            """, [game_date])
            
            games = cursor.fetchall()
            cursor.close()
            return [dict(game) for game in games]
    
    def insert_games(self, games: List) -> None:
        """Insert games into database"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            game_data = []
            for game in games:
                game_data.append((
                    game.game_id, game.game_date, game.season, game.status,
                    game.home_team_id, game.away_team_id,
                    game.home_score, game.away_score
                ))
            
            execute_values(
                cursor,
                """INSERT INTO games (id, game_date, season, status, home_team_id, away_team_id, home_score, away_score)
                   VALUES %s ON CONFLICT (id) DO UPDATE SET
                   home_score = EXCLUDED.home_score,
                   away_score = EXCLUDED.away_score,
                   status = EXCLUDED.status,
                   updated_at = CURRENT_TIMESTAMP""",
                game_data
            )
            
            conn.commit()
            cursor.close()
            logger.info(f"Inserted {len(games)} games")
    
    def insert_team_game_stats(self, team_stats: List) -> None:
        """Insert team game statistics"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            stats_data = []
            for stat in team_stats:
                stats_data.append((
                    stat.team_id, stat.game_id, stat.points, stat.opponent_points, stat.win,
                    stat.field_goals_made, stat.field_goals_attempted, stat.field_goal_percentage,
                    stat.three_pointers_made, stat.three_pointers_attempted, stat.three_point_percentage,
                    stat.free_throws_made, stat.free_throws_attempted, stat.free_throw_percentage,
                    stat.offensive_rebounds, stat.defensive_rebounds, stat.total_rebounds,
                    stat.assists, stat.steals, stat.blocks, stat.turnovers, stat.personal_fouls,
                    stat.plus_minus, stat.game_type
                ))
            
            execute_values(
                cursor,
                """INSERT INTO team_game_stats (
                    team_id, game_id, points, opponent_points, win,
                    field_goals_made, field_goals_attempted, field_goal_percentage,
                    three_pointers_made, three_pointers_attempted, three_point_percentage,
                    free_throws_made, free_throws_attempted, free_throw_percentage,
                    offensive_rebounds, defensive_rebounds, total_rebounds,
                    assists, steals, blocks, turnovers, personal_fouls,
                    plus_minus, game_type
                ) VALUES %s ON CONFLICT (team_id, game_id) DO UPDATE SET
                    points = EXCLUDED.points,
                    opponent_points = EXCLUDED.opponent_points,
                    win = EXCLUDED.win,
                    field_goals_made = EXCLUDED.field_goals_made,
                    field_goals_attempted = EXCLUDED.field_goals_attempted,
                    field_goal_percentage = EXCLUDED.field_goal_percentage,
                    three_pointers_made = EXCLUDED.three_pointers_made,
                    three_pointers_attempted = EXCLUDED.three_pointers_attempted,
                    three_point_percentage = EXCLUDED.three_point_percentage,
                    free_throws_made = EXCLUDED.free_throws_made,
                    free_throws_attempted = EXCLUDED.free_throws_attempted,
                    free_throw_percentage = EXCLUDED.free_throw_percentage,
                    offensive_rebounds = EXCLUDED.offensive_rebounds,
                    defensive_rebounds = EXCLUDED.defensive_rebounds,
                    total_rebounds = EXCLUDED.total_rebounds,
                    assists = EXCLUDED.assists,
                    steals = EXCLUDED.steals,
                    blocks = EXCLUDED.blocks,
                    turnovers = EXCLUDED.turnovers,
                    personal_fouls = EXCLUDED.personal_fouls,
                    plus_minus = EXCLUDED.plus_minus,
                    game_type = EXCLUDED.game_type,
                    updated_at = CURRENT_TIMESTAMP""",
                stats_data
            )
            
            conn.commit()
            cursor.close()
            logger.info(f"Inserted {len(team_stats)} team game stats")
    
    def insert_player_game_stats(self, player_stats: List) -> None:
        """Insert player game statistics"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            stats_data = []
            for stat in player_stats:
                stats_data.append((
                    stat.player_id, stat.game_id, stat.team_id,
                    stat.minutes_played, stat.points,
                    stat.field_goals_made, stat.field_goals_attempted, stat.field_goal_percentage,
                    stat.three_pointers_made, stat.three_pointers_attempted, stat.three_point_percentage,
                    stat.free_throws_made, stat.free_throws_attempted, stat.free_throw_percentage,
                    stat.offensive_rebounds, stat.defensive_rebounds, stat.total_rebounds,
                    stat.assists, stat.steals, stat.blocks, stat.turnovers, stat.personal_fouls,
                    stat.plus_minus, stat.started, stat.game_type
                ))
            
            execute_values(
                cursor,
                """INSERT INTO player_game_stats (
                    player_id, game_id, team_id, minutes_played, points,
                    field_goals_made, field_goals_attempted, field_goal_percentage,
                    three_pointers_made, three_pointers_attempted, three_point_percentage,
                    free_throws_made, free_throws_attempted, free_throw_percentage,
                    offensive_rebounds, defensive_rebounds, total_rebounds,
                    assists, steals, blocks, turnovers, personal_fouls,
                    plus_minus, started, game_type
                ) VALUES %s ON CONFLICT (player_id, game_id) DO UPDATE SET
                    minutes_played = EXCLUDED.minutes_played,
                    points = EXCLUDED.points,
                    field_goals_made = EXCLUDED.field_goals_made,
                    field_goals_attempted = EXCLUDED.field_goals_attempted,
                    field_goal_percentage = EXCLUDED.field_goal_percentage,
                    three_pointers_made = EXCLUDED.three_pointers_made,
                    three_pointers_attempted = EXCLUDED.three_pointers_attempted,
                    three_point_percentage = EXCLUDED.three_point_percentage,
                    free_throws_made = EXCLUDED.free_throws_made,
                    free_throws_attempted = EXCLUDED.free_throws_attempted,
                    free_throw_percentage = EXCLUDED.free_throw_percentage,
                    offensive_rebounds = EXCLUDED.offensive_rebounds,
                    defensive_rebounds = EXCLUDED.defensive_rebounds,
                    total_rebounds = EXCLUDED.total_rebounds,
                    assists = EXCLUDED.assists,
                    steals = EXCLUDED.steals,
                    blocks = EXCLUDED.blocks,
                    turnovers = EXCLUDED.turnovers,
                    personal_fouls = EXCLUDED.personal_fouls,
                    plus_minus = EXCLUDED.plus_minus,
                    started = EXCLUDED.started,
                    game_type = EXCLUDED.game_type,
                    updated_at = CURRENT_TIMESTAMP""",
                stats_data
            )
            
            conn.commit()
            cursor.close()
            logger.info(f"Inserted {len(player_stats)} player game stats")
    
    def insert_team_advanced_stats(self, team_stats: List) -> None:
        """Insert team advanced game statistics"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            stats_data = []
            for stat in team_stats:
                stats_data.append((
                    stat.team_id, stat.game_id,
                    stat.offensive_rating, stat.defensive_rating, stat.net_rating,
                    stat.assist_percentage, stat.assist_turnover_ratio,
                    stat.offensive_rebound_percentage, stat.defensive_rebound_percentage, stat.rebound_percentage,
                    stat.turnover_percentage, stat.effective_field_goal_percentage, stat.true_shooting_percentage,
                    stat.pace, stat.pie, stat.game_type
                ))
            
            execute_values(
                cursor,
                """INSERT INTO team_advanced_stats (
                    team_id, game_id,
                    offensive_rating, defensive_rating, net_rating,
                    assist_percentage, assist_turnover_ratio,
                    offensive_rebound_percentage, defensive_rebound_percentage, rebound_percentage,
                    turnover_percentage, effective_field_goal_percentage, true_shooting_percentage,
                    pace, pie, game_type
                ) VALUES %s ON CONFLICT (team_id, game_id) DO UPDATE SET
                    offensive_rating = EXCLUDED.offensive_rating,
                    defensive_rating = EXCLUDED.defensive_rating,
                    net_rating = EXCLUDED.net_rating,
                    assist_percentage = EXCLUDED.assist_percentage,
                    assist_turnover_ratio = EXCLUDED.assist_turnover_ratio,
                    offensive_rebound_percentage = EXCLUDED.offensive_rebound_percentage,
                    defensive_rebound_percentage = EXCLUDED.defensive_rebound_percentage,
                    rebound_percentage = EXCLUDED.rebound_percentage,
                    turnover_percentage = EXCLUDED.turnover_percentage,
                    effective_field_goal_percentage = EXCLUDED.effective_field_goal_percentage,
                    true_shooting_percentage = EXCLUDED.true_shooting_percentage,
                    pace = EXCLUDED.pace,
                    pie = EXCLUDED.pie,
                    game_type = EXCLUDED.game_type,
                    updated_at = CURRENT_TIMESTAMP""",
                stats_data
            )
            
            conn.commit()
            cursor.close()
            logger.info(f"Inserted {len(team_stats)} team advanced stats")
    
    def insert_player_advanced_stats(self, player_stats: List) -> None:
        """Insert player advanced game statistics"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            stats_data = []
            for stat in player_stats:
                stats_data.append((
                    stat.player_id, stat.game_id, stat.team_id,
                    stat.offensive_rating, stat.defensive_rating, stat.net_rating,
                    stat.assist_percentage, stat.assist_turnover_ratio, stat.assist_ratio,
                    stat.offensive_rebound_percentage, stat.defensive_rebound_percentage, stat.rebound_percentage,
                    stat.turnover_percentage, stat.effective_field_goal_percentage, stat.true_shooting_percentage,
                    stat.usage_percentage, stat.pace, stat.pie, stat.game_type
                ))
            
            execute_values(
                cursor,
                """INSERT INTO player_advanced_stats (
                    player_id, game_id, team_id,
                    offensive_rating, defensive_rating, net_rating,
                    assist_percentage, assist_turnover_ratio, assist_ratio,
                    offensive_rebound_percentage, defensive_rebound_percentage, rebound_percentage,
                    turnover_percentage, effective_field_goal_percentage, true_shooting_percentage,
                    usage_percentage, pace, pie, game_type
                ) VALUES %s ON CONFLICT (player_id, game_id) DO UPDATE SET
                    offensive_rating = EXCLUDED.offensive_rating,
                    defensive_rating = EXCLUDED.defensive_rating,
                    net_rating = EXCLUDED.net_rating,
                    assist_percentage = EXCLUDED.assist_percentage,
                    assist_turnover_ratio = EXCLUDED.assist_turnover_ratio,
                    assist_ratio = EXCLUDED.assist_ratio,
                    offensive_rebound_percentage = EXCLUDED.offensive_rebound_percentage,
                    defensive_rebound_percentage = EXCLUDED.defensive_rebound_percentage,
                    rebound_percentage = EXCLUDED.rebound_percentage,
                    turnover_percentage = EXCLUDED.turnover_percentage,
                    effective_field_goal_percentage = EXCLUDED.effective_field_goal_percentage,
                    true_shooting_percentage = EXCLUDED.true_shooting_percentage,
                    usage_percentage = EXCLUDED.usage_percentage,
                    pace = EXCLUDED.pace,
                    pie = EXCLUDED.pie,
                    game_type = EXCLUDED.game_type,
                    updated_at = CURRENT_TIMESTAMP""",
                stats_data
            )
            
            conn.commit()
            cursor.close()
            logger.info(f"Inserted {len(player_stats)} player advanced stats")