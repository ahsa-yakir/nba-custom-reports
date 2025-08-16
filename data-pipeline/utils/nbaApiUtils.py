#!/usr/bin/env python3
"""
NBA API utilities - shared functions for API interactions
"""

import logging
import time
from typing import Dict, List
from datetime import date

# NBA API imports
try:
    from nba_api.stats.endpoints import scoreboardv2, boxscoretraditionalv2, boxscoreadvancedv2
    NBA_API_AVAILABLE = True
except ImportError:
    NBA_API_AVAILABLE = False

logger = logging.getLogger(__name__)

def check_nba_api_availability():
    """Check if NBA API is available and raise error if not"""
    if not NBA_API_AVAILABLE:
        raise ImportError("nba_api package is required. Install with: pip install nba_api")

def fetch_games_for_date(game_date: date) -> List[Dict]:
    """Fetch games from NBA API for a specific date"""
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
        logger.error(f"Error fetching games for {date_str}: {e}")
        # If the date has no games, return empty list instead of failing
        if "no games" in str(e).lower() or len(str(e)) == 0:
            logger.info("No games found for this date")
            return []
        raise

def fetch_traditional_boxscore(game_id: str) -> Dict:
    """Fetch traditional boxscore data for a game"""
    logger.info(f"Fetching traditional boxscore for game {game_id}")
    
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
        logger.error(f"Error fetching traditional boxscore for game {game_id}: {e}")
        raise

def fetch_advanced_boxscore(game_id: str) -> Dict:
    """Fetch advanced boxscore data for a game"""
    logger.info(f"Fetching advanced boxscore for game {game_id}")
    
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

def parse_minutes_to_decimal(min_str: str) -> float:
    """Convert minutes from 'MM:SS' format to decimal"""
    if ':' in min_str:
        try:
            minutes, seconds = min_str.split(':')
            return int(minutes) + int(seconds) / 60.0
        except (ValueError, IndexError):
            return 0.0
    else:
        return 0.0