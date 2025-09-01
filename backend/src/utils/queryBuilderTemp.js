/**
 * Restructured query builder that applies organizers first, then calculates averages, then filters
 * This fixes the core issue where filters were applied at game level instead of average level
 */
const { buildWhereClause } = require('./whereClauseBuilder');
const { buildOrderByClause, normalizeSortConfig } = require('./sortingUtils');
const { hasAdvancedFilters, validateFilters } = require('./filterValidation');
const { 
  buildOrganizerSubquery,
  validateOrganizer,
  getOrganizerDescription
} = require('./organizerBuilder');
const { 
  buildUnifiedQuery, 
  executeQuery: unifiedExecuteQuery,
  analyzeFilterTypes,
  getRecommendedViewType,
  getActiveColumns
} = require('./unifiedQueryBuilder');

// Test if database module loads properly
let query;
try {
  const db = require('../config/database');
  query = db.query;
  console.log('✅ Database connection loaded in restructured queryBuilder');
} catch (error) {
  console.error('❌ Database connection failed in restructured queryBuilder:', error.message);
  query = async () => {
    throw new Error('Database not connected');
  };
}

const executeQuery = async (sql, params = []) => {
  try {
    console.log('🔍 Executing restructured query:', sql.substring(0, 200) + '...');
    console.log('🎯 Parameters:', params);
    
    const start = Date.now();
    const result = await query(sql, params);
    const duration = Date.now() - start;
    
    console.log(`✅ Restructured query completed in ${duration}ms, ${result.rows.length} rows returned`);
    
    return result;
  } catch (error) {
    console.error('❌ Restructured query execution failed:', error);
    throw error;
  }
};

const buildPlayerQuery = (organizer, isAdvanced = false) => {
  const { subquery: organizerSubquery } = buildOrganizerSubquery(organizer, 'Players');
  
  if (isAdvanced) {
    return `
      SELECT
        p.id as player_id, 
        p.name,
        t.team_code as team,
        p.age,
        COUNT(DISTINCT scoped_games.game_id) as games_played,
        
        -- Advanced stats (averaged over scoped games)
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
      JOIN (${organizerSubquery}) scoped_games ON p.id = scoped_games.entity_id
      JOIN player_advanced_stats pas ON p.id = pas.player_id AND pas.game_id = scoped_games.game_id
      GROUP BY p.id, p.name, t.team_code, p.age
      HAVING COUNT(DISTINCT scoped_games.game_id) > 0
    `;
  } else {
    return `
      SELECT
        p.id as player_id, 
        p.name,
        t.team_code as team,
        p.age,
        COUNT(DISTINCT scoped_games.game_id) as games_played,
        
        -- Traditional stats (averaged over scoped games)
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
        ROUND(AVG(pgs.plus_minus), 1) as plus_minus
        
      FROM players p
      JOIN teams t ON p.team_id = t.id
      JOIN (${organizerSubquery}) scoped_games ON p.id = scoped_games.entity_id
      JOIN player_game_stats pgs ON p.id = pgs.player_id AND pgs.game_id = scoped_games.game_id
      GROUP BY p.id, p.name, t.team_code, p.age
      HAVING COUNT(DISTINCT scoped_games.game_id) > 0
    `;
  }
};

const buildTeamQuery = (organizer, isAdvanced = false) => {
  const { subquery: organizerSubquery } = buildOrganizerSubquery(organizer, 'Teams');
  
  if (isAdvanced) {
    return `
      SELECT 
        t.team_code as team,
        COUNT(DISTINCT scoped_games.game_id) as games_played,
        
        -- Advanced stats (averaged over scoped games)
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
      JOIN (${organizerSubquery}) scoped_games ON t.id = scoped_games.entity_id
      JOIN team_advanced_stats tas ON t.id = tas.team_id AND tas.game_id = scoped_games.game_id
      GROUP BY t.id, t.team_code
      HAVING COUNT(DISTINCT scoped_games.game_id) > 0
    `;
  } else {
    return `
      SELECT 
        t.team_code as team,
        COUNT(DISTINCT scoped_games.game_id) as games_played,
        
        -- Traditional stats (with wins/losses calculated over scoped games)
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
      JOIN (${organizerSubquery}) scoped_games ON t.id = scoped_games.entity_id
      JOIN team_game_stats tgs ON t.id = tgs.team_id AND tgs.game_id = scoped_games.game_id
      GROUP BY t.id, t.team_code
      HAVING COUNT(DISTINCT scoped_games.game_id) > 0
    `;
  }
};

const buildUnifiedQueryWithOrganizer = (measure, organizer, filters, sortConfig, limit = 100) => {
  const { subquery: organizerSubquery } = buildOrganizerSubquery(organizer, measure);
  
  let baseQuery;
  if (measure === 'Players') {
    baseQuery = `
      SELECT
        p.id as player_id, 
        p.name,
        t.team_code as team,
        p.age,
        COUNT(DISTINCT scoped_games.game_id) as games_played,
        
        -- Traditional stats (averaged over scoped games)
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
        
        -- Advanced stats (averaged over scoped games, may be NULL if not available)
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
      JOIN (${organizerSubquery}) scoped_games ON p.id = scoped_games.entity_id
      JOIN player_game_stats pgs ON p.id = pgs.player_id AND pgs.game_id = scoped_games.game_id
      LEFT JOIN player_advanced_stats pas ON p.id = pas.player_id AND pas.game_id = scoped_games.game_id
      GROUP BY p.id, p.name, t.team_code, p.age
      HAVING COUNT(DISTINCT scoped_games.game_id) > 0
    `;
  } else {
    baseQuery = `
      SELECT 
        t.team_code as team,
        COUNT(DISTINCT scoped_games.game_id) as games_played,
        
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
      JOIN (${organizerSubquery}) scoped_games ON t.id = scoped_games.entity_id
      JOIN team_game_stats tgs ON t.id = tgs.team_id AND tgs.game_id = scoped_games.game_id
      LEFT JOIN team_advanced_stats tas ON t.id = tas.team_id AND tas.game_id = scoped_games.game_id
      GROUP BY t.id, t.team_code
      HAVING COUNT(DISTINCT scoped_games.game_id) > 0
    `;
  }
  
  return baseQuery;
};

const buildReportQuery = (measure, filters, organizer, sortConfig, limit = 100, viewType = 'traditional') => {
  // Validate inputs
  if (!measure || !['Players', 'Teams'].includes(measure)) {
    throw new Error('Invalid measure. Must be "Players" or "Teams"');
  }
  
  if (!Array.isArray(filters)) {
    throw new Error('Filters must be an array');
  }

  // Always require organizer (default to all_games if not provided)
  const normalizedOrganizer = organizer || { type: 'all_games' };

  // Validate organizer
  const organizerErrors = validateOrganizer(normalizedOrganizer);
  if (organizerErrors.length > 0) {
    throw new Error(`Organizer validation failed: ${organizerErrors.join(', ')}`);
  }
  
  // Analyze filters to determine best approach
  const filterAnalysis = analyzeFilterTypes(filters);
  const recommendedViewType = getRecommendedViewType(filters);
  
  console.log(`🔧 Building ${measure} query with organizer: ${getOrganizerDescription(normalizedOrganizer)}`);
  console.log(`📊 Filter analysis:`, filterAnalysis);
  console.log(`💡 Recommended view: ${recommendedViewType}`);
  
  // Use unified query for mixed filters or when explicitly requested
  if (filterAnalysis.isMixed || viewType === 'unified') {
    console.log('🔄 Using unified query approach with organizer');
    return buildUnifiedReportQuery(measure, filters, normalizedOrganizer, sortConfig, limit);
  }
  
  // Use traditional or advanced query based on filters/viewType
  const isAdvanced = viewType === 'advanced' || hasAdvancedFilters(filters);
  console.log(`🔧 Using ${isAdvanced ? 'advanced' : 'traditional'} query approach with organizer`);
  
  // Build the main query with organizer applied first
  const baseQuery = measure === 'Players' 
    ? buildPlayerQuery(normalizedOrganizer, isAdvanced)
    : buildTeamQuery(normalizedOrganizer, isAdvanced);
  
  // Now apply filters to the aggregated results
  // This is the key change: filters are applied AFTER averages are calculated
  const { whereClause, params: filterParams } = buildWhereClause(filters, measure, isAdvanced, 1);
  
  let finalQuery = baseQuery;
  
  // Add WHERE clause for filters (applied to aggregated data)
  if (whereClause) {
    // Replace 'HAVING COUNT' with 'HAVING COUNT AND filter conditions'
    const havingIndex = finalQuery.indexOf('HAVING COUNT');
    if (havingIndex !== -1) {
      const beforeHaving = finalQuery.substring(0, havingIndex);
      const afterHaving = finalQuery.substring(havingIndex);
      
      // Extract the existing HAVING condition and add our filters
      finalQuery = beforeHaving + afterHaving.replace(
        'HAVING COUNT(DISTINCT scoped_games.game_id) > 0',
        `HAVING COUNT(DISTINCT scoped_games.game_id) > 0 ${whereClause.replace('AND', 'AND')}`
      );
    }
  }
  
  // Normalize and add ORDER BY clause
  const normalizedSort = normalizeSortConfig(sortConfig, measure, isAdvanced);
  const orderByClause = buildOrderByClause(normalizedSort, measure, isAdvanced);
  finalQuery += ` ${orderByClause}`;
  
  // Add LIMIT clause
  if (limit && limit > 0) {
    finalQuery += ` LIMIT ${Math.min(limit, 1000)}`; // Cap at 1000 for safety
  }
  
  return { 
    sql: finalQuery, 
    params: filterParams, 
    isAdvanced,
    normalizedSort,
    recommendedViewType,
    filterAnalysis,
    isUnified: false,
    organizerDescription: getOrganizerDescription(normalizedOrganizer)
  };
};

const buildUnifiedReportQuery = (measure, filters, organizer, sortConfig, limit = 100) => {
  // Build unified query with organizer
  const baseQuery = buildUnifiedQueryWithOrganizer(measure, organizer, filters, sortConfig, limit);
  
  // Apply filters to the aggregated results
  const { whereClause, params: filterParams } = buildWhereClause(filters, measure, false, 1);
  
  let finalQuery = baseQuery;
  
  // Add WHERE clause for filters (applied to aggregated data)
  if (whereClause) {
    // Replace 'HAVING COUNT' with 'HAVING COUNT AND filter conditions'  
    const havingIndex = finalQuery.indexOf('HAVING COUNT');
    if (havingIndex !== -1) {
      const beforeHaving = finalQuery.substring(0, havingIndex);
      const afterHaving = finalQuery.substring(havingIndex);
      
      finalQuery = beforeHaving + afterHaving.replace(
        'HAVING COUNT(DISTINCT scoped_games.game_id) > 0',
        `HAVING COUNT(DISTINCT scoped_games.game_id) > 0 ${whereClause.replace('AND', 'AND')}`
      );
    }
  }
  
  // Add ORDER BY
  const normalizedSort = normalizeSortConfig(sortConfig, measure, true);
  const orderByClause = buildOrderByClause(normalizedSort, measure, true);
  finalQuery += ` ${orderByClause}`;
  
  // Add LIMIT
  if (limit && limit > 0) {
    finalQuery += ` LIMIT ${Math.min(limit, 1000)}`;
  }
  
  return {
    sql: finalQuery,
    params: filterParams,
    normalizedSort,
    hasAdvancedFilters: hasAdvancedFilters(filters),
    isUnified: true,
    organizerDescription: getOrganizerDescription(organizer)
  };
};

const buildCountQuery = (measure, filters, organizer, viewType = 'traditional') => {
  // Build a count query to get total results without limit
  const normalizedOrganizer = organizer || { type: 'all_games' };
  const filterAnalysis = analyzeFilterTypes(filters);
  
  // Use unified approach for mixed filters
  if (filterAnalysis.isMixed || viewType === 'unified') {
    const baseQuery = buildUnifiedQueryWithOrganizer(measure, normalizedOrganizer, filters, null, null);
    const { whereClause, params: filterParams } = buildWhereClause(filters, measure, false, 1);
    
    let countQuery = `SELECT COUNT(*) as total_count FROM (${baseQuery}`;
    
    if (whereClause) {
      const havingIndex = countQuery.indexOf('HAVING COUNT');
      if (havingIndex !== -1) {
        const beforeHaving = countQuery.substring(0, havingIndex);
        const afterHaving = countQuery.substring(havingIndex);
        
        countQuery = beforeHaving + afterHaving.replace(
          'HAVING COUNT(DISTINCT scoped_games.game_id) > 0',
          `HAVING COUNT(DISTINCT scoped_games.game_id) > 0 ${whereClause.replace('AND', 'AND')}`
        );
      }
    }
    
    countQuery += ') subquery';
    
    return { sql: countQuery, params: filterParams };
  }
  
  // Legacy count query approach with organizer
  const isAdvanced = viewType === 'advanced' || hasAdvancedFilters(filters);
  const baseQuery = measure === 'Players' 
    ? buildPlayerQuery(normalizedOrganizer, isAdvanced)
    : buildTeamQuery(normalizedOrganizer, isAdvanced);
  
  const { whereClause, params: filterParams } = buildWhereClause(filters, measure, isAdvanced, 1);
  
  let countQuery = `SELECT COUNT(*) as total_count FROM (${baseQuery}`;
  
  if (whereClause) {
    const havingIndex = countQuery.indexOf('HAVING COUNT');
    if (havingIndex !== -1) {
      const beforeHaving = countQuery.substring(0, havingIndex);
      const afterHaving = countQuery.substring(havingIndex);
      
      countQuery = beforeHaving + afterHaving.replace(
        'HAVING COUNT(DISTINCT scoped_games.game_id) > 0',
        `HAVING COUNT(DISTINCT scoped_games.game_id) > 0 ${whereClause.replace('AND', 'AND')}`
      );
    }
  }
  
  countQuery += ') subquery';
  
  return { sql: countQuery, params: filterParams };
};

const getSampleData = async (measure, organizer, limit = 5, viewType = 'traditional') => {
  const normalizedOrganizer = organizer || { type: 'all_games' };
  const { sql } = buildReportQuery(measure, [], normalizedOrganizer, null, limit, viewType);
  return await executeQuery(sql);
};

const testQueryPerformance = async (measure, filters, organizer, sortConfig, viewType = 'traditional') => {
  const start = Date.now();
  
  try {
    const normalizedOrganizer = organizer || { type: 'all_games' };
    const { sql, params, isUnified } = buildReportQuery(measure, filters, normalizedOrganizer, sortConfig, 10, viewType);
    
    if (isUnified) {
      await unifiedExecuteQuery(sql, params);
    } else {
      await executeQuery(sql, params);
    }
    
    const duration = Date.now() - start;
    return {
      success: true,
      duration,
      message: `Query completed in ${duration}ms`,
      queryType: isUnified ? 'unified' : 'restructured',
      organizer: getOrganizerDescription(normalizedOrganizer)
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      success: false,
      duration,
      error: error.message
    };
  }
};

const getQueryMetadata = (measure, filters, organizer, viewType = 'traditional') => {
  // Analyze the query without executing it
  try {
    const normalizedOrganizer = organizer || { type: 'all_games' };
    const filterAnalysis = analyzeFilterTypes(filters);
    const recommendedViewType = getRecommendedViewType(filters);
    const activeColumns = getActiveColumns(filters, measure);
    
    const { isUnified, isAdvanced } = buildReportQuery(measure, filters, normalizedOrganizer, null, 1, viewType);
    
    return {
      success: true,
      filterAnalysis,
      recommendedViewType,
      activeColumns,
      queryType: isUnified ? 'unified' : 'restructured',
      statsType: isAdvanced ? 'advanced' : 'traditional',
      canUseUnified: filterAnalysis.isMixed || filterAnalysis.hasAdvanced,
      organizerDescription: getOrganizerDescription(normalizedOrganizer),
      suggestions: {
        useUnified: filterAnalysis.isMixed,
        switchToAdvanced: filterAnalysis.hasAdvanced && viewType === 'traditional',
        switchToTraditional: !filterAnalysis.hasAdvanced && viewType === 'advanced'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  executeQuery,
  buildReportQuery,
  buildCountQuery,
  getSampleData,
  testQueryPerformance,
  getQueryMetadata,
  
  // Re-export commonly used functions from other modules
  validateFilters,
  hasAdvancedFilters,
  
  // Re-export unified query functions
  buildUnifiedQuery,
  analyzeFilterTypes,
  getRecommendedViewType,
  getActiveColumns,
  
  // Re-export organizer functions
  validateOrganizer,
  getOrganizerDescription
};