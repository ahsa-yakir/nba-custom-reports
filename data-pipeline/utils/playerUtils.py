#!/usr/bin/env python3
"""
Player utilities - shared functions for player data handling
"""

import logging
from typing import Dict, Optional
import time

# NBA API imports
try:
    from nba_api.stats.endpoints import commonplayerinfo
    NBA_API_AVAILABLE = True
except ImportError:
    NBA_API_AVAILABLE = False

logger = logging.getLogger(__name__)

def normalize_position(position: str) -> str:
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

def parse_height_to_inches(height_str: str) -> int:
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

def calculate_age_from_birthdate(birthdate_str) -> Optional[int]:
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

def fetch_player_details(player_id: str) -> Dict:
    """
    Fetch detailed player information using CommonPlayerInfo endpoint
    Returns player details including height, weight, age, position, experience
    """
    try:
        logger.info(f"  Fetching detailed info for player {player_id}")
        
        # Add delay to avoid rate limiting
        time.sleep(0.5)
        
        # Fetch player info from NBA API
        player_info = commonplayerinfo.CommonPlayerInfo(player_id=player_id)
        player_data = player_info.get_data_frames()[0]  # CommonPlayerInfo DataFrame
        
        if not player_data.empty:
            player_record = player_data.iloc[0]  # Get first (and only) record
            
            # Parse height from "6-1" format to inches
            height_str = player_record.get('HEIGHT', '6-0')
            height_inches = parse_height_to_inches(height_str)
            
            # Parse weight
            weight_str = str(player_record.get('WEIGHT', '200'))
            try:
                weight_pounds = int(weight_str) if weight_str and weight_str != 'nan' else 200
            except:
                weight_pounds = 200
            
            # Calculate age from birthdate
            birthdate_str = player_record.get('BIRTHDATE')
            age = calculate_age_from_birthdate(birthdate_str)
            
            # Get position and normalize it
            position = player_record.get('POSITION', 'G')
            position = normalize_position(position)
            
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

def add_unknown_player(db_connection, player_stats_dict: Dict, game_id: str, 
                      team_exists_func) -> bool:
    """
    Add an unknown player to the database with detailed info from NBA API
    Returns True if successfully added, False otherwise
    """
    try:
        player_id = str(player_stats_dict['PLAYER_ID'])
        player_name = player_stats_dict.get('PLAYER_NAME', f'Player {player_id}')
        game_team_id = str(player_stats_dict['TEAM_ID'])
        
        logger.info(f"Adding unknown player: {player_name} ({player_id})")
        
        # Fetch detailed player information from NBA API
        player_details = fetch_player_details(player_id)
        
        if player_details:
            # Use API data but handle team_id carefully
            api_team_id = player_details['team_id']
            
            # Handle cases where player has no current team (traded, waived, etc.)
            if not api_team_id or api_team_id == '0' or api_team_id == '' or api_team_id == 'None':
                # Use the team they're playing for in this game
                team_id = game_team_id
                logger.info(f"  Player has no current team (API returned '{api_team_id}'), using game team: {game_team_id}")
            else:
                # Verify the API team exists in our database
                if team_exists_func(api_team_id):
                    team_id = api_team_id
                else:
                    # API team doesn't exist in our DB, use game team
                    team_id = game_team_id
                    logger.info(f"  API team {api_team_id} not in database, using game team: {game_team_id}")
            
            age = player_details['age']
            position = normalize_position(player_details['position'])
            height_inches = player_details['height_inches']
            weight_pounds = player_details['weight_pounds']
            years_experience = player_details['years_experience']
            
            logger.info(f"  Fetched details: {position}, {height_inches}\" tall, {weight_pounds} lbs, "
                      f"{years_experience} years exp, age {age}, team: {team_id}")
        else:
            # Fallback to defaults if API call fails
            logger.warning(f"  Using default values for {player_name}")
            team_id = game_team_id
            age = None
            position = 'G'
            height_inches = 72
            weight_pounds = 200
            years_experience = 0
        
        # Final validation: make sure the team exists
        if not team_exists_func(team_id):
            logger.error(f"  Team {team_id} does not exist in database, cannot add player")
            return False
        
        with db_connection as conn:
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
            
        logger.info(f"Successfully added player {player_name} ({player_id}) to team {team_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to add unknown player {player_id}: {e}")
        return False