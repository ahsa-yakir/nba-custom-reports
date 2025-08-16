// Query builder utilities for dynamic NBA report generation
const { query } = require('../config/database');

/**
 * Execute a query with logging and error handling
 */
const executeQuery = async (sql, params = []) => {
  try {
    console.log('🔍 Executing query:', sql.substring(0, 100) + '...');
    console.log('🔍 Parameters:', params);
    
    const start = Date.now();
    const result = await query(sql, params);
    const duration = Date.now() - start;
    
    console.log(`✅ Query completed in ${duration}ms, ${result.rows.length} rows returned`);
    
    return result;
  } catch (error) {
    console.error('❌ Query execution failed:', error);
    throw error;
  }
};

/**
 * Determine if any filters are for advanced stats
 */
const hasAdvancedFilters = (filters) => {
  const advancedFilterTypes = [
    'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %', 'True Shooting %',
    'Effective FG%', 'Assist %', 'Rebound %', 'Turnover %', 'PIE', 'Pace',
    'Assist Turnover Ratio', 'Assist Ratio'
  ];
  
  return filters.some(filter => advancedFilterTypes.includes(filter.type));
};

/**
 * Build a dynamic WHERE clause from filters
 */
const buildWhereClause = (filters, measure, isAdvanced = false) => {
  if (!filters || filters.length === 0) {
    return { whereClause: '', params: [] };
  }
  
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  filters.forEach(filter => {
    const { condition, filterParams } = buildSingleCondition(filter, measure, paramIndex, isAdvanced);
    if (condition) {
      conditions.push(condition);
      params.push(...filterParams);
      paramIndex += filterParams.length;
    }
  });
  
  const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
  
  return { whereClause, params };
};

/**
 * Build a single filter condition
 */
const buildSingleCondition = (filter, measure, paramIndex, isAdvanced = false) => {
  // Column mappings for different measures
  const getColumnName = (filterType, measure, isAdvanced) => {
    if (measure === 'Players') {
      // Traditional player columns
      const playerColumns = {
        'Team': 't.team_code',
        'Age': 'p.age',
        'PTS': isAdvanced ? 'pgs.points' : 'pgs.points',
        'MINS': isAdvanced ? 'pgs.minutes_played' : 'pgs.minutes_played',
        'FGM': isAdvanced ? 'pgs.field_goals_made' : 'pgs.field_goals_made',
        'FGA': isAdvanced ? 'pgs.field_goals_attempted' : 'pgs.field_goals_attempted',
        'FG%': isAdvanced ? 'pgs.field_goal_percentage' : 'pgs.field_goal_percentage',
        '3PM': isAdvanced ? 'pgs.three_pointers_made' : 'pgs.three_pointers_made',
        '3PA': isAdvanced ? 'pgs.three_pointers_attempted' : 'pgs.three_pointers_attempted',
        '3P%': isAdvanced ? 'pgs.three_point_percentage' : 'pgs.three_point_percentage',
        'FTM': isAdvanced ? 'pgs.free_throws_made' : 'pgs.free_throws_made',
        'FTA': isAdvanced ? 'pgs.free_throws_attempted' : 'pgs.free_throws_attempted',
        'FT%': isAdvanced ? 'pgs.free_throw_percentage' : 'pgs.free_throw_percentage',
        'OREB': isAdvanced ? 'pgs.offensive_rebounds' : 'pgs.offensive_rebounds',
        'DREB': isAdvanced ? 'pgs.defensive_rebounds' : 'pgs.defensive_rebounds',
        'REB': isAdvanced ? 'pgs.total_rebounds' : 'pgs.total_rebounds',
        'AST': isAdvanced ? 'pgs.assists' : 'pgs.assists',
        'TOV': isAdvanced ? 'pgs.turnovers' : 'pgs.turnovers',
        'STL': isAdvanced ? 'pgs.steals' : 'pgs.steals',
        'BLK': isAdvanced ? 'pgs.blocks' : 'pgs.blocks',
        'PF': isAdvanced ? 'pgs.personal_fouls' : 'pgs.personal_fouls',
        '+/-': isAdvanced ? 'pgs.plus_minus' : 'pgs.plus_minus'
      };
      
      // Advanced player columns (only available when querying advanced stats)
      if (isAdvanced) {
        const advancedPlayerColumns = {
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
        return advancedPlayerColumns[filterType] || playerColumns[filterType];
      }
      
      return playerColumns[filterType];
    } else {
      // Traditional team columns
      const teamColumns = {
        'Points': isAdvanced ? 'tgs.points' : 'tgs.points',
        'Wins': 'CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END',
        'FGM': isAdvanced ? 'tgs.field_goals_made' : 'tgs.field_goals_made',
        'FGA': isAdvanced ? 'tgs.field_goals_attempted' : 'tgs.field_goals_attempted',
        'FG%': isAdvanced ? 'tgs.field_goal_percentage' : 'tgs.field_goal_percentage',
        '3PM': isAdvanced ? 'tgs.three_pointers_made' : 'tgs.three_pointers_made',
        'FTM': isAdvanced ? 'tgs.free_throws_made' : 'tgs.free_throws_made',
        'FTA': isAdvanced ? 'tgs.free_throws_attempted' : 'tgs.free_throws_attempted',
        'FT%': isAdvanced ? 'tgs.free_throw_percentage' : 'tgs.free_throw_percentage',
        'OREB': isAdvanced ? 'tgs.offensive_rebounds' : 'tgs.offensive_rebounds',
        'DREB': isAdvanced ? 'tgs.defensive_rebounds' : 'tgs.defensive_rebounds',
        'REB': isAdvanced ? 'tgs.total_rebounds' : 'tgs.total_rebounds',
        'AST': isAdvanced ? 'tgs.assists' : 'tgs.assists',
        'TOV': isAdvanced ? 'tgs.turnovers' : 'tgs.turnovers',
        'STL': isAdvanced ? 'tgs.steals' : 'tgs.steals',
        'BLK': isAdvanced ? 'tgs.blocks' : 'tgs.blocks',
        '+/-': isAdvanced ? 'tgs.plus_minus' : 'tgs.plus_minus'
      };
      
      // Advanced team columns (only available when querying advanced stats)
      if (isAdvanced) {
        const advancedTeamColumns = {
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
        return advancedTeamColumns[filterType] || teamColumns[filterType];
      }
      
      return teamColumns[filterType];
    }
  };
  
  const columnName = getColumnName(filter.type, measure, isAdvanced);
  if (!columnName) {
    console.warn(`⚠️ Unknown filter type: ${filter.type} for measure: ${measure}`);
    return { condition: null, filterParams: [] };
  }
  
  // Build condition based on operator
  switch (filter.operator) {
    case 'greater than':
      return {
        condition: `${columnName} > $${paramIndex}`,
        filterParams: [parseFloat(filter.value)]
      };
      
    case 'less than':
      return {
        condition: `${columnName} < $${paramIndex}`,
        filterParams: [parseFloat(filter.value)]
      };
      
    case 'equals':
      return {
        condition: `${columnName} = $${paramIndex}`,
        filterParams: [filter.value]
      };
      
    case 'between':
      return {
        condition: `${columnName} BETWEEN $${paramIndex} AND $${paramIndex + 1}`,
        filterParams: [parseFloat(filter.value), parseFloat(filter.value2)]
      };
      
    case 'in':
      if (!filter.values || filter.values.length === 0) {
        return { condition: null, filterParams: [] };
      }
      const placeholders = filter.values.map((_, i) => `$${paramIndex + i}`).join(', ');
      return {
        condition: `${columnName} IN (${placeholders})`,
        filterParams: filter.values
      };
      
    default:
      console.warn(`⚠️ Unknown operator: ${filter.operator}`);
      return { condition: null, filterParams: [] };
  }
};

/**
 * Build ORDER BY clause from sort configuration
 */
const buildOrderByClause = (sortConfig, measure, isAdvanced = false) => {
  if (!sortConfig || !sortConfig.column) {
    // Default sorting
    if (measure === 'Players') {
      return isAdvanced ? 'ORDER BY offensive_rating DESC' : 'ORDER BY pts DESC';
    } else {
      return isAdvanced ? 'ORDER BY net_rating DESC' : 'ORDER BY wins DESC';
    }
  }
  
  // Map display column names to SQL column names
  const getSortColumn = (column, measure, isAdvanced) => {
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
    
    // Advanced stat columns
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
      return playerColumns[column];
    } else {
      const teamColumns = {
        ...commonColumns,
        ...(isAdvanced ? advancedColumns : {}),
        'Team': 't.team_code',
        'Wins': 'wins',
        'Losses': 'losses',
        'Win %': 'win_pct'
      };
      return teamColumns[column];
    }
  };
  
  const sortColumn = getSortColumn(sortConfig.column, measure, isAdvanced);
  if (!sortColumn) {
    console.warn(`⚠️ Unknown sort column: ${sortConfig.column}`);
    return measure === 'Players' ? 'ORDER BY pts DESC' : 'ORDER BY wins DESC';
  }
  
  const direction = sortConfig.direction === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${sortColumn} ${direction}`;
};

/**
 * Build complete report query
 */
const buildReportQuery = (measure, filters, sortConfig, limit = 100, viewType = 'traditional') => {
  // Determine if we should use advanced stats based on filters or viewType
  const isAdvanced = viewType === 'advanced' || hasAdvancedFilters(filters);
  
  // Base SELECT and FROM clauses
  let baseQuery = getBaseQuery(measure, isAdvanced);
  
  // Add WHERE clause for filters
  const { whereClause, params } = buildWhereClause(filters, measure, isAdvanced);
  baseQuery += ` ${whereClause}`;
  
  // Add GROUP BY clause
  baseQuery += getGroupByClause(measure, isAdvanced);
  
  // Add ORDER BY clause
  const orderByClause = buildOrderByClause(sortConfig, measure, isAdvanced);
  baseQuery += ` ${orderByClause}`;
  
  // Add LIMIT clause
  baseQuery += ` LIMIT ${limit}`;
  
  return { sql: baseQuery, params, isAdvanced };
};

/**
 * Get base query for measure type
 */
const getBaseQuery = (measure, isAdvanced = false) => {
  if (measure === 'Players') {
    if (isAdvanced) {
      return `
        SELECT 
          p.name,
          t.team_code as team,
          p.age,
          COUNT(*) as games_played,
          ROUND(AVG(pas.offensive_rating), 1) as offensive_rating,
          ROUND(AVG(pas.defensive_rating), 1) as defensive_rating,
          ROUND(AVG(pas.net_rating), 1) as net_rating,
          ROUND(AVG(pas.usage_percentage * 100), 1) as usage_percentage,
          ROUND(AVG(pas.true_shooting_percentage * 100), 1) as true_shooting_percentage,
          ROUND(AVG(pas.effective_field_goal_percentage * 100), 1) as effective_field_goal_percentage,
          ROUND(AVG(pas.assist_percentage * 100), 1) as assist_percentage,
          ROUND(AVG(pas.assist_turnover_ratio), 2) as assist_turnover_ratio,
          ROUND(AVG(pas.assist_ratio), 2) as assist_ratio,
          ROUND(AVG(pas.offensive_rebound_percentage * 100), 1) as offensive_rebound_percentage,
          ROUND(AVG(pas.defensive_rebound_percentage * 100), 1) as defensive_rebound_percentage,
          ROUND(AVG(pas.rebound_percentage * 100), 1) as rebound_percentage,
          ROUND(AVG(pas.turnover_percentage * 100), 1) as turnover_percentage,
          ROUND(AVG(pas.pie), 3) as pie,
          ROUND(AVG(pas.pace), 1) as pace
        FROM players p
        JOIN teams t ON p.team_id = t.id
        JOIN player_advanced_stats pas ON p.id = pas.player_id
        JOIN games g ON pas.game_id = g.id
        WHERE 1=1
      `;
    } else {
      return `
        SELECT 
          p.name,
          t.team_code as team,
          p.age,
          COUNT(*) as games_played,
          ROUND(AVG(pgs.minutes_played), 1) as mins,
          ROUND(AVG(pgs.points), 1) as pts,
          ROUND(AVG(pgs.field_goals_made), 1) as fgm,
          ROUND(AVG(pgs.field_goals_attempted), 1) as fga,
          ROUND(AVG(pgs.field_goal_percentage * 100), 1) as fg_pct,
          ROUND(AVG(pgs.three_pointers_made), 1) as tpm,
          ROUND(AVG(pgs.three_pointers_attempted), 1) as tpa,
          ROUND(AVG(pgs.three_point_percentage * 100), 1) as tp_pct,
          ROUND(AVG(pgs.free_throws_made), 1) as ftm,
          ROUND(AVG(pgs.free_throws_attempted), 1) as fta,
          ROUND(AVG(pgs.free_throw_percentage * 100), 1) as ft_pct,
          ROUND(AVG(pgs.offensive_rebounds), 1) as oreb,
          ROUND(AVG(pgs.defensive_rebounds), 1) as dreb,
          ROUND(AVG(pgs.total_rebounds), 1) as reb,
          ROUND(AVG(pgs.assists), 1) as ast,
          ROUND(AVG(pgs.turnovers), 1) as tov,
          ROUND(AVG(pgs.steals), 1) as stl,
          ROUND(AVG(pgs.blocks), 1) as blk,
          ROUND(AVG(pgs.plus_minus), 1) as plus_minus
        FROM players p
        JOIN teams t ON p.team_id = t.id
        JOIN player_game_stats pgs ON p.id = pgs.player_id
        JOIN games g ON pgs.game_id = g.id
        WHERE 1=1
      `;
    }
  } else {
    if (isAdvanced) {
      return `
        SELECT 
          t.team_code as team,
          COUNT(*) as games_played,
          ROUND(AVG(tas.offensive_rating), 1) as offensive_rating,
          ROUND(AVG(tas.defensive_rating), 1) as defensive_rating,
          ROUND(AVG(tas.net_rating), 1) as net_rating,
          ROUND(AVG(tas.true_shooting_percentage * 100), 1) as true_shooting_percentage,
          ROUND(AVG(tas.effective_field_goal_percentage * 100), 1) as effective_field_goal_percentage,
          ROUND(AVG(tas.assist_percentage * 100), 1) as assist_percentage,
          ROUND(AVG(tas.assist_turnover_ratio), 2) as assist_turnover_ratio,
          ROUND(AVG(tas.offensive_rebound_percentage * 100), 1) as offensive_rebound_percentage,
          ROUND(AVG(tas.defensive_rebound_percentage * 100), 1) as defensive_rebound_percentage,
          ROUND(AVG(tas.rebound_percentage * 100), 1) as rebound_percentage,
          ROUND(AVG(tas.turnover_percentage * 100), 1) as turnover_percentage,
          ROUND(AVG(tas.pie), 3) as pie,
          ROUND(AVG(tas.pace), 1) as pace
        FROM teams t
        JOIN team_advanced_stats tas ON t.id = tas.team_id
        JOIN games g ON tas.game_id = g.id
        WHERE 1=1
      `;
    } else {
      return `
        SELECT 
          t.team_code as team,
          COUNT(*) as games_played,
          SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN tgs.win = FALSE THEN 1 ELSE 0 END) as losses,
          ROUND(SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as win_pct,
          ROUND(AVG(tgs.points), 1) as pts,
          ROUND(AVG(tgs.field_goals_made), 1) as fgm,
          ROUND(AVG(tgs.field_goals_attempted), 1) as fga,
          ROUND(AVG(tgs.field_goal_percentage * 100), 1) as fg_pct,
          ROUND(AVG(tgs.three_pointers_made), 1) as tpm,
          ROUND(AVG(tgs.three_pointers_attempted), 1) as tpa,
          ROUND(AVG(tgs.three_point_percentage * 100), 1) as tp_pct,
          ROUND(AVG(tgs.free_throws_made), 1) as ftm,
          ROUND(AVG(tgs.free_throws_attempted), 1) as fta,
          ROUND(AVG(tgs.free_throw_percentage * 100), 1) as ft_pct,
          ROUND(AVG(tgs.offensive_rebounds), 1) as oreb,
          ROUND(AVG(tgs.defensive_rebounds), 1) as dreb,
          ROUND(AVG(tgs.total_rebounds), 1) as reb,
          ROUND(AVG(tgs.assists), 1) as ast,
          ROUND(AVG(tgs.turnovers), 1) as tov,
          ROUND(AVG(tgs.steals), 1) as stl,
          ROUND(AVG(tgs.blocks), 1) as blk,
          ROUND(AVG(tgs.plus_minus), 1) as plus_minus
        FROM teams t
        JOIN team_game_stats tgs ON t.id = tgs.team_id
        JOIN games g ON tgs.game_id = g.id
        WHERE 1=1
      `;
    }
  }
};

/**
 * Get GROUP BY clause for measure type
 */
const getGroupByClause = (measure, isAdvanced = false) => {
  if (measure === 'Players') {
    return ` GROUP BY p.id, p.name, t.team_code, p.age`;
  } else {
    return ` GROUP BY t.id, t.team_code`;
  }
};

/**
 * Validate filter configuration
 */
const validateFilters = (filters, measure) => {
  const errors = [];
  
  if (!Array.isArray(filters)) {
    errors.push('Filters must be an array');
    return errors;
  }
  
  filters.forEach((filter, index) => {
    if (!filter.type) {
      errors.push(`Filter ${index + 1}: missing type`);
    }
    
    if (!filter.operator) {
      errors.push(`Filter ${index + 1}: missing operator`);
    }
    
    if (filter.operator === 'between' && (!filter.value || !filter.value2)) {
      errors.push(`Filter ${index + 1}: 'between' operator requires both value and value2`);
    }
    
    if (filter.operator === 'in' && (!filter.values || filter.values.length === 0)) {
      errors.push(`Filter ${index + 1}: 'in' operator requires values array`);
    }
    
    if (['greater than', 'less than', 'equals'].includes(filter.operator) && !filter.value) {
      errors.push(`Filter ${index + 1}: '${filter.operator}' operator requires value`);
    }
  });
  
  return errors;
};

/**
 * Get available filter types for a measure
 */
const getAvailableFilterTypes = (measure) => {
  const traditionalPlayerFilters = [
    'Team', 'Age', 'Games Played', 'MINS', 'PTS', 'FGM', 'FGA', 'FG%',
    '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB',
    'AST', 'TOV', 'STL', 'BLK', 'PF', '+/-'
  ];
  
  const advancedPlayerFilters = [
    'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %',
    'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio',
    'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %',
    'Turnover %', 'PIE', 'Pace'
  ];
  
  const traditionalTeamFilters = [
    'Wins', 'Games Played', 'Points', 'FGM', 'FGA', 'FG%', '3PM', 'FTM',
    'FTA', 'FT%', 'OREB', 'DREB', 'REB', 'AST', 'TOV', 'STL', 'BLK', '+/-'
  ];
  
  const advancedTeamFilters = [
    'Offensive Rating', 'Defensive Rating', 'Net Rating', 'True Shooting %',
    'Effective FG%', 'Assist %', 'Assist Turnover Ratio', 'Offensive Rebound %',
    'Defensive Rebound %', 'Rebound %', 'Turnover %', 'PIE', 'Pace'
  ];
  
  if (measure === 'Players') {
    return {
      traditional: traditionalPlayerFilters,
      advanced: advancedPlayerFilters,
      all: [...traditionalPlayerFilters, ...advancedPlayerFilters]
    };
  } else {
    return {
      traditional: traditionalTeamFilters,
      advanced: advancedTeamFilters,
      all: [...traditionalTeamFilters, ...advancedTeamFilters]
    };
  }
};

/**
 * Get sample data for testing queries
 */
const getSampleData = async (measure, limit = 5, isAdvanced = false) => {
  const { sql } = buildReportQuery(measure, [], null, limit, isAdvanced ? 'advanced' : 'traditional');
  return await executeQuery(sql);
};

module.exports = {
  executeQuery,
  buildWhereClause,
  buildOrderByClause,
  buildReportQuery,
  validateFilters,
  getAvailableFilterTypes,
  getSampleData,
  hasAdvancedFilters
};