/**
 * Unified query builder for fetching both traditional and advanced stats
 */
const { buildWhereClause } = require('./whereClauseBuilder');
const { buildOrderByClause, normalizeSortConfig } = require('./sortingUtils');
const { hasAdvancedFilters, validateFilters } = require('./filterValidation');

// Test if database module loads properly
let query;
try {
  const db = require('../config/database');
  query = db.query;
  console.log('✅ Database connection loaded in unifiedQueryBuilder');
} catch (error) {
  console.error('❌ Database connection failed in unifiedQueryBuilder:', error.message);
  query = async () => {
    throw new Error('Database not connected');
  };
}

const executeQuery = async (sql, params = []) => {
  try {
    console.log('🔍 Executing unified query:', sql.substring(0, 150) + '...');
    console.log('🎯 Parameters:', params);
    
    const start = Date.now();
    const result = await query(sql, params);
    const duration = Date.now() - start;
    
    console.log(`✅ Unified query completed in ${duration}ms, ${result.rows.length} rows returned`);
    
    return result;
  } catch (error) {
    console.error('❌ Unified query execution failed:', error);
    throw error;
  }
};

const getPlayerUnifiedQuery = () => {
  return `
    SELECT 
      p.name,
      t.team_code as team,
      p.age,
      COUNT(DISTINCT pgs.game_id) as games_played,
      
      -- Traditional stats (averaged)
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
      ROUND(AVG(pgs.personal_fouls), 1) as pf,
      ROUND(AVG(pgs.plus_minus), 1) as plus_minus,
      
      -- Advanced stats (averaged, may be NULL if not available)
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
      ROUND(AVG(pas.pace), 1) as pace,
      
      -- Metadata
      COUNT(DISTINCT CASE WHEN pas.game_id IS NOT NULL THEN pas.game_id END) as advanced_games_available
      
    FROM players p
    JOIN teams t ON p.team_id = t.id
    JOIN player_game_stats pgs ON p.id = pgs.player_id
    JOIN games g ON pgs.game_id = g.id
    LEFT JOIN player_advanced_stats pas ON p.id = pas.player_id AND pgs.game_id = pas.game_id
    WHERE 1=1
  `;
};

const getTeamUnifiedQuery = () => {
  return `
    SELECT 
      t.team_code as team,
      COUNT(DISTINCT tgs.game_id) as games_played,
      
      -- Traditional stats
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
      ROUND(AVG(tgs.plus_minus), 1) as plus_minus,
      
      -- Advanced stats (may be NULL if not available)
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
      ROUND(AVG(tas.pace), 1) as pace,
      
      -- Metadata
      COUNT(DISTINCT CASE WHEN tas.game_id IS NOT NULL THEN tas.game_id END) as advanced_games_available
      
    FROM teams t
    JOIN team_game_stats tgs ON t.id = tgs.team_id
    JOIN games g ON tgs.game_id = g.id
    LEFT JOIN team_advanced_stats tas ON t.id = tas.team_id AND tgs.game_id = tas.game_id
    WHERE 1=1
  `;
};

const getUnifiedGroupByClause = (measure) => {
  if (measure === 'Players') {
    return ` GROUP BY p.id, p.name, t.team_code, p.age`;
  } else {
    return ` GROUP BY t.id, t.team_code`;
  }
};

const buildUnifiedQuery = (measure, filters, sortConfig, limit = 100) => {
  // Validate inputs
  if (!measure || !['Players', 'Teams'].includes(measure)) {
    throw new Error('Invalid measure. Must be "Players" or "Teams"');
  }
  
  if (!Array.isArray(filters)) {
    throw new Error('Filters must be an array');
  }
  
  console.log(`🔧 Building unified ${measure} query`);
  console.log(`📊 Filters: ${filters.length}, Limit: ${limit}`);
  
  // Get base unified query
  let baseQuery = measure === 'Players' ? getPlayerUnifiedQuery() : getTeamUnifiedQuery();
  
  // Add WHERE clause for filters using the simplified approach
  const { whereClause, params } = buildWhereClause(filters, measure, false);
  baseQuery += ` ${whereClause}`;
  
  // Add GROUP BY clause
  baseQuery += getUnifiedGroupByClause(measure);
  
  // Normalize and add ORDER BY clause
  const normalizedSort = normalizeSortConfig(sortConfig, measure, true);
  const orderByClause = buildOrderByClause(normalizedSort, measure, true);
  baseQuery += ` ${orderByClause}`;
  
  // Add LIMIT clause
  if (limit && limit > 0) {
    baseQuery += ` LIMIT ${Math.min(limit, 1000)}`; // Cap at 1000 for safety
  }
  
  return { 
    sql: baseQuery, 
    params, 
    normalizedSort,
    hasAdvancedFilters: hasAdvancedFilters(filters),
    isUnified: true
  };
};

const analyzeFilterTypes = (filters) => {
  const traditionalFilterTypes = [
    'Team', 'Age', 'Games Played', 'MINS', 'PTS', 'FGM', 'FGA', 'FG%',
    '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB',
    'AST', 'TOV', 'STL', 'BLK', 'PF', '+/-', 'Wins', 'Losses', 'Win %', 'Points'
  ];
  
  const advancedFilterTypes = [
    'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %',
    'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio',
    'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %',
    'Turnover %', 'PIE', 'Pace'
  ];
  
  const hasTraditional = filters.some(filter => traditionalFilterTypes.includes(filter.type));
  const hasAdvanced = filters.some(filter => advancedFilterTypes.includes(filter.type));
  
  return {
    hasTraditional,
    hasAdvanced,
    isMixed: hasTraditional && hasAdvanced,
    filterTypes: filters.map(f => f.type)
  };
};

const getRecommendedViewType = (filters) => {
  const analysis = analyzeFilterTypes(filters);
  
  if (analysis.isMixed) {
    return 'custom';
  } else if (analysis.hasAdvanced) {
    return 'advanced';
  } else {
    return 'traditional';
  }
};

const getActiveColumns = (filters, measure) => {
  const baseColumns = measure === 'Players' 
    ? ['Name', 'TEAM', 'AGE', 'Games Played']
    : ['Team', 'Games Played'];
  
  // Get unique filter types (these become active columns)
  const filterColumns = [...new Set(filters.map(f => f.type))];
  
  // Combine base columns with filter columns, removing duplicates
  const allColumns = [...baseColumns];
  filterColumns.forEach(col => {
    if (!allColumns.includes(col)) {
      allColumns.push(col);
    }
  });
  
  return allColumns;
};

module.exports = {
  executeQuery,
  buildUnifiedQuery,
  getPlayerUnifiedQuery,
  getTeamUnifiedQuery,
  getUnifiedGroupByClause,
  analyzeFilterTypes,
  getRecommendedViewType,
  getActiveColumns
};