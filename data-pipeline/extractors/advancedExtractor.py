#!/usr/bin/env python3
"""
Advanced NBA Stats Extractor
Extracts NBA advanced player and team statistics using boxscoreadvancedv2 endpoint
"""

import logging
from datetime import date, timedelta
from typing import List

from utils.nbaApiUtils import fetch_advanced_boxscore, check_nba_api_availability
from utils.databaseUtils import DatabaseManager
from parsers.dataParsers import AdvancedStatsParser

logger = logging.getLogger(__name__)

class AdvancedStatsExtractor:
    """Extract NBA advanced statistics for games"""
    
    def __init__(self, db_config: dict):
        """Initialize with database configuration"""
        check_nba_api_availability()
        self.db_manager = DatabaseManager(db_config)
        self.stats_parser = AdvancedStatsParser(self.db_manager)
    
    def extract_advanced_stats_for_date(self, game_date: date):
        """Extract advanced stats for all completed games on a specific date"""
        logger.info(f"Starting advanced stats extraction for {game_date}")
        
        try:
            # Get existing players to check against
            existing_players = self.db_manager.get_existing_players()
            logger.info(f"Found {len(existing_players)} existing players in database")
            
            # Get all completed games for this date from database
            games = self.db_manager.get_completed_games_for_date(game_date)
            
            if not games:
                logger.info(f"No completed games found for {game_date}")
                return
            
            logger.info(f"Found {len(games)} completed games for {game_date}")
            
            total_team_stats = 0
            total_player_stats = 0
            
            for game in games:
                game_id = game['id']
                try:
                    logger.info(f"Processing game {game_id}")
                    
                    # Get game info - ensure we have the right keys
                    game_info = {
                        'id': game['id'],
                        'home_team_id': game['home_team_id'],
                        'away_team_id': game['away_team_id'],
                        'status': game['status']
                    }
                    
                    # Fetch advanced boxscore data
                    boxscore_data = fetch_advanced_boxscore(game_id)
                    
                    # Parse team and player advanced stats
                    team_stats = self.stats_parser.parse_team_advanced_stats(boxscore_data, game_id, game_info)
                    player_stats = self.stats_parser.parse_player_advanced_stats(boxscore_data, game_id, game_info, existing_players)
                    
                    # Insert into database
                    if team_stats:
                        self.db_manager.insert_team_advanced_stats(team_stats)
                        total_team_stats += len(team_stats)
                    
                    if player_stats:
                        self.db_manager.insert_player_advanced_stats(player_stats)
                        total_player_stats += len(player_stats)
                    
                    logger.info(f"Completed game {game_id}: {len(team_stats)} team stats, {len(player_stats)} player stats")
                    
                except Exception as e:
                    logger.error(f"Error processing advanced stats for game {game_id}: {e}")
                    continue
            
            logger.info(f"Advanced stats extraction completed for {game_date}! "
                       f"Total: {total_team_stats} team stats, {total_player_stats} player stats")
            
        except Exception as e:
            logger.error(f"Advanced stats extraction failed for {game_date}: {e}")
            raise
    
    def extract_advanced_stats_for_date_range(self, start_date: date, end_date: date):
        """Extract advanced stats for a date range"""
        logger.info(f"Starting advanced stats extraction for date range: {start_date} to {end_date}")
        
        current_date = start_date
        total_team_stats = 0
        total_player_stats = 0
        
        while current_date <= end_date:
            try:
                logger.info(f"Processing {current_date}")
                
                # Get existing players to check against
                existing_players = self.db_manager.get_existing_players()
                
                # Get all completed games for this date from database
                games = self.db_manager.get_completed_games_for_date(current_date)
                
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
                        boxscore_data = fetch_advanced_boxscore(game_id)
                        
                        # Parse team and player advanced stats
                        team_stats = self.stats_parser.parse_team_advanced_stats(boxscore_data, game_id, game_info)
                        player_stats = self.stats_parser.parse_player_advanced_stats(boxscore_data, game_id, game_info, existing_players)
                        
                        # Insert into database
                        if team_stats:
                            self.db_manager.insert_team_advanced_stats(team_stats)
                            total_team_stats += len(team_stats)
                        
                        if player_stats:
                            self.db_manager.insert_player_advanced_stats(player_stats)
                            total_player_stats += len(player_stats)
                        
                        logger.info(f"Completed game {game_id}: {len(team_stats)} team stats, {len(player_stats)} player stats")
                        
                    except Exception as e:
                        logger.error(f"Error processing advanced stats for game {game_id}: {e}")
                        continue
                
                logger.info(f"Completed {current_date}: {total_team_stats} total team stats, {total_player_stats} total player stats so far")
                
            except Exception as e:
                logger.error(f"Error processing {current_date}: {e}")
            
            current_date += timedelta(days=1)
        
        logger.info(f"Date range advanced stats extraction completed! "
                   f"Total: {total_team_stats} team stats, {total_player_stats} player stats")