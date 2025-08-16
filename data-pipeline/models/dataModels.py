#!/usr/bin/env python3
"""
Data models for NBA statistics
"""

from dataclasses import dataclass
from datetime import date
from typing import Optional

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