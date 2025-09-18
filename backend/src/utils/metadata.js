/**
 * Consolidated column metadata - replaces scattered mapping functions
 * Maintains compatibility with existing unified query system
 */

// Player column definitions
const PLAYER_COLUMNS = {
  // Identity columns
  'Name': {
    where: null, // Name is not filterable
    sort: 'p.name',
    select: 'p.name',
    type: 'string',
    category: 'identity'
  },
  'Team': {
    where: 't.team_code',
    sort: 't.team_code', 
    select: 't.team_code',
    type: 'string',
    category: 'identity'
  },
  'TEAM': { // Alias for Team
    where: 't.team_code',
    sort: 't.team_code',
    select: 't.team_code', 
    type: 'string',
    category: 'identity'
  },
  'Age': {
    where: 'p.age',
    sort: 'p.age',
    select: 'p.age',
    type: 'numeric',
    category: 'identity'
  },
  'AGE': { // Alias for Age
    where: 'p.age', 
    sort: 'p.age',
    select: 'p.age',
    type: 'numeric',
    category: 'identity'
  },
  'Games Played': {
    where: null, // Computed field, not directly filterable
    sort: 'games_played',
    select: 'COUNT(DISTINCT pgs.game_id) as games_played',
    type: 'numeric',
    category: 'identity'
  },

  // Traditional stats
  'MINS': {
    where: 'pgs.minutes_played',
    sort: 'mins',
    select: 'ROUND(AVG(pgs.minutes_played), 1) as mins',
    type: 'numeric',
    category: 'traditional'
  },
  'PTS': {
    where: 'pgs.points',
    sort: 'pts', 
    select: 'ROUND(AVG(pgs.points), 1) as pts',
    type: 'numeric',
    category: 'traditional'
  },
  'FGM': {
    where: 'pgs.field_goals_made',
    sort: 'fgm',
    select: 'ROUND(AVG(pgs.field_goals_made), 1) as fgm',
    type: 'numeric',
    category: 'traditional'
  },
  'FGA': {
    where: 'pgs.field_goals_attempted',
    sort: 'fga',
    select: 'ROUND(AVG(pgs.field_goals_attempted), 1) as fga', 
    type: 'numeric',
    category: 'traditional'
  },
  'FG%': {
    where: 'pgs.field_goal_percentage',
    sort: 'fg_pct',
    select: 'ROUND(AVG(pgs.field_goal_percentage * 100), 1) as fg_pct',
    type: 'percentage',
    category: 'traditional'
  },
  '3PM': {
    where: 'pgs.three_pointers_made',
    sort: 'tpm',
    select: 'ROUND(AVG(pgs.three_pointers_made), 1) as tpm',
    type: 'numeric', 
    category: 'traditional'
  },
  '3PA': {
    where: 'pgs.three_pointers_attempted',
    sort: 'tpa',
    select: 'ROUND(AVG(pgs.three_pointers_attempted), 1) as tpa',
    type: 'numeric',
    category: 'traditional'
  },
  '3P%': {
    where: 'pgs.three_point_percentage',
    sort: 'tp_pct', 
    select: 'ROUND(AVG(pgs.three_point_percentage * 100), 1) as tp_pct',
    type: 'percentage',
    category: 'traditional'
  },
  'FTM': {
    where: 'pgs.free_throws_made',
    sort: 'ftm',
    select: 'ROUND(AVG(pgs.free_throws_made), 1) as ftm',
    type: 'numeric',
    category: 'traditional'
  },
  'FTA': {
    where: 'pgs.free_throws_attempted', 
    sort: 'fta',
    select: 'ROUND(AVG(pgs.free_throws_attempted), 1) as fta',
    type: 'numeric',
    category: 'traditional'
  },
  'FT%': {
    where: 'pgs.free_throw_percentage',
    sort: 'ft_pct',
    select: 'ROUND(AVG(pgs.free_throw_percentage * 100), 1) as ft_pct', 
    type: 'percentage',
    category: 'traditional'
  },
  'OREB': {
    where: 'pgs.offensive_rebounds',
    sort: 'oreb',
    select: 'ROUND(AVG(pgs.offensive_rebounds), 1) as oreb',
    type: 'numeric',
    category: 'traditional'
  },
  'DREB': {
    where: 'pgs.defensive_rebounds',
    sort: 'dreb', 
    select: 'ROUND(AVG(pgs.defensive_rebounds), 1) as dreb',
    type: 'numeric',
    category: 'traditional'
  },
  'REB': {
    where: 'pgs.total_rebounds',
    sort: 'reb',
    select: 'ROUND(AVG(pgs.total_rebounds), 1) as reb',
    type: 'numeric',
    category: 'traditional'
  },
  'AST': {
    where: 'pgs.assists',
    sort: 'ast',
    select: 'ROUND(AVG(pgs.assists), 1) as ast',
    type: 'numeric', 
    category: 'traditional'
  },
  'TOV': {
    where: 'pgs.turnovers',
    sort: 'tov',
    select: 'ROUND(AVG(pgs.turnovers), 1) as tov',
    type: 'numeric',
    category: 'traditional'
  },
  'STL': {
    where: 'pgs.steals',
    sort: 'stl',
    select: 'ROUND(AVG(pgs.steals), 1) as stl',
    type: 'numeric',
    category: 'traditional'
  },
  'BLK': {
    where: 'pgs.blocks',
    sort: 'blk',
    select: 'ROUND(AVG(pgs.blocks), 1) as blk', 
    type: 'numeric',
    category: 'traditional'
  },
  'PF': {
    where: 'pgs.personal_fouls',
    sort: 'pf',
    select: 'ROUND(AVG(pgs.personal_fouls), 1) as pf',
    type: 'numeric',
    category: 'traditional'
  },
  '+/-': {
    where: 'pgs.plus_minus',
    sort: 'plus_minus',
    select: 'ROUND(AVG(pgs.plus_minus), 1) as plus_minus',
    type: 'numeric',
    category: 'traditional'
  },

  // Advanced stats
  'Offensive Rating': {
    where: 'pas.offensive_rating',
    sort: 'offensive_rating',
    select: 'ROUND(AVG(pas.offensive_rating), 1) as offensive_rating',
    type: 'numeric',
    category: 'advanced'
  },
  'Defensive Rating': {
    where: 'pas.defensive_rating', 
    sort: 'defensive_rating',
    select: 'ROUND(AVG(pas.defensive_rating), 1) as defensive_rating',
    type: 'numeric',
    category: 'advanced'
  },
  'Net Rating': {
    where: 'pas.net_rating',
    sort: 'net_rating',
    select: 'ROUND(AVG(pas.net_rating), 1) as net_rating',
    type: 'numeric',
    category: 'advanced'
  },
  'Usage %': {
    where: 'pas.usage_percentage',
    sort: 'usage_percentage',
    select: 'ROUND(AVG(pas.usage_percentage * 100), 1) as usage_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'True Shooting %': {
    where: 'pas.true_shooting_percentage',
    sort: 'true_shooting_percentage',
    select: 'ROUND(AVG(pas.true_shooting_percentage * 100), 1) as true_shooting_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'Effective FG%': {
    where: 'pas.effective_field_goal_percentage',
    sort: 'effective_field_goal_percentage', 
    select: 'ROUND(AVG(pas.effective_field_goal_percentage * 100), 1) as effective_field_goal_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'Assist %': {
    where: 'pas.assist_percentage',
    sort: 'assist_percentage',
    select: 'ROUND(AVG(pas.assist_percentage * 100), 1) as assist_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'Assist Turnover Ratio': {
    where: 'pas.assist_turnover_ratio',
    sort: 'assist_turnover_ratio',
    select: 'ROUND(AVG(pas.assist_turnover_ratio), 2) as assist_turnover_ratio',
    type: 'numeric',
    category: 'advanced'
  },
  'Assist Ratio': {
    where: 'pas.assist_ratio',
    sort: 'assist_ratio',
    select: 'ROUND(AVG(pas.assist_ratio), 2) as assist_ratio',
    type: 'numeric',
    category: 'advanced'
  },
  'Offensive Rebound %': {
    where: 'pas.offensive_rebound_percentage',
    sort: 'offensive_rebound_percentage',
    select: 'ROUND(AVG(pas.offensive_rebound_percentage * 100), 1) as offensive_rebound_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'Defensive Rebound %': {
    where: 'pas.defensive_rebound_percentage',
    sort: 'defensive_rebound_percentage',
    select: 'ROUND(AVG(pas.defensive_rebound_percentage * 100), 1) as defensive_rebound_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'Rebound %': {
    where: 'pas.rebound_percentage',
    sort: 'rebound_percentage',
    select: 'ROUND(AVG(pas.rebound_percentage * 100), 1) as rebound_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'Turnover %': {
    where: 'pas.turnover_percentage',
    sort: 'turnover_percentage',
    select: 'ROUND(AVG(pas.turnover_percentage * 100), 1) as turnover_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'PIE': {
    where: 'pas.pie',
    sort: 'pie',
    select: 'ROUND(AVG(pas.pie), 3) as pie',
    type: 'numeric',
    category: 'advanced'
  },
  'Pace': {
    where: 'pas.pace',
    sort: 'pace',
    select: 'ROUND(AVG(pas.pace), 1) as pace',
    type: 'numeric',
    category: 'advanced'
  }
};

// Team column definitions
const TEAM_COLUMNS = {
  // Identity columns
  'Team': {
    where: 't.team_code',
    sort: 't.team_code',
    select: 't.team_code as team',
    type: 'string',
    category: 'identity'
  },
  'Games Played': {
    where: null, // Computed field
    sort: 'games_played',
    select: 'COUNT(DISTINCT tgs.game_id) as games_played',
    type: 'numeric',
    category: 'identity'
  },

  // Traditional stats
  'Points': {
    where: 'tgs.points',
    sort: 'pts',
    select: 'ROUND(AVG(tgs.points), 1) as pts',
    type: 'numeric',
    category: 'traditional'
  },
  'Wins': {
    where: 'CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END',
    sort: 'wins',
    select: 'SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) as wins',
    type: 'numeric',
    category: 'traditional'
  },
  'Losses': {
    where: 'CASE WHEN tgs.win = FALSE THEN 1 ELSE 0 END', 
    sort: 'losses',
    select: 'SUM(CASE WHEN tgs.win = FALSE THEN 1 ELSE 0 END) as losses',
    type: 'numeric',
    category: 'traditional'
  },
  'Win %': {
    where: null, // Computed field
    sort: 'win_pct',
    select: 'ROUND(SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as win_pct',
    type: 'percentage',
    category: 'traditional'
  },
  'FGM': {
    where: 'tgs.field_goals_made',
    sort: 'fgm',
    select: 'ROUND(AVG(tgs.field_goals_made), 1) as fgm',
    type: 'numeric',
    category: 'traditional'
  },
  'FGA': {
    where: 'tgs.field_goals_attempted',
    sort: 'fga',
    select: 'ROUND(AVG(tgs.field_goals_attempted), 1) as fga',
    type: 'numeric',
    category: 'traditional'
  },
  'FG%': {
    where: 'tgs.field_goal_percentage',
    sort: 'fg_pct',
    select: 'ROUND(AVG(tgs.field_goal_percentage * 100), 1) as fg_pct',
    type: 'percentage',
    category: 'traditional'
  },
  '3PM': {
    where: 'tgs.three_pointers_made',
    sort: 'tpm',
    select: 'ROUND(AVG(tgs.three_pointers_made), 1) as tpm',
    type: 'numeric',
    category: 'traditional'
  },
  '3PA': {
    where: 'tgs.three_pointers_attempted',
    sort: 'tpa',
    select: 'ROUND(AVG(tgs.three_pointers_attempted), 1) as tpa',
    type: 'numeric',
    category: 'traditional'
  },
  '3P%': {
    where: 'tgs.three_point_percentage',
    sort: 'tp_pct',
    select: 'ROUND(AVG(tgs.three_point_percentage * 100), 1) as tp_pct',
    type: 'percentage',
    category: 'traditional'
  },
  'FTM': {
    where: 'tgs.free_throws_made',
    sort: 'ftm',
    select: 'ROUND(AVG(tgs.free_throws_made), 1) as ftm',
    type: 'numeric',
    category: 'traditional'
  },
  'FTA': {
    where: 'tgs.free_throws_attempted',
    sort: 'fta',
    select: 'ROUND(AVG(tgs.free_throws_attempted), 1) as fta',
    type: 'numeric',
    category: 'traditional'
  },
  'FT%': {
    where: 'tgs.free_throw_percentage',
    sort: 'ft_pct',
    select: 'ROUND(AVG(tgs.free_throw_percentage * 100), 1) as ft_pct',
    type: 'percentage',
    category: 'traditional'
  },
  'OREB': {
    where: 'tgs.offensive_rebounds',
    sort: 'oreb',
    select: 'ROUND(AVG(tgs.offensive_rebounds), 1) as oreb',
    type: 'numeric',
    category: 'traditional'
  },
  'DREB': {
    where: 'tgs.defensive_rebounds',
    sort: 'dreb',
    select: 'ROUND(AVG(tgs.defensive_rebounds), 1) as dreb',
    type: 'numeric',
    category: 'traditional'
  },
  'REB': {
    where: 'tgs.total_rebounds',
    sort: 'reb',
    select: 'ROUND(AVG(tgs.total_rebounds), 1) as reb',
    type: 'numeric',
    category: 'traditional'
  },
  'AST': {
    where: 'tgs.assists',
    sort: 'ast',
    select: 'ROUND(AVG(tgs.assists), 1) as ast',
    type: 'numeric',
    category: 'traditional'
  },
  'TOV': {
    where: 'tgs.turnovers',
    sort: 'tov',
    select: 'ROUND(AVG(tgs.turnovers), 1) as tov',
    type: 'numeric',
    category: 'traditional'
  },
  'STL': {
    where: 'tgs.steals',
    sort: 'stl',
    select: 'ROUND(AVG(tgs.steals), 1) as stl',
    type: 'numeric',
    category: 'traditional'
  },
  'BLK': {
    where: 'tgs.blocks',
    sort: 'blk',
    select: 'ROUND(AVG(tgs.blocks), 1) as blk',
    type: 'numeric',
    category: 'traditional'
  },
  '+/-': {
    where: 'tgs.plus_minus',
    sort: 'plus_minus',
    select: 'ROUND(AVG(tgs.plus_minus), 1) as plus_minus',
    type: 'numeric',
    category: 'traditional'
  },

  // Advanced stats
  'Offensive Rating': {
    where: 'tas.offensive_rating',
    sort: 'offensive_rating',
    select: 'ROUND(AVG(tas.offensive_rating), 1) as offensive_rating',
    type: 'numeric',
    category: 'advanced'
  },
  'Defensive Rating': {
    where: 'tas.defensive_rating',
    sort: 'defensive_rating',
    select: 'ROUND(AVG(tas.defensive_rating), 1) as defensive_rating',
    type: 'numeric',
    category: 'advanced'
  },
  'Net Rating': {
    where: 'tas.net_rating',
    sort: 'net_rating',
    select: 'ROUND(AVG(tas.net_rating), 1) as net_rating',
    type: 'numeric',
    category: 'advanced'
  },
  'True Shooting %': {
    where: 'tas.true_shooting_percentage',
    sort: 'true_shooting_percentage',
    select: 'ROUND(AVG(tas.true_shooting_percentage * 100), 1) as true_shooting_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'Effective FG%': {
    where: 'tas.effective_field_goal_percentage',
    sort: 'effective_field_goal_percentage',
    select: 'ROUND(AVG(tas.effective_field_goal_percentage * 100), 1) as effective_field_goal_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'Assist %': {
    where: 'tas.assist_percentage',
    sort: 'assist_percentage',
    select: 'ROUND(AVG(tas.assist_percentage * 100), 1) as assist_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'Assist Turnover Ratio': {
    where: 'tas.assist_turnover_ratio',
    sort: 'assist_turnover_ratio',
    select: 'ROUND(AVG(tas.assist_turnover_ratio), 2) as assist_turnover_ratio',
    type: 'numeric',
    category: 'advanced'
  },
  'Offensive Rebound %': {
    where: 'tas.offensive_rebound_percentage',
    sort: 'offensive_rebound_percentage',
    select: 'ROUND(AVG(tas.offensive_rebound_percentage * 100), 1) as offensive_rebound_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'Defensive Rebound %': {
    where: 'tas.defensive_rebound_percentage',
    sort: 'defensive_rebound_percentage',
    select: 'ROUND(AVG(tas.defensive_rebound_percentage * 100), 1) as defensive_rebound_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'Rebound %': {
    where: 'tas.rebound_percentage',
    sort: 'rebound_percentage',
    select: 'ROUND(AVG(tas.rebound_percentage * 100), 1) as rebound_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'Turnover %': {
    where: 'tas.turnover_percentage',
    sort: 'turnover_percentage',
    select: 'ROUND(AVG(tas.turnover_percentage * 100), 1) as turnover_percentage',
    type: 'percentage',
    category: 'advanced'
  },
  'PIE': {
    where: 'tas.pie',
    sort: 'pie',
    select: 'ROUND(AVG(tas.pie), 3) as pie',
    type: 'numeric',
    category: 'advanced'
  },
  'Pace': {
    where: 'tas.pace',
    sort: 'pace',
    select: 'ROUND(AVG(tas.pace), 1) as pace',
    type: 'numeric',
    category: 'advanced'
  }
};

// Backwards compatibility functions that match your original API
const getPlayerColumnMapping = (isAdvanced = false, isUnified = false) => {
  const traditionalColumns = {};
  const advancedColumns = {};
  
  Object.keys(PLAYER_COLUMNS).forEach(key => {
    const col = PLAYER_COLUMNS[key];
    if (col.where) { // Only include filterable columns
      if (col.category === 'traditional' || col.category === 'identity') {
        traditionalColumns[key] = col.where;
      }
      if (col.category === 'advanced') {
        advancedColumns[key] = col.where;
      }
    }
  });
  
  if (isUnified) {
    return { ...traditionalColumns, ...advancedColumns };
  }
  
  return isAdvanced ? { ...traditionalColumns, ...advancedColumns } : traditionalColumns;
};

const getTeamColumnMapping = (isAdvanced = false, isUnified = false) => {
  const traditionalColumns = {};
  const advancedColumns = {};
  
  Object.keys(TEAM_COLUMNS).forEach(key => {
    const col = TEAM_COLUMNS[key];
    if (col.where) { // Only include filterable columns
      if (col.category === 'traditional' || col.category === 'identity') {
        traditionalColumns[key] = col.where;
      }
      if (col.category === 'advanced') {
        advancedColumns[key] = col.where;
      }
    }
  });
  
  if (isUnified) {
    return { ...traditionalColumns, ...advancedColumns };
  }
  
  return isAdvanced ? { ...traditionalColumns, ...advancedColumns } : traditionalColumns;
};

const getColumnName = (filterType, measure, isAdvanced, isUnified = false) => {
  const columns = measure === 'Players' ? PLAYER_COLUMNS : TEAM_COLUMNS;
  return columns[filterType]?.where || null;
};

const getSortColumnMapping = (measure, isAdvanced = false, isUnified = false) => {
  const columns = measure === 'Players' ? PLAYER_COLUMNS : TEAM_COLUMNS;
  const result = {};
  
  Object.keys(columns).forEach(key => {
    const col = columns[key];
    const includeColumn = isUnified || 
      (col.category === 'identity') ||
      (col.category === 'traditional') ||
      (isAdvanced && col.category === 'advanced');
    
    if (includeColumn && col.sort) {
      result[key] = col.sort;
    }
  });
  
  return result;
};

// Helper functions
const isTraditionalColumn = (columnName) => {
  if (!columnName) return false; // Handle null/undefined/empty string
  
  const playerCol = PLAYER_COLUMNS[columnName];
  const teamCol = TEAM_COLUMNS[columnName];
  
  return (playerCol && ['traditional', 'identity'].includes(playerCol.category)) ||
         (teamCol && ['traditional', 'identity'].includes(teamCol.category)) ||
         false; // Explicit false return
};

const isAdvancedColumn = (columnName) => {
  if (!columnName) return false; // Handle null/undefined/empty string
  
  const playerCol = PLAYER_COLUMNS[columnName];
  const teamCol = TEAM_COLUMNS[columnName];
  
  return (playerCol && playerCol.category === 'advanced') ||
         (teamCol && teamCol.category === 'advanced') ||
         false; // Explicit false return
};

const getColumnsByCategory = (measure, categories) => {
  // Validate inputs
  if (!measure || !['Players', 'Teams'].includes(measure) || !Array.isArray(categories)) {
    return []; // Return empty array for invalid inputs
  }
  
  const columns = measure === 'Players' ? PLAYER_COLUMNS : TEAM_COLUMNS;
  const result = [];
  
  Object.keys(columns).forEach(key => {
    if (categories.includes(columns[key].category)) {
      result.push(key);
    }
  });
  
  return result;
};

// Export everything to maintain compatibility
module.exports = {
  PLAYER_COLUMNS,
  TEAM_COLUMNS,
  
  // Backwards compatibility exports
  getColumnName,
  getPlayerColumnMapping,
  getTeamColumnMapping,
  getSortColumnMapping,
  isTraditionalColumn,
  isAdvancedColumn,
  
  // New helper functions
  getColumnsByCategory
};