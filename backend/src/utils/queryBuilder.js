// Query builder utilities for dynamic NBA report generation
const { query } = require('../config/database');

/**
 * Execute a query with logging and error handling
 */
const executeQuery = async (sql, params = []) => {
  try {
    console.log('🔍 Executing query:', sql.substring(0, 100) + '...');
    console.log('📝 Parameters:', params);
    
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
 * Build a dynamic WHERE clause from filters
 */
const buildWhereClause = (filters, measure) => {
  if (!filters || filters.length === 0) {
    return { whereClause: '', params: [] };
  }
  
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  filters.forEach(filter => {
    const { condition, filterParams } = buildSingleCondition(filter, measure, paramIndex);
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
const buildSingleCondition = (filter, measure, paramIndex) => {
  // Column mappings for different measures
  const getColumnName = (filterType, measure) => {
    if (measure === 'Players') {
      const playerColumns = {
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
      return playerColumns[filterType];
    } else {
      const teamColumns = {
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
      return teamColumns[filterType];
    }
  };
  
  const columnName = getColumnName(filter.type, measure);
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
const buildOrderByClause = (sortConfig, measure) => {
  if (!sortConfig || !sortConfig.column) {
    // Default sorting
    if (measure === 'Players') {
      return 'ORDER BY pts DESC';
    } else {
      return 'ORDER BY wins DESC';
    }
  }
  
  // Map display column names to SQL column names
  const getSortColumn = (column, measure) => {
    const commonColumns = {
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
    
    if (measure === 'Players') {
      const playerColumns = {
        ...commonColumns,
        'Name': 'p.name',
        'TEAM': 't.team_code',
        'AGE': 'p.age'
      };
      return playerColumns[column];
    } else {
      const teamColumns = {
        ...commonColumns,
        'Team': 't.team_code',
        'Wins': 'wins',
        'Losses': 'losses',
        'Win %': 'win_pct'
      };
      return teamColumns[column];
    }
  };
  
  const sortColumn = getSortColumn(sortConfig.column, measure);
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
const buildReportQuery = (measure, filters, sortConfig, limit = 100) => {
  // Base SELECT and FROM clauses
  let baseQuery = getBaseQuery(measure);
  
  // Add WHERE clause for filters
  const { whereClause, params } = buildWhereClause(filters, measure);
  baseQuery += ` ${whereClause}`;
  
  // Add GROUP BY clause
  baseQuery += getGroupByClause(measure);
  
  // Add ORDER BY clause
  const orderByClause = buildOrderByClause(sortConfig, measure);
  baseQuery += ` ${orderByClause}`;
  
  // Add LIMIT clause
  baseQuery += ` LIMIT ${limit}`;
  
  return { sql: baseQuery, params };
};

/**
 * Get base query for measure type
 */
const getBaseQuery = (measure) => {
  if (measure === 'Players') {
    return `
      SELECT 
        p.name,
        t.team_code as team,
        p.age,
        COUNT(*) as games_played,
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
};

/**
 * Get GROUP BY clause for measure type
 */
const getGroupByClause = (measure) => {
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
  if (measure === 'Players') {
    return [
      'Team', 'Age', 'Games Played', 'MINS', 'PTS', 'FGM', 'FGA', 'FG%',
      '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB',
      'AST', 'TOV', 'STL', 'BLK', 'PF', '+/-'
    ];
  } else {
    return [
      'Wins', 'Games Played', 'Points', 'FGM', 'FGA', 'FG%', '3PM', 'FTM',
      'FTA', 'FT%', 'OREB', 'DREB', 'REB', 'AST', 'TOV', 'STL', 'BLK', '+/-'
    ];
  }
};

/**
 * Get sample data for testing queries
 */
const getSampleData = async (measure, limit = 5) => {
  const { sql } = buildReportQuery(measure, [], null, limit);
  return await executeQuery(sql);
};

module.exports = {
  executeQuery,
  buildWhereClause,
  buildOrderByClause,
  buildReportQuery,
  validateFilters,
  getAvailableFilterTypes,
  getSampleData
};