#!/usr/bin/env python3
"""
Traditional NBA Stats Extractor
Extracts NBA games, team stats, and player stats for specific dates or date ranges
"""

import logging
from datetime import date, timedelta
from typing import List

from utils.nbaApiUtils import fetch_games_for_date, fetch_traditional_boxscore, check_nba_api_availability
from utils.databaseUtils import DatabaseManager
from parsers.dataParsers import GameDataParser, TraditionalStatsParser

logger = logging.getLogger(__name__)

class TraditionalStatsExtractor:
    """Extract NBA traditional game data for dates or date ranges"""
    
    def __init__(self, db_config: dict):
        """Initialize with database configuration"""
        check_nba_api_availability()
        self.db_manager = DatabaseManager(db_config)
        self.game_parser = GameDataParser()
        self.stats_parser = TraditionalStatsParser(self.db_manager)
    
    def extract_games_for_date(self, game_date: date):
        """Extract all games and stats for a specific date"""
        logger.info(f"Starting data extraction for {game_date}")
        
        try:
            # Get existing players to check against
            existing_players = self.db_manager.get_existing_players()
            logger.info(f"Found {len(existing_players)} existing players in database")
            
            # Fetch games from API
            games_raw = fetch_games_for_date(game_date)
            
            if not games_raw:
                logger.info("No games found for this date")
                return
            
            # Parse game data
            games = []
            all_team_stats = []
            all_player_stats = []
            
            for game_dict in games_raw:
                game_data = self.game_parser.parse_game_data(game_dict, game_date)
                games.append(game_data)
                
                # Only fetch detailed stats for completed games
                if game_data.status == 'completed':
                    try:
                        boxscore_data = fetch_traditional_boxscore(game_data.game_id)
                        
                        # Parse team and player stats
                        team_stats = self.stats_parser.parse_team_stats(boxscore_data, game_data.game_id, game_data)
                        player_stats = self.stats_parser.parse_player_stats(boxscore_data, game_data.game_id, game_data, existing_players)
                        
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
            if games:
                self.db_manager.insert_games(games)
            
            if all_team_stats:
                self.db_manager.insert_team_game_stats(all_team_stats)
            
            if all_player_stats:
                self.db_manager.insert_player_game_stats(all_player_stats)
            
            logger.info(f"Extraction completed! Processed {len(games)} games, "
                       f"{len(all_team_stats)} team stats, {len(all_player_stats)} player stats")
            
        except Exception as e:
            logger.error(f"Data extraction failed: {e}")
            raise
    
    def extract_games_for_date_range(self, start_date: date, end_date: date):
        """Extract games for a date range"""
        logger.info(f"Starting data extraction for date range: {start_date} to {end_date}")
        
        current_date = start_date
        total_games = 0
        total_team_stats = 0
        total_player_stats = 0
        
        while current_date <= end_date:
            try:
                logger.info(f"Processing {current_date}")
                
                # Get existing players to check against
                existing_players = self.db_manager.get_existing_players()
                
                # Fetch games from API
                games_raw = fetch_games_for_date(current_date)
                
                if not games_raw:
                    logger.info(f"No games found for {current_date}")
                    current_date += timedelta(days=1)
                    continue
                
                # Parse game data
                games = []
                all_team_stats = []
                all_player_stats = []
                
                for game_dict in games_raw:
                    game_data = self.game_parser.parse_game_data(game_dict, current_date)
                    games.append(game_data)
                    
                    # Only fetch detailed stats for completed games
                    if game_data.status == 'completed':
                        try:
                            boxscore_data = fetch_traditional_boxscore(game_data.game_id)
                            
                            # Parse team and player stats
                            team_stats = self.stats_parser.parse_team_stats(boxscore_data, game_data.game_id, game_data)
                            player_stats = self.stats_parser.parse_player_stats(boxscore_data, game_data.game_id, game_data, existing_players)
                            
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
                if games:
                    self.db_manager.insert_games(games)
                    total_games += len(games)
                
                if all_team_stats:
                    self.db_manager.insert_team_game_stats(all_team_stats)
                    total_team_stats += len(all_team_stats)
                
                if all_player_stats:
                    self.db_manager.insert_player_game_stats(all_player_stats)
                    total_player_stats += len(all_player_stats)
                
                logger.info(f"Completed {current_date}: {len(games)} games, {len(all_team_stats)} team stats, {len(all_player_stats)} player stats")
                
            except Exception as e:
                logger.error(f"Error processing {current_date}: {e}")
            
            current_date += timedelta(days=1)
        
        logger.info(f"Date range extraction completed! Total: {total_games} games, "
                   f"{total_team_stats} team stats, {total_player_stats} player stats")