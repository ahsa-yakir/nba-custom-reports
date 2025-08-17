/**
 * Enhanced column mappings supporting unified queries with both traditional and advanced stats
 */

const getPlayerColumnMapping = (isAdvanced = false, isUnified = false) => {
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

  if (isUnified) {
    // For unified queries, return both traditional and advanced columns
    return { ...traditionalColumns, ...advancedColumns };
  }

  return isAdvanced ? { ...traditionalColumns, ...advancedColumns } : traditionalColumns;
};

const getTeamColumnMapping = (isAdvanced = false, isUnified = false) => {
  const traditionalColumns = {
    'Points': 'tgs.points',
    'Wins': 'CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END',
    'FGM': 'tgs.field_goals_made',
    'FGA': 'tgs.field_goals_attempted',
    'FG%': 'tgs.field_goal_percentage',
    '3PM': 'tgs.three_pointers_made',
    '3PA': 'tgs.three_pointers_attempted',
    '3P%': 'tgs.three_point_percentage',
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

  if (isUnified) {
    // For unified queries, return both traditional and advanced columns
    return { ...traditionalColumns, ...advancedColumns };
  }

  return isAdvanced ? { ...traditionalColumns, ...advancedColumns } : traditionalColumns;
};

const getColumnName = (filterType, measure, isAdvanced, isUnified = false) => {
  if (measure === 'Players') {
    return getPlayerColumnMapping(isAdvanced, isUnified)[filterType];
  } else {
    return getTeamColumnMapping(isAdvanced, isUnified)[filterType];
  }
};

const getSortColumnMapping = (measure, isAdvanced = false, isUnified = false) => {
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
      'Name': 'p.name',
      'TEAM': 't.team_code',
      'Team': 't.team_code',
      'AGE': 'p.age',
      'Age': 'p.age'
    };

    if (isAdvanced || isUnified) {
      return { ...playerColumns, ...advancedColumns };
    }
    return playerColumns;
  } else {
    const teamColumns = {
      ...commonColumns,
      'Team': 't.team_code',
      'Wins': 'wins',
      'Losses': 'losses',
      'Win %': 'win_pct',
      'Points': 'pts'
    };

    if (isAdvanced || isUnified) {
      return { ...teamColumns, ...advancedColumns };
    }
    return teamColumns;
  }
};

const getUnifiedColumnMapping = (measure) => {
  // Return all available columns for unified queries
  return getSortColumnMapping(measure, false, true);
};

const getCustomViewColumns = (filters, measure) => {
  // Base columns that are always included
  const baseColumns = measure === 'Players' 
    ? ['Name', 'TEAM', 'AGE', 'Games Played']
    : ['Team', 'Games Played'];
  
  // Extract unique filter types as additional columns
  const filterColumns = [...new Set(filters.map(f => f.type))];
  
  // Combine and deduplicate
  const allColumns = [...baseColumns];
  filterColumns.forEach(col => {
    // Map some filter types to their display names
    const columnMapping = {
      'Team': 'TEAM',
      'Age': 'AGE',
      'Points': 'PTS'
    };
    
    const displayColumn = columnMapping[col] || col;
    if (!allColumns.includes(displayColumn)) {
      allColumns.push(displayColumn);
    }
  });
  
  return allColumns;
};

const getTraditionalColumns = (measure) => {
  if (measure === 'Players') {
    return [
      'Name', 'TEAM', 'AGE', 'Games Played', 'MINS', 'PTS', 'FGM', 'FGA', 'FG%', 
      '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB', 
      'AST', 'TOV', 'STL', 'BLK', 'PF', '+/-'
    ];
  } else {
    return [
      'Team', 'Games Played', 'Wins', 'Losses', 'Win %', 'PTS', 'FGM', 'FGA', 'FG%', 
      '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB', 
      'AST', 'TOV', 'STL', 'BLK', '+/-'
    ];
  }
};

const getAdvancedColumns = (measure) => {
  if (measure === 'Players') {
    return [
      'Name', 'TEAM', 'AGE', 'Games Played', 'Offensive Rating', 'Defensive Rating', 
      'Net Rating', 'Usage %', 'True Shooting %', 'Effective FG%', 'Assist %', 
      'Assist Turnover Ratio', 'Assist Ratio', 'Offensive Rebound %', 
      'Defensive Rebound %', 'Rebound %', 'Turnover %', 'PIE', 'Pace'
    ];
  } else {
    return [
      'Team', 'Games Played', 'Offensive Rating', 'Defensive Rating', 'Net Rating', 
      'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio', 
      'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %', 'Turnover %', 
      'PIE', 'Pace'
    ];
  }
};

const isTraditionalColumn = (columnName) => {
  const traditionalTypes = [
    'Team', 'Age', 'Games Played', 'MINS', 'PTS', 'FGM', 'FGA', 'FG%',
    '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB',
    'AST', 'TOV', 'STL', 'BLK', 'PF', '+/-', 'Wins', 'Losses', 'Win %', 'Points'
  ];
  return traditionalTypes.includes(columnName);
};

const isAdvancedColumn = (columnName) => {
  const advancedTypes = [
    'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %',
    'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio',
    'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %',
    'Turnover %', 'PIE', 'Pace'
  ];
  return advancedTypes.includes(columnName);
};

module.exports = {
  getColumnName,
  getPlayerColumnMapping,
  getTeamColumnMapping,
  getSortColumnMapping,
  getUnifiedColumnMapping,
  getCustomViewColumns,
  getTraditionalColumns,
  getAdvancedColumns,
  isTraditionalColumn,
  isAdvancedColumn
};