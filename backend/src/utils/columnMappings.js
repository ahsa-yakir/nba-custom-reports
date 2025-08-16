/**
 * Maps frontend column names to database column names
 */

const getPlayerColumnMapping = (isAdvanced = false) => {
  const traditionalColumns = {
    'Team': 't.team_code',
    'Age': 'p.age',
    'PTS': 'pgs.points',
    'MINS': 'pgs.minutes_played',
    'FGM': 'pgs.field_goals_made',
    'FGA': 'pgs.field_goals_attempted',
    'FG%': 'pgs.field_goal_percentage',
    '3PM': 'pgs.three_pointers_made',
    '3PA': 'pgs.three_pointers_attempted',
    '3P%': 'pgs.three_point_percentage',
    'FTM': 'pgs.free_throws_made',
    'FTA': 'pgs.free_throws_attempted',
    'FT%': 'pgs.free_throw_percentage',
    'OREB': 'pgs.offensive_rebounds',
    'DREB': 'pgs.defensive_rebounds',
    'REB': 'pgs.total_rebounds',
    'AST': 'pgs.assists',
    'TOV': 'pgs.turnovers',
    'STL': 'pgs.steals',
    'BLK': 'pgs.blocks',
    'PF': 'pgs.personal_fouls',
    '+/-': 'pgs.plus_minus'
  };

  const advancedColumns = {
    'Offensive Rating': 'pas.offensive_rating',
    'Defensive Rating': 'pas.defensive_rating',
    'Net Rating': 'pas.net_rating',
    'Usage %': 'pas.usage_percentage',
    'True Shooting %': 'pas.true_shooting_percentage',
    'Effective FG%': 'pas.effective_field_goal_percentage',
    'Assist %': 'pas.assist_percentage',
    'Assist Turnover Ratio': 'pas.assist_turnover_ratio',
    'Assist Ratio': 'pas.assist_ratio',
    'Offensive Rebound %': 'pas.offensive_rebound_percentage',
    'Defensive Rebound %': 'pas.defensive_rebound_percentage',
    'Rebound %': 'pas.rebound_percentage',
    'Turnover %': 'pas.turnover_percentage',
    'PIE': 'pas.pie',
    'Pace': 'pas.pace'
  };

  return isAdvanced ? { ...traditionalColumns, ...advancedColumns } : traditionalColumns;
};

const getTeamColumnMapping = (isAdvanced = false) => {
  const traditionalColumns = {
    'Points': 'tgs.points',
    'Wins': 'CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END',
    'FGM': 'tgs.field_goals_made',
    'FGA': 'tgs.field_goals_attempted',
    'FG%': 'tgs.field_goal_percentage',
    '3PM': 'tgs.three_pointers_made',
    'FTM': 'tgs.free_throws_made',
    'FTA': 'tgs.free_throws_attempted',
    'FT%': 'tgs.free_throw_percentage',
    'OREB': 'tgs.offensive_rebounds',
    'DREB': 'tgs.defensive_rebounds',
    'REB': 'tgs.total_rebounds',
    'AST': 'tgs.assists',
    'TOV': 'tgs.turnovers',
    'STL': 'tgs.steals',
    'BLK': 'tgs.blocks',
    '+/-': 'tgs.plus_minus'
  };

  const advancedColumns = {
    'Offensive Rating': 'tas.offensive_rating',
    'Defensive Rating': 'tas.defensive_rating',
    'Net Rating': 'tas.net_rating',
    'True Shooting %': 'tas.true_shooting_percentage',
    'Effective FG%': 'tas.effective_field_goal_percentage',
    'Assist %': 'tas.assist_percentage',
    'Assist Turnover Ratio': 'tas.assist_turnover_ratio',
    'Offensive Rebound %': 'tas.offensive_rebound_percentage',
    'Defensive Rebound %': 'tas.defensive_rebound_percentage',
    'Rebound %': 'tas.rebound_percentage',
    'Turnover %': 'tas.turnover_percentage',
    'PIE': 'tas.pie',
    'Pace': 'tas.pace'
  };

  return isAdvanced ? { ...traditionalColumns, ...advancedColumns } : traditionalColumns;
};

const getColumnName = (filterType, measure, isAdvanced) => {
  if (measure === 'Players') {
    return getPlayerColumnMapping(isAdvanced)[filterType];
  } else {
    return getTeamColumnMapping(isAdvanced)[filterType];
  }
};

const getSortColumnMapping = (measure, isAdvanced = false) => {
  const commonColumns = {
    'MINS': 'mins',
    'PTS': 'pts',
    'FGM': 'fgm',
    'FGA': 'fga',
    'FG%': 'fg_pct',
    '3PM': 'tpm',
    '3PA': 'tpa',
    '3P%': 'tp_pct',
    'FTM': 'ftm',
    'FTA': 'fta',
    'FT%': 'ft_pct',
    'OREB': 'oreb',
    'DREB': 'dreb',
    'REB': 'reb',
    'AST': 'ast',
    'TOV': 'tov',
    'STL': 'stl',
    'BLK': 'blk',
    '+/-': 'plus_minus',
    'Games Played': 'games_played'
  };

  const advancedColumns = {
    'Offensive Rating': 'offensive_rating',
    'Defensive Rating': 'defensive_rating',
    'Net Rating': 'net_rating',
    'Usage %': 'usage_percentage',
    'True Shooting %': 'true_shooting_percentage',
    'Effective FG%': 'effective_field_goal_percentage',
    'Assist %': 'assist_percentage',
    'Assist Turnover Ratio': 'assist_turnover_ratio',
    'Assist Ratio': 'assist_ratio',
    'Offensive Rebound %': 'offensive_rebound_percentage',
    'Defensive Rebound %': 'defensive_rebound_percentage',
    'Rebound %': 'rebound_percentage',
    'Turnover %': 'turnover_percentage',
    'PIE': 'pie',
    'Pace': 'pace'
  };

  if (measure === 'Players') {
    const playerColumns = {
      ...commonColumns,
      ...(isAdvanced ? advancedColumns : {}),
      'Name': 'p.name',
      'TEAM': 't.team_code',
      'AGE': 'p.age'
    };
    return playerColumns;
  } else {
    const teamColumns = {
      ...commonColumns,
      ...(isAdvanced ? advancedColumns : {}),
      'Team': 't.team_code',
      'Wins': 'wins',
      'Losses': 'losses',
      'Win %': 'win_pct'
    };
    return teamColumns;
  }
};

module.exports = {
  getColumnName,
  getPlayerColumnMapping,
  getTeamColumnMapping,
  getSortColumnMapping
};