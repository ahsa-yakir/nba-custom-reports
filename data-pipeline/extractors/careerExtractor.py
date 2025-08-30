#!/usr/bin/env python3
"""
NBA Career Stats Extractor
Extracts NBA player career statistics using playercareerstats endpoint
"""

import logging
from typing import Dict, List, Set
import time

from utils.nbaApiUtils import check_nba_api_availability
from utils.databaseUtils import DatabaseManager
from models.careerModels import (
    PlayerSeasonTotals, PlayerCareerTotals, PlayerSeasonRankings
)

# NBA API imports
try:
    from nba_api.stats.endpoints import playercareerstats
    NBA_API_AVAILABLE = True
except ImportError:
    NBA_API_AVAILABLE = False

logger = logging.getLogger(__name__)

class CareerStatsExtractor:
    """Extract NBA player career statistics"""
    
    def __init__(self, db_config: dict):
        """Initialize with database configuration"""
        check_nba_api_availability()
        self.db_manager = DatabaseManager(db_config)
    
    def fetch_player_career_stats(self, player_id: str) -> Dict:
        """Fetch career stats for a single player from NBA API"""
        logger.info(f"Fetching career stats for player {player_id}")
        
        try:
            # Add delay to avoid rate limiting
            time.sleep(1)
            
            # Try nba_api career stats endpoint first
            try:
                career_stats = playercareerstats.PlayerCareerStats(player_id=player_id)
                career_dict = career_stats.get_dict()
                return career_dict
            except Exception as api_error:
                logger.warning(f"nba_api career stats failed: {api_error}, trying direct API call...")
                
                # Fallback to direct API call
                import requests
                
                url = "https://stats.nba.com/stats/playercareerstats"
                params = {
                    'PlayerID': player_id,
                    'PerMode': 'Totals'
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
            logger.error(f"Error fetching career stats for player {player_id}: {e}")
            raise
    
    def parse_season_totals_regular(self, career_data: Dict, player_id: str) -> List[PlayerSeasonTotals]:
        """Parse regular season totals from career data"""
        season_totals = []
        
        # Find SeasonTotalsRegularSeason resultSet
        season_data = None
        for result_set in career_data['resultSets']:
            if result_set['name'] == 'SeasonTotalsRegularSeason':
                season_data = result_set
                break
        
        if not season_data:
            logger.warning(f"No regular season totals found for player {player_id}")
            return season_totals
        
        headers = season_data['headers']
        
        # Don't aggregate - create separate entries for each team, but SKIP "TOT" entries
        for row in season_data['rowSet']:
            stats_dict = dict(zip(headers, row))
            
            # Skip "TOT" (total) entries - we want individual team entries only
            team_abbreviation = stats_dict.get('TEAM_ABBREVIATION', '')
            if team_abbreviation == 'TOT':
                logger.debug(f"Skipping TOT entry for player {player_id} in season {stats_dict.get('SEASON_ID', '')}")
                continue
            
            season_total = PlayerSeasonTotals(
                player_id=player_id,
                season_id=stats_dict.get('SEASON_ID', ''),
                league_id=stats_dict.get('LEAGUE_ID', '00'),
                team_id=str(stats_dict.get('TEAM_ID', '')) if stats_dict.get('TEAM_ID') else None,
                team_abbreviation=team_abbreviation,
                player_age=stats_dict.get('PLAYER_AGE'),
                games_played=stats_dict.get('GP', 0),
                games_started=stats_dict.get('GS', 0),
                minutes_played=stats_dict.get('MIN', 0.0),
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
                points=stats_dict.get('PTS', 0)
            )
            
            season_totals.append(season_total)
        
        return season_totals
    
    def parse_career_totals_regular(self, career_data: Dict, player_id: str) -> PlayerCareerTotals:
        """Parse regular season career totals from career data"""
        # Find CareerTotalsRegularSeason resultSet
        career_data_set = None
        for result_set in career_data['resultSets']:
            if result_set['name'] == 'CareerTotalsRegularSeason':
                career_data_set = result_set
                break
        
        if not career_data_set or not career_data_set['rowSet']:
            logger.warning(f"No regular season career totals found for player {player_id}")
            return None
        
        headers = career_data_set['headers']
        row = career_data_set['rowSet'][0]  # Should only be one row for career totals
        stats_dict = dict(zip(headers, row))
        
        career_total = PlayerCareerTotals(
            player_id=player_id,
            league_id=stats_dict.get('LEAGUE_ID', '00'),
            games_played=stats_dict.get('GP', 0),
            games_started=stats_dict.get('GS', 0),
            minutes_played=stats_dict.get('MIN', 0.0),
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
            points=stats_dict.get('PTS', 0)
        )
        
        return career_total
    
    def parse_season_totals_playoffs(self, career_data: Dict, player_id: str) -> List[PlayerSeasonTotals]:
        """Parse playoff season totals from career data"""
        season_totals = []
        
        # Find SeasonTotalsPostSeason resultSet
        season_data = None
        for result_set in career_data['resultSets']:
            if result_set['name'] == 'SeasonTotalsPostSeason':
                season_data = result_set
                break
        
        if not season_data:
            logger.info(f"No playoff season totals found for player {player_id}")
            return season_totals
        
        headers = season_data['headers']
        
        # Skip "TOT" entries for playoffs as well
        for row in season_data['rowSet']:
            stats_dict = dict(zip(headers, row))
            
            # Skip "TOT" (total) entries - we want individual team entries only
            team_abbreviation = stats_dict.get('TEAM_ABBREVIATION', '')
            if team_abbreviation == 'TOT':
                logger.debug(f"Skipping playoff TOT entry for player {player_id} in season {stats_dict.get('SEASON_ID', '')}")
                continue
            
            season_total = PlayerSeasonTotals(
                player_id=player_id,
                season_id=stats_dict.get('SEASON_ID', ''),
                league_id=stats_dict.get('LEAGUE_ID', '00'),
                team_id=str(stats_dict.get('TEAM_ID', '')) if stats_dict.get('TEAM_ID') else None,
                team_abbreviation=team_abbreviation,
                player_age=stats_dict.get('PLAYER_AGE'),
                games_played=stats_dict.get('GP', 0),
                games_started=stats_dict.get('GS', 0),
                minutes_played=stats_dict.get('MIN', 0.0),
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
                points=stats_dict.get('PTS', 0)
            )
            
            season_totals.append(season_total)
        
        return season_totals
    
    def parse_career_totals_playoffs(self, career_data: Dict, player_id: str) -> PlayerCareerTotals:
        """Parse playoff career totals from career data"""
        # Find CareerTotalsPostSeason resultSet
        career_data_set = None
        for result_set in career_data['resultSets']:
            if result_set['name'] == 'CareerTotalsPostSeason':
                career_data_set = result_set
                break
        
        if not career_data_set or not career_data_set['rowSet']:
            logger.info(f"No playoff career totals found for player {player_id}")
            return None
        
        headers = career_data_set['headers']
        row = career_data_set['rowSet'][0]  # Should only be one row for career totals
        stats_dict = dict(zip(headers, row))
        
        career_total = PlayerCareerTotals(
            player_id=player_id,
            league_id=stats_dict.get('LEAGUE_ID', '00'),
            games_played=stats_dict.get('GP', 0),
            games_started=stats_dict.get('GS', 0),
            minutes_played=stats_dict.get('MIN', 0.0),
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
            points=stats_dict.get('PTS', 0)
        )
        
        return career_total
    
    def parse_season_rankings_regular(self, career_data: Dict, player_id: str) -> List[PlayerSeasonRankings]:
        """Parse regular season rankings from career data"""
        season_rankings = []
        
        # Find SeasonRankingsRegularSeason resultSet
        rankings_data = None
        for result_set in career_data['resultSets']:
            if result_set['name'] == 'SeasonRankingsRegularSeason':
                rankings_data = result_set
                break
        
        if not rankings_data:
            logger.info(f"No regular season rankings found for player {player_id}")
            return season_rankings
        
        headers = rankings_data['headers']
        
        for row in rankings_data['rowSet']:
            stats_dict = dict(zip(headers, row))
            
            # Skip "TOT" (total) entries for rankings as well
            team_abbreviation = stats_dict.get('TEAM_ABBREVIATION', '')
            if team_abbreviation == 'TOT':
                logger.debug(f"Skipping rankings TOT entry for player {player_id} in season {stats_dict.get('SEASON_ID', '')}")
                continue
            
            # Helper function to convert rank values to integers or None
            def parse_rank(value):
                if value is None or value == '' or str(value).upper() in ['NR', 'N/A', 'NULL']:
                    return None
                try:
                    return int(value)
                except (ValueError, TypeError):
                    return None
            
            season_ranking = PlayerSeasonRankings(
                player_id=player_id,
                season_id=stats_dict.get('SEASON_ID', ''),
                league_id=stats_dict.get('LEAGUE_ID', '00'),
                team_id=str(stats_dict.get('TEAM_ID', '')) if stats_dict.get('TEAM_ID') else None,
                team_abbreviation=team_abbreviation,
                player_age=parse_rank(stats_dict.get('PLAYER_AGE')),
                games_played_rank=parse_rank(stats_dict.get('GP_RANK')),
                games_started_rank=parse_rank(stats_dict.get('GS_RANK')),
                minutes_played_rank=parse_rank(stats_dict.get('MIN_RANK')),
                field_goals_made_rank=parse_rank(stats_dict.get('FGM_RANK')),
                field_goals_attempted_rank=parse_rank(stats_dict.get('FGA_RANK')),
                field_goal_percentage_rank=parse_rank(stats_dict.get('FG_PCT_RANK')),
                three_pointers_made_rank=parse_rank(stats_dict.get('FG3M_RANK')),
                three_pointers_attempted_rank=parse_rank(stats_dict.get('FG3A_RANK')),
                three_point_percentage_rank=parse_rank(stats_dict.get('FG3_PCT_RANK')),
                free_throws_made_rank=parse_rank(stats_dict.get('FTM_RANK')),
                free_throws_attempted_rank=parse_rank(stats_dict.get('FTA_RANK')),
                free_throw_percentage_rank=parse_rank(stats_dict.get('FT_PCT_RANK')),
                offensive_rebounds_rank=parse_rank(stats_dict.get('OREB_RANK')),
                defensive_rebounds_rank=parse_rank(stats_dict.get('DREB_RANK')),
                total_rebounds_rank=parse_rank(stats_dict.get('REB_RANK')),
                assists_rank=parse_rank(stats_dict.get('AST_RANK')),
                steals_rank=parse_rank(stats_dict.get('STL_RANK')),
                blocks_rank=parse_rank(stats_dict.get('BLK_RANK')),
                turnovers_rank=parse_rank(stats_dict.get('TOV_RANK')),
                personal_fouls_rank=parse_rank(stats_dict.get('PF_RANK')),
                points_rank=parse_rank(stats_dict.get('PTS_RANK'))
            )
            
            season_rankings.append(season_ranking)
        
        return season_rankings
    
    def parse_season_rankings_playoffs(self, career_data: Dict, player_id: str) -> List[PlayerSeasonRankings]:
        """Parse playoff season rankings from career data"""
        season_rankings = []
        
        # Find SeasonRankingsPostSeason resultSet
        rankings_data = None
        for result_set in career_data['resultSets']:
            if result_set['name'] == 'SeasonRankingsPostSeason':
                rankings_data = result_set
                break
        
        if not rankings_data:
            logger.info(f"No playoff season rankings found for player {player_id}")
            return season_rankings
        
        headers = rankings_data['headers']
        
        for row in rankings_data['rowSet']:
            stats_dict = dict(zip(headers, row))
            
            # Skip "TOT" (total) entries for playoff rankings as well
            team_abbreviation = stats_dict.get('TEAM_ABBREVIATION', '')
            if team_abbreviation == 'TOT':
                logger.debug(f"Skipping playoff rankings TOT entry for player {player_id} in season {stats_dict.get('SEASON_ID', '')}")
                continue
            
            # Helper function to convert rank values to integers or None
            def parse_rank(value):
                if value is None or value == '' or str(value).upper() in ['NR', 'N/A', 'NULL']:
                    return None
                try:
                    return int(value)
                except (ValueError, TypeError):
                    return None
            
            season_ranking = PlayerSeasonRankings(
                player_id=player_id,
                season_id=stats_dict.get('SEASON_ID', ''),
                league_id=stats_dict.get('LEAGUE_ID', '00'),
                team_id=str(stats_dict.get('TEAM_ID', '')) if stats_dict.get('TEAM_ID') else None,
                team_abbreviation=team_abbreviation,
                player_age=parse_rank(stats_dict.get('PLAYER_AGE')),
                games_played_rank=parse_rank(stats_dict.get('GP_RANK')),
                games_started_rank=parse_rank(stats_dict.get('GS_RANK')),
                minutes_played_rank=parse_rank(stats_dict.get('MIN_RANK')),
                field_goals_made_rank=parse_rank(stats_dict.get('FGM_RANK')),
                field_goals_attempted_rank=parse_rank(stats_dict.get('FGA_RANK')),
                field_goal_percentage_rank=parse_rank(stats_dict.get('FG_PCT_RANK')),
                three_pointers_made_rank=parse_rank(stats_dict.get('FG3M_RANK')),
                three_pointers_attempted_rank=parse_rank(stats_dict.get('FG3A_RANK')),
                three_point_percentage_rank=parse_rank(stats_dict.get('FG3_PCT_RANK')),
                free_throws_made_rank=parse_rank(stats_dict.get('FTM_RANK')),
                free_throws_attempted_rank=parse_rank(stats_dict.get('FTA_RANK')),
                free_throw_percentage_rank=parse_rank(stats_dict.get('FT_PCT_RANK')),
                offensive_rebounds_rank=parse_rank(stats_dict.get('OREB_RANK')),
                defensive_rebounds_rank=parse_rank(stats_dict.get('DREB_RANK')),
                total_rebounds_rank=parse_rank(stats_dict.get('REB_RANK')),
                assists_rank=parse_rank(stats_dict.get('AST_RANK')),
                steals_rank=parse_rank(stats_dict.get('STL_RANK')),
                blocks_rank=parse_rank(stats_dict.get('BLK_RANK')),
                turnovers_rank=parse_rank(stats_dict.get('TOV_RANK')),
                personal_fouls_rank=parse_rank(stats_dict.get('PF_RANK')),
                points_rank=parse_rank(stats_dict.get('PTS_RANK'))
            )
            
            season_rankings.append(season_ranking)
        
        return season_rankings
    
    def extract_player_career_stats(self, player_id: str) -> bool:
        """Extract and store career stats for a single player"""
        try:
            logger.info(f"Extracting career stats for player {player_id}")
            
            # Fetch career data from API
            career_data = self.fetch_player_career_stats(player_id)
            
            # Parse all career data types
            season_totals_regular = self.parse_season_totals_regular(career_data, player_id)
            career_totals_regular = self.parse_career_totals_regular(career_data, player_id)
            season_totals_playoffs = self.parse_season_totals_playoffs(career_data, player_id)
            career_totals_playoffs = self.parse_career_totals_playoffs(career_data, player_id)
            season_rankings_regular = self.parse_season_rankings_regular(career_data, player_id)
            season_rankings_playoffs = self.parse_season_rankings_playoffs(career_data, player_id)
            
            # Insert into database
            if season_totals_regular:
                self.db_manager.insert_player_season_totals_regular(season_totals_regular)
                logger.info(f"Inserted {len(season_totals_regular)} regular season totals")
            
            if career_totals_regular:
                self.db_manager.insert_player_career_totals_regular([career_totals_regular])
                logger.info("Inserted regular season career totals")
            
            if season_totals_playoffs:
                self.db_manager.insert_player_season_totals_playoffs(season_totals_playoffs)
                logger.info(f"Inserted {len(season_totals_playoffs)} playoff season totals")
            
            if career_totals_playoffs:
                self.db_manager.insert_player_career_totals_playoffs([career_totals_playoffs])
                logger.info("Inserted playoff career totals")
            
            if season_rankings_regular:
                self.db_manager.insert_player_season_rankings_regular(season_rankings_regular)
                logger.info(f"Inserted {len(season_rankings_regular)} regular season rankings")
            
            if season_rankings_playoffs:
                self.db_manager.insert_player_season_rankings_playoffs(season_rankings_playoffs)
                logger.info(f"Inserted {len(season_rankings_playoffs)} playoff season rankings")
            
            logger.info(f"Successfully extracted career stats for player {player_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to extract career stats for player {player_id}: {e}")
            return False
    
    def extract_career_stats_for_all_players(self, max_players: int = None) -> None:
        """Extract career stats for all players in the database"""
        logger.info("Starting career stats extraction for all players")
        
        try:
            # Get all player IDs from database
            player_ids = self.db_manager.get_all_player_ids()
            
            if max_players:
                player_ids = player_ids[:max_players]
                logger.info(f"Limited to first {max_players} players")
            
            logger.info(f"Found {len(player_ids)} players to process")
            
            successful_extractions = 0
            failed_extractions = 0
            
            for i, player_id in enumerate(player_ids, 1):
                try:
                    logger.info(f"Processing player {i}/{len(player_ids)}: {player_id}")
                    
                    if self.extract_player_career_stats(player_id):
                        successful_extractions += 1
                    else:
                        failed_extractions += 1
                    
                    # Progress logging every 10 players
                    if i % 10 == 0:
                        logger.info(f"Progress: {i}/{len(player_ids)} players processed. "
                                   f"Success: {successful_extractions}, Failed: {failed_extractions}")
                    
                except Exception as e:
                    logger.error(f"Error processing player {player_id}: {e}")
                    failed_extractions += 1
                    continue
            
            logger.info(f"Career stats extraction completed! "
                       f"Success: {successful_extractions}, Failed: {failed_extractions}")
            
        except Exception as e:
            logger.error(f"Career stats extraction failed: {e}")
            raise
    
    def extract_career_stats_for_player_list(self, player_ids: List[str]) -> None:
        """Extract career stats for a specific list of players"""
        logger.info(f"Starting career stats extraction for {len(player_ids)} specific players")
        
        successful_extractions = 0
        failed_extractions = 0
        
        for i, player_id in enumerate(player_ids, 1):
            try:
                logger.info(f"Processing player {i}/{len(player_ids)}: {player_id}")
                
                if self.extract_player_career_stats(player_id):
                    successful_extractions += 1
                else:
                    failed_extractions += 1
                
            except Exception as e:
                logger.error(f"Error processing player {player_id}: {e}")
                failed_extractions += 1
                continue
        
        logger.info(f"Career stats extraction completed for player list! "
                   f"Success: {successful_extractions}, Failed: {failed_extractions}")
    
    def update_career_stats_for_active_players(self) -> None:
        """Update career stats only for currently active players"""
        logger.info("Updating career stats for active players only")
        
        try:
            # Get active player IDs (players with a current team)
            active_player_ids = self.db_manager.get_active_player_ids()
            logger.info(f"Found {len(active_player_ids)} active players")
            
            self.extract_career_stats_for_player_list(active_player_ids)
            
        except Exception as e:
            logger.error(f"Failed to update career stats for active players: {e}")
            raise