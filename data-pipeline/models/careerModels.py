#!/usr/bin/env python3
"""
Data models for NBA career statistics
"""

from dataclasses import dataclass
from typing import Optional

@dataclass
class PlayerSeasonTotals:
    """Player season totals (regular season or playoffs)"""
    player_id: str
    season_id: str
    league_id: str = '00'
    team_id: Optional[str] = None
    team_abbreviation: str = ''
    player_age: Optional[int] = None
    
    # Game stats
    games_played: int = 0
    games_started: int = 0
    minutes_played: float = 0.0
    
    # Shooting stats
    field_goals_made: int = 0
    field_goals_attempted: int = 0
    field_goal_percentage: float = 0.0
    
    # Three-point stats
    three_pointers_made: int = 0
    three_pointers_attempted: int = 0
    three_point_percentage: float = 0.0
    
    # Free throw stats
    free_throws_made: int = 0
    free_throws_attempted: int = 0
    free_throw_percentage: float = 0.0
    
    # Rebounding stats
    offensive_rebounds: int = 0
    defensive_rebounds: int = 0
    total_rebounds: int = 0
    
    # Other stats
    assists: int = 0
    steals: int = 0
    blocks: int = 0
    turnovers: int = 0
    personal_fouls: int = 0
    points: int = 0

@dataclass
class PlayerCareerTotals:
    """Player career totals (regular season or playoffs)"""
    player_id: str
    league_id: str = '00'
    
    # Game stats
    games_played: int = 0
    games_started: int = 0
    minutes_played: float = 0.0
    
    # Shooting stats
    field_goals_made: int = 0
    field_goals_attempted: int = 0
    field_goal_percentage: float = 0.0
    
    # Three-point stats
    three_pointers_made: int = 0
    three_pointers_attempted: int = 0
    three_point_percentage: float = 0.0
    
    # Free throw stats
    free_throws_made: int = 0
    free_throws_attempted: int = 0
    free_throw_percentage: float = 0.0
    
    # Rebounding stats
    offensive_rebounds: int = 0
    defensive_rebounds: int = 0
    total_rebounds: int = 0
    
    # Other stats
    assists: int = 0
    steals: int = 0
    blocks: int = 0
    turnovers: int = 0
    personal_fouls: int = 0
    points: int = 0

@dataclass
class PlayerSeasonRankings:
    """Player season rankings (regular season or playoffs)"""
    player_id: str
    season_id: str
    league_id: str = '00'
    team_id: Optional[str] = None
    team_abbreviation: str = ''
    player_age: Optional[int] = None
    
    # Game stats rankings
    games_played_rank: Optional[int] = None
    games_started_rank: Optional[int] = None
    minutes_played_rank: Optional[int] = None
    
    # Shooting stats rankings
    field_goals_made_rank: Optional[int] = None
    field_goals_attempted_rank: Optional[int] = None
    field_goal_percentage_rank: Optional[int] = None
    
    # Three-point stats rankings
    three_pointers_made_rank: Optional[int] = None
    three_pointers_attempted_rank: Optional[int] = None
    three_point_percentage_rank: Optional[int] = None
    
    # Free throw stats rankings
    free_throws_made_rank: Optional[int] = None
    free_throws_attempted_rank: Optional[int] = None
    free_throw_percentage_rank: Optional[int] = None
    
    # Rebounding stats rankings
    offensive_rebounds_rank: Optional[int] = None
    defensive_rebounds_rank: Optional[int] = None
    total_rebounds_rank: Optional[int] = None
    
    # Other stats rankings
    assists_rank: Optional[int] = None
    steals_rank: Optional[int] = None
    blocks_rank: Optional[int] = None
    turnovers_rank: Optional[int] = None
    personal_fouls_rank: Optional[int] = None
    points_rank: Optional[int] = None