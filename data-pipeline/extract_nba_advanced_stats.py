#!/usr/bin/env python3
"""
NBA Advanced Stats Extractor
Extracts NBA advanced player and team statistics using boxscoreadvancedv2 endpoint
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
    from nba_api.stats.endpoints import boxscoreadvancedv2, commonplayerinfo
    NBA_API_AVAILABLE = True
except ImportError:
    NBA_API_AVAILABLE = False
    print("❌ nba_api package not found. Please install with: pip install nba_api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class PlayerAdvancedStats:
    """Player advanced statistics for a single game"""
    player_id: str
    game_id: str
    team_id: str
    
    # Advanced efficiency metrics
    offensive_rating: float
    defensive_rating: float
    net_rating: float
    assist_percentage: float
    assist_turnover_ratio: float
    assist_ratio: float
    offensive_rebound_percentage: float
    defensive_rebound_percentage: float
    rebound_percentage: float
    turnover_percentage: float
    effective_field_goal_percentage: float
    true_shooting_percentage: float
    usage_percentage: float
    
    # Pace and possessions
    pace: float
    pie: float  # Player Impact Estimate
    
    # Game context
    game_type: str  # 'Home' or 'Away'

@dataclass
class TeamAdvancedStats:
    """Team advanced statistics for a single game"""
    team_id: str
    game_id: str
    
    # Advanced efficiency metrics
    offensive_rating: float
    defensive_rating: float
    net_rating: float
    assist_percentage: float
    assist_turnover_ratio: float
    offensive_rebound_percentage: float
    defensive_rebound_percentage: float
    rebound_percentage: float
    turnover_percentage: float
    effective_field_goal_percentage: float
    true_shooting_percentage: float
    
    # Pace and possessions
    pace: float
    pie: float  # Player Impact Estimate
    
    # Game context
    game_type: str  # 'Home' or 'Away'

class NBAAdvancedStatsExtractor:
    """Extract NBA advanced statistics for games"""
    
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
    
    def fetch_advanced_boxscore(self, game_id: str) -> Dict:
        """Fetch advanced boxscore data for a game"""
        logger.info(f"📊 Fetching advanced boxscore for game {game_id}")
        
        try:
            # Add delay to avoid rate limiting
            time.sleep(1)
            
            # Try nba_api advanced boxscore endpoint first
            try:
                boxscore = boxscoreadvancedv2.BoxScoreAdvancedV2(game_id=game_id)
                boxscore_dict = boxscore.get_dict()
                return boxscore_dict
            except Exception as api_error:
                logger.warning(f"nba_api advanced boxscore failed: {api_error}, trying direct API call...")
                
                # Fallback to direct API call
                import requests
                
                url = "https://stats.nba.com/stats/boxscoreadvancedv2"
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
            logger.error(f"Error fetching advanced boxscore for game {game_id}: {e}")
            raise
    
    def get_game_info(self, game_id: str) -> Optional[Dict]:
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
    
    def parse_team_advanced_stats(self, boxscore_data: Dict, game_id: str, game_info: Dict) -> List[TeamAdvancedStats]:
        """Parse team advanced statistics from boxscore data"""
        team_stats = []
        
        # Find TeamStats resultSet
        team_stats_data = None
        for result_set in boxscore_data['resultSets']:
            if result_set['name'] == 'TeamStats':
                team_stats_data = result_set
                break
        
        if not team_stats_data:
            logger.warning(f"No advanced team stats found for game {game_id}")
            return team_stats
        
        headers = team_stats_data['headers']
        
        for row in team_stats_data['rowSet']:
            stats_dict = dict(zip(headers, row))
            
            team_id = str(stats_dict['TEAM_ID'])
            
            # Determine if home or away
            game_type = 'Home' if team_id == game_info['home_team_id'] else 'Away'
            
            team_stat = TeamAdvancedStats(
                team_id=team_id,
                game_id=game_id,
                offensive_rating=stats_dict.get('OFF_RATING', 0.0),
                defensive_rating=stats_dict.get('DEF_RATING', 0.0),
                net_rating=stats_dict.get('NET_RATING', 0.0),
                assist_percentage=stats_dict.get('AST_PCT', 0.0),
                assist_turnover_ratio=stats_dict.get('AST_TO', 0.0),
                offensive_rebound_percentage=stats_dict.get('OREB_PCT', 0.0),
                defensive_rebound_percentage=stats_dict.get('DREB_PCT', 0.0),
                rebound_percentage=stats_dict.get('REB_PCT', 0.0),
                turnover_percentage=stats_dict.get('TM_TOV_PCT', 0.0),
                effective_field_goal_percentage=stats_dict.get('EFG_PCT', 0.0),
                true_shooting_percentage=stats_dict.get('TS_PCT', 0.0),
                pace=stats_dict.get('PACE', 0.0),
                pie=stats_dict.get('PIE', 0.0),
                game_type=game_type
            )
            
            team_stats.append(team_stat)
        
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
    
    def parse_player_advanced_stats(self, boxscore_data: Dict, game_id: str, game_info: Dict, 
                                  existing_players: set) -> List[PlayerAdvancedStats]:
        """Parse player advanced statistics from boxscore data, adding unknown players to database"""
        player_stats = []
        
        # Find PlayerStats resultSet
        player_stats_data = None
        for result_set in boxscore_data['resultSets']:
            if result_set['name'] == 'PlayerStats':
                player_stats_data = result_set
                break
        
        if not player_stats_data:
            logger.warning(f"No advanced player stats found for game {game_id}")
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
            team_id = str(stats_dict['TEAM_ID'])
            
            # Check if player exists in database
            if player_id not in existing_players:
                logger.info(f"🔍 Unknown player found: {player_name} ({player_id})")
                
                # Try to add the unknown player using same logic as traditional extractor
                if self.add_unknown_player(stats_dict, game_id):
                    # Add to existing_players set so we don't try to add them again in this session
                    existing_players.add(player_id)
                    added_players.append(f"{player_name} ({player_id})")
                else:
                    # If we couldn't add them, skip this player
                    logger.warning(f"⚠️  Skipping player {player_name} ({player_id}) - could not add to database")
                    continue
            
            # Determine home/away
            game_type = 'Home' if team_id == game_info['home_team_id'] else 'Away'
            
            player_stat = PlayerAdvancedStats(
                player_id=player_id,
                game_id=game_id,
                team_id=team_id,
                offensive_rating=stats_dict.get('OFF_RATING', 0.0),
                defensive_rating=stats_dict.get('DEF_RATING', 0.0),
                net_rating=stats_dict.get('NET_RATING', 0.0),
                assist_percentage=stats_dict.get('AST_PCT', 0.0),
                assist_turnover_ratio=stats_dict.get('AST_TO', 0.0),
                assist_ratio=stats_dict.get('AST_RATIO', 0.0),
                offensive_rebound_percentage=stats_dict.get('OREB_PCT', 0.0),
                defensive_rebound_percentage=stats_dict.get('DREB_PCT', 0.0),
                rebound_percentage=stats_dict.get('REB_PCT', 0.0),
                turnover_percentage=stats_dict.get('TOV_PCT', 0.0),
                effective_field_goal_percentage=stats_dict.get('EFG_PCT', 0.0),
                true_shooting_percentage=stats_dict.get('TS_PCT', 0.0),
                usage_percentage=stats_dict.get('USG_PCT', 0.0),
                pace=stats_dict.get('PACE', 0.0),
                pie=stats_dict.get('PIE', 0.0),
                game_type=game_type
            )
            
            player_stats.append(player_stat)
        
        # Log added players
        if added_players:
            logger.info(f"➕ Added {len(added_players)} new players in game {game_id}: {', '.join(added_players[:3])}{'...' if len(added_players) > 3 else ''}")
        
        return player_stats
    
    def insert_team_advanced_stats(self, conn: psycopg2.extensions.connection, team_stats: List[TeamAdvancedStats]):
        """Insert team advanced game statistics"""
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
        logger.info(f"✅ Inserted {len(team_stats)} team advanced stats")
    
    def insert_player_advanced_stats(self, conn: psycopg2.extensions.connection, player_stats: List[PlayerAdvancedStats]):
        """Insert player advanced game statistics"""
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
        logger.info(f"✅ Inserted {len(player_stats)} player advanced stats")
    
    def extract_advanced_stats_for_date(self, game_date: date):
        """Extract advanced stats for all completed games on a specific date"""
        logger.info(f"🚀 Starting advanced stats extraction for {game_date}")
        
        try:
            # Get existing players to check against
            existing_players = self.get_existing_players()
            logger.info(f"📊 Found {len(existing_players)} existing players in database")
            
            # Get all completed games for this date from database
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
            
            if not games:
                logger.info(f"No completed games found for {game_date}")
                return
            
            logger.info(f"Found {len(games)} completed games for {game_date}")
            
            total_team_stats = 0
            total_player_stats = 0
            
            for game in games:
                game_id = game['id']
                try:
                    logger.info(f"📊 Processing game {game_id}")
                    
                    # Get game info - ensure we have the right keys
                    game_info = {
                        'id': game['id'],
                        'home_team_id': game['home_team_id'],
                        'away_team_id': game['away_team_id'],
                        'status': game['status']
                    }
                    
                    # Fetch advanced boxscore data
                    boxscore_data = self.fetch_advanced_boxscore(game_id)
                    
                    # Parse team and player advanced stats
                    team_stats = self.parse_team_advanced_stats(boxscore_data, game_id, game_info)
                    player_stats = self.parse_player_advanced_stats(boxscore_data, game_id, game_info, existing_players)
                    
                    # Insert into database
                    with self.get_connection() as conn:
                        if team_stats:
                            self.insert_team_advanced_stats(conn, team_stats)
                            total_team_stats += len(team_stats)
                        
                        if player_stats:
                            self.insert_player_advanced_stats(conn, player_stats)
                            total_player_stats += len(player_stats)
                    
                    logger.info(f"✅ Completed game {game_id}: {len(team_stats)} team stats, {len(player_stats)} player stats")
                    
                except Exception as e:
                    logger.error(f"Error processing advanced stats for game {game_id}: {e}")
                    continue
            
            logger.info(f"🎉 Advanced stats extraction completed for {game_date}! "
                       f"Total: {total_team_stats} team stats, {total_player_stats} player stats")
            
        except Exception as e:
            logger.error(f"Advanced stats extraction failed for {game_date}: {e}")
            raise
    
    def extract_advanced_stats_for_date_range(self, start_date: date, end_date: date):
        """Extract advanced stats for a date range"""
        logger.info(f"🚀 Starting advanced stats extraction for date range: {start_date} to {end_date}")
        
    def extract_advanced_stats_for_date_range(self, start_date: date, end_date: date):
        """Extract advanced stats for a date range"""
        logger.info(f"🚀 Starting advanced stats extraction for date range: {start_date} to {end_date}")
        
        current_date = start_date
        total_team_stats = 0
        total_player_stats = 0
        
        while current_date <= end_date:
            try:
                logger.info(f"📅 Processing {current_date}")
                
                # Get existing players to check against
                existing_players = self.get_existing_players()
                
                # Get all completed games for this date from database
                with self.get_connection() as conn:
                    cursor = conn.cursor(cursor_factory=RealDictCursor)
                    cursor.execute("""
                        SELECT id, home_team_id, away_team_id, status
                        FROM games 
                        WHERE game_date = %s AND status = 'completed'
                        ORDER BY id
                    """, [current_date])
                    
                    games = cursor.fetchall()
                    cursor.close()
                
                if not games:
                    logger.info(f"No completed games found for {current_date}")
                    current_date += timedelta(days=1)
                    continue
                
                logger.info(f"Found {len(games)} completed games for {current_date}")
                
                for game in games:
                    game_id = game['id']
                    try:
                        # Get game info - ensure we have the right keys
                        game_info = {
                            'id': game['id'],
                            'home_team_id': game['home_team_id'],
                            'away_team_id': game['away_team_id'],
                            'status': game['status']
                        }
                        
                        # Fetch advanced boxscore data
                        boxscore_data = self.fetch_advanced_boxscore(game_id)
                        
                        # Parse team and player advanced stats
                        team_stats = self.parse_team_advanced_stats(boxscore_data, game_id, game_info)
                        player_stats = self.parse_player_advanced_stats(boxscore_data, game_id, game_info, existing_players)
                        
                        # Insert into database
                        with self.get_connection() as conn:
                            if team_stats:
                                self.insert_team_advanced_stats(conn, team_stats)
                                total_team_stats += len(team_stats)
                            
                            if player_stats:
                                self.insert_player_advanced_stats(conn, player_stats)
                                total_player_stats += len(player_stats)
                        
                        logger.info(f"✅ Completed game {game_id}: {len(team_stats)} team stats, {len(player_stats)} player stats")
                        
                    except Exception as e:
                        logger.error(f"Error processing advanced stats for game {game_id}: {e}")
                        continue
                
                logger.info(f"✅ Completed {current_date}: {total_team_stats} total team stats, {total_player_stats} total player stats so far")
                
            except Exception as e:
                logger.error(f"Error processing {current_date}: {e}")
            
            current_date += timedelta(days=1)
        
        logger.info(f"🎉 Date range advanced stats extraction completed! "
                   f"Total: {total_team_stats} team stats, {total_player_stats} player stats")

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
    extractor = NBAAdvancedStatsExtractor(db_config)
    
    # Example: Extract advanced stats for a specific date
    target_date = date(2025, 1, 19)
    extractor.extract_advanced_stats_for_date(target_date)
    
    # Example: Extract advanced stats for a date range
    # start_date = date(2025, 1, 15)
    # end_date = date(2025, 1, 22)
    # extractor.extract_advanced_stats_for_date_range(start_date, end_date)

if __name__ == "__main__":
    main()