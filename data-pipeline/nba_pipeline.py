#!/usr/bin/env python3
"""
NBA Data Pipeline - Single Day Game Loader
Loads NBA games, team stats, and player stats from NBA API into PostgreSQL
Uses the nba_api Python package for reliable access to NBA.com data
"""

import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from datetime import datetime, date
from typing import Dict, List, Optional, Tuple
import logging
from dataclasses import dataclass
import time
import pandas as pd

# NBA API imports
try:
    from nba_api.stats.static import teams as nba_teams
    from nba_api.stats.endpoints import scoreboardv2, boxscoretraditionalv2
    NBA_API_AVAILABLE = True
except ImportError:
    NBA_API_AVAILABLE = False
    print("❌ nba_api package not found. Please install with: pip install nba_api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class GameData:
    """Data structure for a single game"""
    game_id: str
    game_date: date
    season: str
    home_team_id: str
    away_team_id: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: str = 'scheduled'

@dataclass 
class TeamGameStats:
    """Team statistics for a single game"""
    team_id: str
    game_id: str
    points: int
    opponent_points: int
    win: bool
    field_goals_made: int
    field_goals_attempted: int
    field_goal_percentage: float
    three_pointers_made: int
    three_pointers_attempted: int
    three_point_percentage: float
    free_throws_made: int
    free_throws_attempted: int
    free_throw_percentage: float
    offensive_rebounds: int
    defensive_rebounds: int
    total_rebounds: int
    assists: int
    steals: int
    blocks: int
    turnovers: int
    personal_fouls: int
    plus_minus: float
    game_type: str  # 'Home' or 'Away'

@dataclass
class PlayerGameStats:
    """Player statistics for a single game"""
    player_id: str
    game_id: str
    team_id: str
    minutes_played: float
    points: int
    field_goals_made: int
    field_goals_attempted: int
    field_goal_percentage: float
    three_pointers_made: int
    three_pointers_attempted: int
    three_point_percentage: float
    free_throws_made: int
    free_throws_attempted: int
    free_throw_percentage: float
    offensive_rebounds: int
    defensive_rebounds: int
    total_rebounds: int
    assists: int
    steals: int
    blocks: int
    turnovers: int
    personal_fouls: int
    plus_minus: float
    started: bool
    game_type: str  # 'Home' or 'Away'

class NBADataPipeline:
    """NBA Data Pipeline for loading games into PostgreSQL"""
    
    def __init__(self, db_config: Dict[str, str]):
        """Initialize pipeline with database configuration"""
        if not NBA_API_AVAILABLE:
            raise ImportError("nba_api package is required. Install with: pip install nba_api")
            
        self.db_config = db_config
    
    def get_connection(self) -> psycopg2.extensions.connection:
        """Create database connection"""
        return psycopg2.connect(**self.db_config)
    
    def clear_existing_data(self):
        """Clear all existing data to start fresh with NBA API data"""
        logger.info("🧹 Clearing existing data...")
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Delete in correct order to respect foreign keys
            cursor.execute('DELETE FROM player_game_stats')
            cursor.execute('DELETE FROM team_game_stats') 
            cursor.execute('DELETE FROM games')
            cursor.execute('DELETE FROM players')
            cursor.execute('DELETE FROM teams')
            
            conn.commit()
            cursor.close()
            
        logger.info("✅ Existing data cleared")
    
    def fetch_nba_teams(self) -> List[Dict]:
        """Fetch all NBA teams using the nba_api package"""
        logger.info("Fetching NBA teams...")
        
        try:
            # Get teams from nba_api static data
            teams_data = nba_teams.get_teams()
            
            logger.info(f"Found {len(teams_data)} NBA teams")
            return teams_data
            
        except Exception as e:
            logger.error(f"Error fetching teams: {e}")
            raise
    
    def insert_teams(self, teams_data: List[Dict]):
        """Insert NBA teams into database"""
        logger.info("🏀 Inserting NBA teams...")
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            for team in teams_data:
                team_id = str(team['id'])
                abbreviation = team['abbreviation']
                full_name = team['full_name'] 
                city = team['city']
                
                # Extract conference and division (not provided by static data)
                # We'll set these to default values for now
                conference = 'Eastern' if team_id in ['1610612738', '1610612751', '1610612766', '1610612761', '1610612748', '1610612753', '1610612755', '1610612749', '1610612765', '1610612754', '1610612752', '1610612759', '1610612764', '1610612739', '1610612737'] else 'Western'
                division = 'Atlantic'  # Default division - could be enhanced later
                
                cursor.execute("""
                    INSERT INTO teams (id, team_code, team_name, city, conference, division)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        team_code = EXCLUDED.team_code,
                        team_name = EXCLUDED.team_name,
                        city = EXCLUDED.city,
                        conference = EXCLUDED.conference,
                        division = EXCLUDED.division,
                        updated_at = CURRENT_TIMESTAMP
                """, [team_id, abbreviation, full_name, city, conference, division])
            
            conn.commit()
            cursor.close()
            
        logger.info(f"✅ Inserted {len(teams_data)} teams")
    
    def fetch_games_for_date(self, game_date: date) -> List[Dict]:
        """Fetch games from NBA API for a specific date using nba_api"""
        date_str = game_date.strftime('%m/%d/%Y')
        
        logger.info(f"Fetching games for {date_str}")
        
        try:
            # Try the scoreboard endpoint with error handling for missing fields
            try:
                scoreboard = scoreboardv2.ScoreboardV2(game_date=date_str)
                scoreboard_dict = scoreboard.get_dict()
            except KeyError as ke:
                if 'WinProbability' in str(ke):
                    logger.warning("NBA API missing WinProbability field, trying alternative approach...")
                    # Try to get the raw response and parse manually
                    import requests
                    
                    url = "https://stats.nba.com/stats/scoreboardV2"
                    params = {
                        'GameDate': date_str,
                        'LeagueID': '00',
                        'DayOffset': '0'
                    }
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json',
                        'Referer': 'https://www.nba.com/'
                    }
                    
                    response = requests.get(url, params=params, headers=headers, timeout=30)
                    response.raise_for_status()
                    data = response.json()
                    
                    # Extract games manually
                    games_data = []
                    for result_set in data['resultSets']:
                        if result_set['name'] == 'GameHeader':
                            headers = result_set['headers']
                            for row in result_set['rowSet']:
                                game_dict = dict(zip(headers, row))
                                games_data.append(game_dict)
                    
                    logger.info(f"Found {len(games_data)} games for {date_str} (manual parsing)")
                    return games_data
                else:
                    raise
            
            # Extract game headers from the result sets (normal path)
            games_data = []
            for result_set in scoreboard_dict['resultSets']:
                if result_set['name'] == 'GameHeader':
                    headers = result_set['headers']
                    for row in result_set['rowSet']:
                        game_dict = dict(zip(headers, row))
                        games_data.append(game_dict)
            
            logger.info(f"Found {len(games_data)} games for {date_str}")
            return games_data
            
        except Exception as e:
            logger.error(f"Error fetching games: {e}")
            # If the date has no games, return empty list instead of failing
            if "no games" in str(e).lower() or len(str(e)) == 0:
                logger.info("No games found for this date")
                return []
            raise
    
    def fetch_boxscore(self, game_id: str) -> Dict:
        """Fetch detailed boxscore data for a game using nba_api"""
        logger.info(f"Fetching boxscore for game {game_id}")
        
        try:
            # Add delay to avoid rate limiting
            time.sleep(1)
            
            # Try nba_api boxscore endpoint first
            try:
                boxscore = boxscoretraditionalv2.BoxScoreTraditionalV2(game_id=game_id)
                boxscore_dict = boxscore.get_dict()
                return boxscore_dict
            except Exception as api_error:
                logger.warning(f"nba_api boxscore failed: {api_error}, trying direct API call...")
                
                # Fallback to direct API call
                import requests
                
                url = "https://stats.nba.com/stats/boxscoretraditionalv2"
                params = {
                    'GameID': game_id,
                    'StartPeriod': '0',
                    'EndPeriod': '10',
                    'StartRange': '0',
                    'EndRange': '55800',
                    'RangeType': '2'
                }
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://www.nba.com/'
                }
                
                response = requests.get(url, params=params, headers=headers, timeout=30)
                response.raise_for_status()
                return response.json()
            
        except Exception as e:
            logger.error(f"Error fetching boxscore for game {game_id}: {e}")
            raise
    
    def parse_game_data(self, game_dict: Dict, game_date: date) -> GameData:
        """Parse game data from API response"""
        game_id = game_dict['GAME_ID']
        status_id = game_dict['GAME_STATUS_ID']
        season = game_dict['SEASON']
        home_team_id = str(game_dict['HOME_TEAM_ID'])
        away_team_id = str(game_dict['VISITOR_TEAM_ID'])
        
        # Determine status
        status = 'scheduled'
        if status_id == 2:
            status = 'in_progress'
        elif status_id == 3:
            status = 'completed'
        
        return GameData(
            game_id=game_id,
            game_date=game_date,
            season=season,
            home_team_id=home_team_id,
            away_team_id=away_team_id,
            status=status
        )
    
    def parse_team_stats(self, boxscore_data: Dict, game_id: str, game_data: GameData) -> List[TeamGameStats]:
        """Parse team statistics from boxscore data"""
        team_stats = []
        
        # Find TeamStats resultSet
        team_stats_data = None
        for result_set in boxscore_data['resultSets']:
            if result_set['name'] == 'TeamStats':
                team_stats_data = result_set
                break
        
        if not team_stats_data:
            logger.warning(f"No team stats found for game {game_id}")
            return team_stats
        
        headers = team_stats_data['headers']
        
        for row in team_stats_data['rowSet']:
            stats_dict = dict(zip(headers, row))
            
            team_id = str(stats_dict['TEAM_ID'])
            
            # Determine if home or away
            game_type = 'Home' if team_id == game_data.home_team_id else 'Away'
            
            team_stat = TeamGameStats(
                team_id=team_id,
                game_id=game_id,
                points=stats_dict.get('PTS', 0),
                opponent_points=0,  # Will be calculated later
                win=False,  # Will be determined after getting opponent score
                field_goals_made=stats_dict.get('FGM', 0),
                field_goals_attempted=stats_dict.get('FGA', 0),
                field_goal_percentage=stats_dict.get('FG_PCT', 0.0),
                three_pointers_made=stats_dict.get('FG3M', 0),
                three_pointers_attempted=stats_dict.get('FG3A', 0),
                three_point_percentage=stats_dict.get('FG3_PCT', 0.0),
                free_throws_made=stats_dict.get('FTM', 0),
                free_throws_attempted=stats_dict.get('FTA', 0),
                free_throw_percentage=stats_dict.get('FT_PCT', 0.0),
                offensive_rebounds=stats_dict.get('OREB', 0),
                defensive_rebounds=stats_dict.get('DREB', 0),
                total_rebounds=stats_dict.get('REB', 0),
                assists=stats_dict.get('AST', 0),
                steals=stats_dict.get('STL', 0),
                blocks=stats_dict.get('BLK', 0),
                turnovers=stats_dict.get('TOV', 0),
                personal_fouls=stats_dict.get('PF', 0),
                plus_minus=stats_dict.get('PLUS_MINUS', 0.0),
                game_type=game_type
            )
            
            team_stats.append(team_stat)
        
        # Determine opponent points and wins
        if len(team_stats) == 2:
            team_stats[0].opponent_points = team_stats[1].points
            team_stats[1].opponent_points = team_stats[0].points
            team_stats[0].win = team_stats[0].points > team_stats[1].points
            team_stats[1].win = team_stats[1].points > team_stats[0].points
        
        return team_stats
    
    def parse_player_stats(self, boxscore_data: Dict, game_id: str, game_data: GameData) -> List[PlayerGameStats]:
        """Parse player statistics from boxscore data"""
        player_stats = []
        
        # Find PlayerStats resultSet
        player_stats_data = None
        for result_set in boxscore_data['resultSets']:
            if result_set['name'] == 'PlayerStats':
                player_stats_data = result_set
                break
        
        if not player_stats_data:
            logger.warning(f"No player stats found for game {game_id}")
            return player_stats
        
        headers = player_stats_data['headers']
        
        for row in player_stats_data['rowSet']:
            stats_dict = dict(zip(headers, row))
            
            # Skip if no minutes played (player didn't play)
            if not stats_dict.get('MIN') or stats_dict['MIN'] == '0:00':
                continue
            
            # Convert minutes from "MM:SS" format to decimal
            min_str = stats_dict.get('MIN', '0:00')
            if ':' in min_str:
                try:
                    minutes, seconds = min_str.split(':')
                    minutes_played = int(minutes) + int(seconds) / 60.0
                except (ValueError, IndexError):
                    minutes_played = 0.0
            else:
                minutes_played = 0.0
            
            player_id = str(stats_dict['PLAYER_ID'])
            team_id = str(stats_dict['TEAM_ID'])
            
            # Determine if starter
            started = stats_dict.get('START_POSITION') is not None and stats_dict.get('START_POSITION') != ''
            
            # Determine home/away
            game_type = 'Home' if team_id == game_data.home_team_id else 'Away'
            
            player_stat = PlayerGameStats(
                player_id=player_id,
                game_id=game_id,
                team_id=team_id,
                minutes_played=minutes_played,
                points=stats_dict.get('PTS', 0),
                field_goals_made=stats_dict.get('FGM', 0),
                field_goals_attempted=stats_dict.get('FGA', 0),
                field_goal_percentage=stats_dict.get('FG_PCT', 0.0),
                three_pointers_made=stats_dict.get('FG3M', 0),
                three_pointers_attempted=stats_dict.get('FG3A', 0),
                three_point_percentage=stats_dict.get('FG3_PCT', 0.0),
                free_throws_made=stats_dict.get('FTM', 0),
                free_throws_attempted=stats_dict.get('FTA', 0),
                free_throw_percentage=stats_dict.get('FT_PCT', 0.0),
                offensive_rebounds=stats_dict.get('OREB', 0),
                defensive_rebounds=stats_dict.get('DREB', 0),
                total_rebounds=stats_dict.get('REB', 0),
                assists=stats_dict.get('AST', 0),
                steals=stats_dict.get('STL', 0),
                blocks=stats_dict.get('BLK', 0),
                turnovers=stats_dict.get('TOV', 0),
                personal_fouls=stats_dict.get('PF', 0),
                plus_minus=stats_dict.get('PLUS_MINUS', 0.0),
                started=started,
                game_type=game_type
            )
            
            player_stats.append(player_stat)
        
        return player_stats
    
    def create_player_from_stats(self, player_stats: PlayerGameStats, player_name: str) -> Dict:
        """Create player record from game stats (with default values)"""
        return {
            'id': player_stats.player_id,
            'name': player_name,
            'team_id': player_stats.team_id,
            'age': 25,  # Default age
            'position': 'G',  # Default position
            'height_inches': 72,  # Default height
            'weight_pounds': 200,  # Default weight
            'years_experience': 5  # Default experience
        }
    
    def insert_players_from_stats(self, conn: psycopg2.extensions.connection, 
                                 boxscore_data: Dict, player_stats: List[PlayerGameStats]):
        """Insert players discovered from game stats"""
        if not player_stats:
            return
            
        cursor = conn.cursor()
        players_to_insert = []
        
        # Get player names from boxscore data
        player_names = {}
        for result_set in boxscore_data['resultSets']:
            if result_set['name'] == 'PlayerStats':
                headers = result_set['headers']
                for row in result_set['rowSet']:
                    stats_dict = dict(zip(headers, row))
                    player_id = str(stats_dict['PLAYER_ID'])
                    player_name = stats_dict.get('PLAYER_NAME', f'Player {player_id}')
                    player_names[player_id] = player_name
        
        # Create player records
        for stat in player_stats:
            player_name = player_names.get(stat.player_id, f'Player {stat.player_id}')
            player_data = self.create_player_from_stats(stat, player_name)
            players_to_insert.append((
                player_data['id'], player_data['name'], player_data['team_id'],
                player_data['age'], player_data['position'], player_data['height_inches'],
                player_data['weight_pounds'], player_data['years_experience']
            ))
        
        # Remove duplicates
        players_to_insert = list(set(players_to_insert))
        
        if players_to_insert:
            execute_values(
                cursor,
                """INSERT INTO players (id, name, team_id, age, position, height_inches, weight_pounds, years_experience)
                   VALUES %s ON CONFLICT (id) DO UPDATE SET
                   name = EXCLUDED.name,
                   team_id = EXCLUDED.team_id,
                   updated_at = CURRENT_TIMESTAMP""",
                players_to_insert
            )
            
            conn.commit()
            logger.info(f"Inserted/updated {len(players_to_insert)} players")
        
        cursor.close()
    
    def insert_games(self, conn: psycopg2.extensions.connection, games: List[GameData]):
        """Insert games into database"""
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
    
    def insert_team_stats(self, conn: psycopg2.extensions.connection, team_stats: List[TeamGameStats]):
        """Insert team game statistics"""
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
    
    def insert_player_stats(self, conn: psycopg2.extensions.connection, player_stats: List[PlayerGameStats]):
        """Insert player game statistics"""
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
    
    def initialize_teams(self):
        """One-time setup: fetch and insert all NBA teams"""
        logger.info("🚀 Initializing NBA teams...")
        teams_data = self.fetch_nba_teams()
        self.insert_teams(teams_data)
        logger.info("✅ Teams initialization complete")
    
    def load_games_for_date(self, game_date: date, initialize_teams_first: bool = False):
        """Main method to load all games for a specific date"""
        logger.info(f"Starting pipeline for date: {game_date}")
        
        try:
            # Optionally initialize teams first
            if initialize_teams_first:
                self.initialize_teams()
            
            # Fetch games from API
            games_raw = self.fetch_games_for_date(game_date)
            
            if not games_raw:
                logger.info("No games found for this date")
                return
            
            # Parse game data
            games = []
            all_team_stats = []
            all_player_stats = []
            all_boxscore_data = []
            
            for game_dict in games_raw:
                game_data = self.parse_game_data(game_dict, game_date)
                games.append(game_data)
                
                # Only fetch detailed stats for completed games
                if game_data.status == 'completed':
                    try:
                        boxscore_data = self.fetch_boxscore(game_data.game_id)
                        all_boxscore_data.append((game_data, boxscore_data))
                        
                        # Parse team and player stats
                        team_stats = self.parse_team_stats(boxscore_data, game_data.game_id, game_data)
                        player_stats = self.parse_player_stats(boxscore_data, game_data.game_id, game_data)
                        
                        all_team_stats.extend(team_stats)
                        all_player_stats.extend(player_stats)
                        
                        # Update game scores
                        if team_stats:
                            for team_stat in team_stats:
                                if team_stat.game_type == 'Home':
                                    game_data.home_score = team_stat.points
                                    game_data.away_score = team_stat.opponent_points
                                    break
                        
                    except Exception as e:
                        logger.error(f"Error processing boxscore for game {game_data.game_id}: {e}")
                        continue
            
            # Insert into database
            with self.get_connection() as conn:
                # Insert games first
                if games:
                    self.insert_games(conn, games)
                
                # Insert players from stats (creates players as needed)
                for game_data, boxscore_data in all_boxscore_data:
                    game_player_stats = [ps for ps in all_player_stats if ps.game_id == game_data.game_id]
                    if game_player_stats:
                        self.insert_players_from_stats(conn, boxscore_data, game_player_stats)
                
                # Insert team and player stats
                if all_team_stats:
                    self.insert_team_stats(conn, all_team_stats)
                
                if all_player_stats:
                    self.insert_player_stats(conn, all_player_stats)
            
            logger.info(f"Pipeline completed successfully. Loaded {len(games)} games, "
                       f"{len(all_team_stats)} team stats, {len(all_player_stats)} player stats")
            
        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            raise


def main():
    """Example usage"""
    # Database configuration
    db_config = {
        'host': 'localhost',
        'database': 'nba_analytics',
        'user': 'nba_user',
        'password': 'your_password',
        'port': 5432
    }
    
    # Initialize pipeline
    pipeline = NBADataPipeline(db_config)
    
    # Option 1: Clear everything and start fresh
    print("🧹 Starting fresh data load...")
    pipeline.clear_existing_data()
    
    # Option 2: Initialize teams first (one-time setup)
    print("🏀 Setting up NBA teams...")
    pipeline.initialize_teams()
    
    # Option 3: Load games for a specific date
    target_date = date(2024, 1, 15)  # Example date
    print(f"📅 Loading games for {target_date}...")
    pipeline.load_games_for_date(target_date)
    
    print("🎉 Pipeline completed!")


def setup_fresh_database():
    """Complete fresh setup - clears everything and initializes teams"""
    db_config = {
        'host': 'localhost',
        'database': 'nba_analytics', 
        'user': 'nba_user',
        'password': 'your_password',
        'port': 5432
    }
    
    pipeline = NBADataPipeline(db_config)
    
    # Step 1: Clear existing data
    pipeline.clear_existing_data()
    
    # Step 2: Load all NBA teams
    pipeline.initialize_teams()
    
    print("✅ Fresh database setup complete!")
    print("🚀 Ready to load games with: pipeline.load_games_for_date(date(2024, 1, 15))")


def load_single_day(target_date: date):
    """Load games for a single day (assumes teams are already set up)"""
    db_config = {
        'host': 'localhost',
        'database': 'nba_analytics',
        'user': 'nba_user', 
        'password': 'your_password',
        'port': 5432
    }
    
    pipeline = NBADataPipeline(db_config)
    pipeline.load_games_for_date(target_date)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "setup":
            # Fresh setup: python nba_pipeline.py setup
            setup_fresh_database()
            
        elif command == "load":
            # Load specific date: python nba_pipeline.py load 2024-01-15
            if len(sys.argv) > 2:
                date_str = sys.argv[2]
                try:
                    year, month, day = date_str.split('-')
                    target_date = date(int(year), int(month), int(day))
                    load_single_day(target_date)
                except ValueError:
                    print("❌ Invalid date format. Use YYYY-MM-DD")
                    sys.exit(1)
            else:
                print("❌ Please provide a date: python nba_pipeline.py load 2024-01-15")
                sys.exit(1)
        else:
            print("❌ Unknown command. Use 'setup' or 'load'")
            sys.exit(1)
    else:
        # Default behavior
        main()