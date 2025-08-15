#!/usr/bin/env python3
"""
NBA Game Data Extractor
Extracts NBA games, team stats, and player stats for specific dates or date ranges
"""

import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
import logging
from dataclasses import dataclass
import time

# NBA API imports
try:
    from nba_api.stats.endpoints import scoreboardv2, boxscoretraditionalv2, commonplayerinfo
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

class NBADataExtractor:
    """Extract NBA game data for dates or date ranges"""
    
    def __init__(self, db_config: Dict[str, str]):
        """Initialize with database configuration"""
        if not NBA_API_AVAILABLE:
            raise ImportError("nba_api package is required. Install with: pip install nba_api")
            
        self.db_config = db_config
    
    def get_connection(self) -> psycopg2.extensions.connection:
        """Create database connection"""
        return psycopg2.connect(**self.db_config)
    
    def get_existing_players(self) -> set:
        """Get set of existing player IDs from database"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM players")
            player_ids = {str(row[0]) for row in cursor.fetchall()}
            cursor.close()
            return player_ids
    
    def fetch_games_for_date(self, game_date: date) -> List[Dict]:
        """Fetch games from NBA API for a specific date"""
        date_str = game_date.strftime('%m/%d/%Y')
        
        logger.info(f"🗓️  Fetching games for {date_str}")
        
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
            logger.error(f"Error fetching games for {date_str}: {e}")
            # If the date has no games, return empty list instead of failing
            if "no games" in str(e).lower() or len(str(e)) == 0:
                logger.info("No games found for this date")
                return []
            raise
    
    def fetch_boxscore(self, game_id: str) -> Dict:
        """Fetch detailed boxscore data for a game"""
        logger.info(f"📊 Fetching boxscore for game {game_id}")
        
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
                turnovers=stats_dict.get('TO', 0),  # Fixed: Changed from 'TOV' to 'TO'
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
    
    def normalize_position(self, position: str) -> str:
        """
        Normalize NBA position names to fit database constraints (max 10 chars)
        """
        if not position or str(position) == 'nan':
            return 'G'
        
        # Clean up the position string
        position = str(position).strip()
        
        # Handle common long position names
        position_mapping = {
            'Forward-Center': 'F-C',
            'Center-Forward': 'C-F',
            'Guard-Forward': 'G-F',
            'Forward-Guard': 'F-G',
            'Point Guard': 'PG',
            'Shooting Guard': 'SG',
            'Small Forward': 'SF',
            'Power Forward': 'PF',
            'Center': 'C',
            'Forward': 'F',
            'Guard': 'G'
        }
        
        # Check if we have a mapping for this position
        if position in position_mapping:
            return position_mapping[position]
        
        # If no mapping found, truncate to 10 characters
        if len(position) > 10:
            # Try to intelligently truncate
            if '-' in position:
                # For hyphenated positions like "Forward-Center", take first letter of each part
                parts = position.split('-')
                return '-'.join([part[0] for part in parts if part])[:10]
            else:
                # Just truncate
                return position[:10]
        
        return position
    
    def fetch_player_details(self, player_id: str) -> Dict:
        """
        Fetch detailed player information using CommonPlayerInfo endpoint
        Returns player details including height, weight, age, position, experience
        """
        try:
            logger.info(f"  🔍 Fetching detailed info for player {player_id}")
            
            # Add delay to avoid rate limiting
            time.sleep(0.5)
            
            # Fetch player info from NBA API
            player_info = commonplayerinfo.CommonPlayerInfo(player_id=player_id)
            player_data = player_info.get_data_frames()[0]  # CommonPlayerInfo DataFrame
            
            if not player_data.empty:
                player_record = player_data.iloc[0]  # Get first (and only) record
                
                # Parse height from "6-1" format to inches
                height_str = player_record.get('HEIGHT', '6-0')
                height_inches = self.parse_height_to_inches(height_str)
                
                # Parse weight
                weight_str = str(player_record.get('WEIGHT', '200'))
                try:
                    weight_pounds = int(weight_str) if weight_str and weight_str != 'nan' else 200
                except:
                    weight_pounds = 200
                
                # Calculate age from birthdate
                birthdate_str = player_record.get('BIRTHDATE')
                age = self.calculate_age_from_birthdate(birthdate_str)
                
                # Get position and normalize it
                position = player_record.get('POSITION', 'G')
                position = self.normalize_position(position)
                
                # Get years of experience
                season_exp = player_record.get('SEASON_EXP')
                try:
                    years_experience = int(season_exp) if season_exp and str(season_exp) != 'nan' else 0
                except:
                    years_experience = 0
                
                # Get team info
                team_id = str(player_record.get('TEAM_ID', ''))
                team_name = player_record.get('TEAM_NAME', '')
                
                return {
                    'height_inches': height_inches,
                    'weight_pounds': weight_pounds,
                    'age': age,
                    'position': position,
                    'years_experience': years_experience,
                    'team_id': team_id,
                    'team_name': team_name
                }
            else:
                logger.warning(f"No detailed info found for player {player_id}")
                return None
                
        except Exception as e:
            logger.warning(f"Could not fetch detailed info for player {player_id}: {e}")
            return None
    
    def parse_height_to_inches(self, height_str: str) -> int:
        """Convert height string like '6-1' to inches"""
        try:
            if not height_str or height_str == '' or str(height_str) == 'nan':
                return 72  # Default 6'0"
            
            if '-' in str(height_str):
                feet, inches = str(height_str).split('-')
                return int(feet) * 12 + int(inches)
            else:
                return 72  # Default if format is unexpected
        except:
            return 72  # Default on any error
    
    def calculate_age_from_birthdate(self, birthdate_str) -> Optional[int]:
        """Calculate age from birthdate string"""
        try:
            if not birthdate_str or str(birthdate_str) == 'nan':
                return None
            
            # Parse birthdate (format: '1989-12-09T00:00:00' or similar)
            from datetime import datetime
            if 'T' in str(birthdate_str):
                birth_date = datetime.strptime(str(birthdate_str)[:10], '%Y-%m-%d')
            else:
                birth_date = datetime.strptime(str(birthdate_str)[:10], '%Y-%m-%d')
            
            # Calculate age
            today = datetime.now()
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            return age
            
        except Exception:
            return None
    
    def add_unknown_player(self, player_stats_dict: Dict, game_id: str) -> bool:
        """
        Add an unknown player to the database with detailed info from NBA API
        Returns True if successfully added, False otherwise
        """
        try:
            player_id = str(player_stats_dict['PLAYER_ID'])
            player_name = player_stats_dict.get('PLAYER_NAME', f'Player {player_id}')
            game_team_id = str(player_stats_dict['TEAM_ID'])
            
            logger.info(f"➕ Adding unknown player: {player_name} ({player_id})")
            
            # Fetch detailed player information from NBA API
            player_details = self.fetch_player_details(player_id)
            
            if player_details:
                # Use API data but handle team_id carefully
                api_team_id = player_details['team_id']
                
                # Handle cases where player has no current team (traded, waived, etc.)
                if not api_team_id or api_team_id == '0' or api_team_id == '' or api_team_id == 'None':
                    # Use the team they're playing for in this game
                    team_id = game_team_id
                    logger.info(f"  🔄 Player has no current team (API returned '{api_team_id}'), using game team: {game_team_id}")
                else:
                    # Verify the API team exists in our database
                    if self.team_exists(api_team_id):
                        team_id = api_team_id
                    else:
                        # API team doesn't exist in our DB, use game team
                        team_id = game_team_id
                        logger.info(f"  🔄 API team {api_team_id} not in database, using game team: {game_team_id}")
                
                age = player_details['age']
                position = self.normalize_position(player_details['position'])
                height_inches = player_details['height_inches']
                weight_pounds = player_details['weight_pounds']
                years_experience = player_details['years_experience']
                
                logger.info(f"  📊 Fetched details: {position}, {height_inches}\" tall, {weight_pounds} lbs, "
                          f"{years_experience} years exp, age {age}, team: {team_id}")
            else:
                # Fallback to defaults if API call fails
                logger.warning(f"  ⚠️  Using default values for {player_name}")
                team_id = game_team_id
                age = None
                position = 'G'
                height_inches = 72
                weight_pounds = 200
                years_experience = 0
            
            # Final validation: make sure the team exists
            if not self.team_exists(team_id):
                logger.error(f"  ❌ Team {team_id} does not exist in database, cannot add player")
                return False
            
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Insert player with fetched or default values
                cursor.execute("""
                    INSERT INTO players (id, name, team_id, age, position, height_inches, weight_pounds, years_experience)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        team_id = EXCLUDED.team_id,
                        age = EXCLUDED.age,
                        position = EXCLUDED.position,
                        height_inches = EXCLUDED.height_inches,
                        weight_pounds = EXCLUDED.weight_pounds,
                        years_experience = EXCLUDED.years_experience,
                        updated_at = CURRENT_TIMESTAMP
                """, [
                    player_id, 
                    player_name, 
                    team_id,
                    age,
                    position,
                    height_inches,
                    weight_pounds,
                    years_experience
                ])
                
                conn.commit()
                cursor.close()
                
            logger.info(f"✅ Successfully added player {player_name} ({player_id}) to team {team_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to add unknown player {player_id}: {e}")
            return False
    
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
    def parse_player_stats(self, boxscore_data: Dict, game_id: str, game_data: GameData, 
                          existing_players: set) -> List[PlayerGameStats]:
        """Parse player statistics from boxscore data, adding unknown players to database"""
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
        added_players = []
        
        for row in player_stats_data['rowSet']:
            stats_dict = dict(zip(headers, row))
            
            # Skip if no minutes played (player didn't play)
            if not stats_dict.get('MIN') or stats_dict['MIN'] == '0:00':
                continue
            
            player_id = str(stats_dict['PLAYER_ID'])
            player_name = stats_dict.get('PLAYER_NAME', f'Player {player_id}')
            
            # Check if player exists in database
            if player_id not in existing_players:
                logger.info(f"🔍 Unknown player found: {player_name} ({player_id})")
                
                # Try to add the unknown player
                if self.add_unknown_player(stats_dict, game_id):
                    # Add to existing_players set so we don't try to add them again in this session
                    existing_players.add(player_id)
                    added_players.append(f"{player_name} ({player_id})")
                else:
                    # If we couldn't add them, skip this player
                    logger.warning(f"⚠️  Skipping player {player_name} ({player_id}) - could not add to database")
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
                turnovers=stats_dict.get('TO', 0),  # Fixed: Changed from 'TOV' to 'TO'
                personal_fouls=stats_dict.get('PF', 0),
                plus_minus=stats_dict.get('PLUS_MINUS', 0.0),
                started=started,
                game_type=game_type
            )
            
            player_stats.append(player_stat)
        
        # Log added players
        if added_players:
            logger.info(f"➕ Added {len(added_players)} new players in game {game_id}: {', '.join(added_players[:3])}{'...' if len(added_players) > 3 else ''}")
        
        return player_stats
    
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
        logger.info(f"✅ Inserted {len(games)} games")
    
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
        logger.info(f"✅ Inserted {len(team_stats)} team game stats")
    
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
        logger.info(f"✅ Inserted {len(player_stats)} player game stats")
    
    def extract_games_for_date(self, game_date: date):
        """Extract all games and stats for a specific date"""
        logger.info(f"🚀 Starting data extraction for {game_date}")
        
        try:
            # Get existing players to check against
            existing_players = self.get_existing_players()
            logger.info(f"📊 Found {len(existing_players)} existing players in database")
            
            # Fetch games from API
            games_raw = self.fetch_games_for_date(game_date)
            
            if not games_raw:
                logger.info("No games found for this date")
                return
            
            # Parse game data
            games = []
            all_team_stats = []
            all_player_stats = []
            
            for game_dict in games_raw:
                game_data = self.parse_game_data(game_dict, game_date)
                games.append(game_data)
                
                # Only fetch detailed stats for completed games
                if game_data.status == 'completed':
                    try:
                        boxscore_data = self.fetch_boxscore(game_data.game_id)
                        
                        # Parse team and player stats
                        team_stats = self.parse_team_stats(boxscore_data, game_data.game_id, game_data)
                        player_stats = self.parse_player_stats(boxscore_data, game_data.game_id, game_data, existing_players)
                        
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
                
                # Insert team and player stats
                if all_team_stats:
                    self.insert_team_stats(conn, all_team_stats)
                
                if all_player_stats:
                    self.insert_player_stats(conn, all_player_stats)
            
            logger.info(f"🎉 Extraction completed! Processed {len(games)} games, "
                       f"{len(all_team_stats)} team stats, {len(all_player_stats)} player stats")
            
        except Exception as e:
            logger.error(f"Data extraction failed: {e}")
            raise
    
    def extract_games_for_date_range(self, start_date: date, end_date: date):
        """Extract games for a date range"""
        logger.info(f"🚀 Starting data extraction for date range: {start_date} to {end_date}")
        
        current_date = start_date
        total_games = 0
        total_team_stats = 0
        total_player_stats = 0
        
        while current_date <= end_date:
            try:
                logger.info(f"📅 Processing {current_date}")
                
                # Get existing players to check against
                existing_players = self.get_existing_players()
                
                # Fetch games from API
                games_raw = self.fetch_games_for_date(current_date)
                
                if not games_raw:
                    logger.info(f"No games found for {current_date}")
                    current_date += timedelta(days=1)
                    continue
                
                # Parse game data
                games = []
                all_team_stats = []
                all_player_stats = []
                
                for game_dict in games_raw:
                    game_data = self.parse_game_data(game_dict, current_date)
                    games.append(game_data)
                    
                    # Only fetch detailed stats for completed games
                    if game_data.status == 'completed':
                        try:
                            boxscore_data = self.fetch_boxscore(game_data.game_id)
                            
                            # Parse team and player stats
                            team_stats = self.parse_team_stats(boxscore_data, game_data.game_id, game_data)
                            player_stats = self.parse_player_stats(boxscore_data, game_data.game_id, game_data, existing_players)
                            
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
                        total_games += len(games)
                    
                    # Insert team and player stats
                    if all_team_stats:
                        self.insert_team_stats(conn, all_team_stats)
                        total_team_stats += len(all_team_stats)
                    
                    if all_player_stats:
                        self.insert_player_stats(conn, all_player_stats)
                        total_player_stats += len(all_player_stats)
                
                logger.info(f"✅ Completed {current_date}: {len(games)} games, {len(all_team_stats)} team stats, {len(all_player_stats)} player stats")
                
            except Exception as e:
                logger.error(f"Error processing {current_date}: {e}")
            
            current_date += timedelta(days=1)
        
        logger.info(f"🎉 Date range extraction completed! Total: {total_games} games, "
                   f"{total_team_stats} team stats, {total_player_stats} player stats")

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
    
    # Initialize extractor
    extractor = NBADataExtractor(db_config)
    
    # Example: Extract games for a specific date
    target_date = date(2025, 1, 19)
    extractor.extract_games_for_date(target_date)
    
    # Example: Extract games for a date range
    # start_date = date(2025, 1, 15)
    # end_date = date(2025, 1, 22)
    # extractor.extract_games_for_date_range(start_date, end_date)

if __name__ == "__main__":
    main()