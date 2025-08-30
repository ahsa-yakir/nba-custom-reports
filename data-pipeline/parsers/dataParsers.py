#!/usr/bin/env python3
"""
Data parsers for NBA API responses
"""

import logging
from typing import Dict, List
from datetime import date

from models.dataModels import (
    GameData, TeamGameStats, PlayerGameStats, 
    PlayerAdvancedStats, TeamAdvancedStats
)
from utils.nbaApiUtils import parse_minutes_to_decimal
from utils.playerUtils import add_unknown_player

logger = logging.getLogger(__name__)

class GameDataParser:
    """Parse game data from NBA API responses"""
    
    @staticmethod
    def parse_game_data(game_dict: Dict, game_date: date) -> GameData:
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
        
        # Determine game type from game_id or season type
        game_type = 'regular'  # Default to regular season
        
        # NBA game IDs follow patterns:
        # Regular season: 002YYSSSSSS (e.g., 0022300001)
        # Playoffs: 004YYSSSSSS (e.g., 0042300001) 
        # Preseason: 001YYSSSSSS (e.g., 0012300001)
        if len(game_id) >= 3:
            game_type_code = game_id[:3]
            if game_type_code == '001':
                game_type = 'preseason'
            elif game_type_code == '002':
                game_type = 'regular'
            elif game_type_code == '004':
                game_type = 'playoff'
        
        return GameData(
            game_id=game_id,
            game_date=game_date,
            season=season,
            home_team_id=home_team_id,
            away_team_id=away_team_id,
            status=status,
            game_type=game_type
        )

class TraditionalStatsParser:
    """Parse traditional statistics from NBA API responses"""
    
    def __init__(self, db_manager):
        self.db_manager = db_manager
    
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
                if add_unknown_player(
                    self.db_manager.get_connection(), 
                    stats_dict, 
                    game_id, 
                    self.db_manager.team_exists
                ):
                    # Add to existing_players set so we don't try to add them again in this session
                    existing_players.add(player_id)
                    added_players.append(f"{player_name} ({player_id})")
                else:
                    # If we couldn't add them, skip this player
                    logger.warning(f"⚠️ Skipping player {player_name} ({player_id}) - could not add to database")
                    continue
            
            # Convert minutes from "MM:SS" format to decimal
            min_str = stats_dict.get('MIN', '0:00')
            minutes_played = parse_minutes_to_decimal(min_str)
            
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

class AdvancedStatsParser:
    """Parse advanced statistics from NBA API responses"""
    
    def __init__(self, db_manager):
        self.db_manager = db_manager
    
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
                if add_unknown_player(
                    self.db_manager.get_connection(), 
                    stats_dict, 
                    game_id, 
                    self.db_manager.team_exists
                ):
                    # Add to existing_players set so we don't try to add them again in this session
                    existing_players.add(player_id)
                    added_players.append(f"{player_name} ({player_id})")
                else:
                    # If we couldn't add them, skip this player
                    logger.warning(f"⚠️ Skipping player {player_name} ({player_id}) - could not add to database")
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