/**
 * Enhanced query builder supporting organizers and backward compatibility
 * Updated to integrate organizer logic into query building process
 */
const { buildWhereClause } = require('./whereClauseBuilder');
const { buildOrderByClause, normalizeSortConfig } = require('./sortingUtils');
const { getBaseQuery, getGroupByClause } = require('./queryTemplates');
const { hasAdvancedFilters, validateFilters } = require('./filterValidation');
const { 
  buildOrganizerClause,
  buildCombinedOrganizerClause,
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
  console.log('✅ Database connection loaded in queryBuilder');
} catch (error) {
  console.error('❌ Database connection failed in queryBuilder:', error.message);
  query = async () => {
    throw new Error('Database not connected');
  };
}

const executeQuery = async (sql, params = []) => {
  try {
    console.log('🔍 Executing query:', sql.substring(0, 100) + '...');
    console.log('🎯 Parameters:', params);
    
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
    const result = buildUnifiedQueryWithOrganizer(measure, filters, normalizedOrganizer, sortConfig, limit);
    return {
      ...result,
      recommendedViewType,
      filterAnalysis,
      activeColumns: getActiveColumns(filters, measure),
      organizerDescription: getOrganizerDescription(normalizedOrganizer)
    };
  }
  
  // Fall back to legacy approach for pure traditional or advanced queries
  console.log(`🔧 Using legacy ${viewType} approach with organizer`);
  
  // Determine if we should use advanced stats based on filters or viewType
  const isAdvanced = viewType === 'advanced' || hasAdvancedFilters(filters);
  
  console.log(`📊 Filters: ${filters.length}, Organizer: ${getOrganizerDescription(normalizedOrganizer)}, Limit: ${limit}, Advanced: ${isAdvanced}`);
  
  // Base SELECT and FROM clauses
  let baseQuery = getBaseQuery(measure, isAdvanced);
  
  // Build organizer clause first (this affects JOINs and WHERE conditions)
  const { additionalJoins, additionalWhere, organizerParams } = buildOrganizerClause(
    normalizedOrganizer, 
    measure, 
    1
  );
  
  // Add organizer JOINs to base query
  if (additionalJoins) {
    // Insert the additional joins before the WHERE clause
    const whereIndex = baseQuery.indexOf('WHERE 1=1');
    if (whereIndex !== -1) {
      baseQuery = baseQuery.substring(0, whereIndex) + additionalJoins + ' ' + baseQuery.substring(whereIndex);
    }
  }
  
  // Add WHERE clause for filters (parameters will be offset by organizer parameters)
  const { whereClause, params: filterParams } = buildWhereClause(
    filters, 
    measure, 
    isAdvanced, 
    organizerParams.length + 1 // Offset by organizer param count
  );
  baseQuery += ` ${whereClause}`;
  
  // Add organizer WHERE conditions
  if (additionalWhere) {
    baseQuery += ` ${additionalWhere}`;
  }
  
  // Combine all parameters
  const allParams = [...organizerParams, ...filterParams];
  
  // Add GROUP BY clause
  baseQuery += getGroupByClause(measure, isAdvanced);
  
  // Normalize and add ORDER BY clause
  const normalizedSort = normalizeSortConfig(sortConfig, measure, isAdvanced);
  const orderByClause = buildOrderByClause(normalizedSort, measure, isAdvanced);
  baseQuery += ` ${orderByClause}`;
  
  // Add LIMIT clause
  if (limit && limit > 0) {
    baseQuery += ` LIMIT ${Math.min(limit, 1000)}`; // Cap at 1000 for safety
  }
  
  return { 
    sql: baseQuery, 
    params: allParams, 
    isAdvanced,
    normalizedSort,
    recommendedViewType,
    filterAnalysis,
    isUnified: false,
    organizerDescription: getOrganizerDescription(normalizedOrganizer)
  };
};

const buildUnifiedQueryWithOrganizer = (measure, filters, organizer, sortConfig, limit = 100) => {
  // Build unified query with organizer support
  // This is similar to the existing unified query but with organizer integration
  
  const { additionalJoins, additionalWhere, organizerParams } = buildOrganizerClause(
    organizer, 
    measure, 
    1
  );
  
  // Get base unified query template
  let baseQuery;
  if (measure === 'Players') {
    baseQuery = `
      SELECT
        p.id as player_id, 
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
    `;
  } else {
    baseQuery = `
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
    `;
  }
  
  // Add organizer JOINs
  if (additionalJoins) {
    baseQuery += additionalJoins;
  }
  
  // Add base WHERE clause
  baseQuery += ` WHERE g.game_type = 'regular'`;
  
  // Add WHERE clause for filters
  const { whereClause, params: filterParams } = buildWhereClause(
    filters, 
    measure, 
    false, // unified query uses traditional column mapping
    organizerParams.length + 1
  );
  baseQuery += ` ${whereClause}`;
  
  // Add organizer WHERE conditions
  if (additionalWhere) {
    baseQuery += ` ${additionalWhere}`;
  }
  
  // Combine parameters
  const allParams = [...organizerParams, ...filterParams];
  
  // Add GROUP BY
  if (measure === 'Players') {
    baseQuery += ` GROUP BY p.id, p.name, t.team_code, p.age`;
  } else {
    baseQuery += ` GROUP BY t.id, t.team_code`;
  }
  
  // Add ORDER BY
  const normalizedSort = normalizeSortConfig(sortConfig, measure, true);
  const orderByClause = buildOrderByClause(normalizedSort, measure, true);
  baseQuery += ` ${orderByClause}`;
  
  // Add LIMIT
  if (limit && limit > 0) {
    baseQuery += ` LIMIT ${Math.min(limit, 1000)}`;
  }
  
  return {
    sql: baseQuery,
    params: allParams,
    normalizedSort,
    hasAdvancedFilters: hasAdvancedFilters(filters),
    isUnified: true
  };
};

const buildCountQuery = (measure, filters, organizer, viewType = 'traditional') => {
  // Build a count query to get total results without limit
  const normalizedOrganizer = organizer || { type: 'all_games' };
  const filterAnalysis = analyzeFilterTypes(filters);
  
  // Use unified approach for mixed filters
  if (filterAnalysis.isMixed || viewType === 'unified') {
    const { sql } = buildUnifiedQueryWithOrganizer(measure, filters, normalizedOrganizer, null, null);
    
    // Extract the main query part and wrap it in a COUNT
    const mainQuery = sql.replace(/SELECT[\s\S]*?FROM/, 'FROM')
                         .replace(/ORDER BY[\s\S]*$/, '')
                         .replace(/LIMIT[\s\S]*$/, '');
    
    const countQuery = measure === 'Players' 
      ? `SELECT COUNT(DISTINCT p.id) as total_count ${mainQuery}`
      : `SELECT COUNT(DISTINCT t.id) as total_count ${mainQuery}`;
      
    const { params } = buildWhereClause(filters, measure, false, 1);
    const { organizerParams } = buildOrganizerClause(normalizedOrganizer, measure, 1);
    const allParams = [...organizerParams, ...params];
    
    return { sql: countQuery, params: allParams };
  }
  
  // Legacy count query approach with organizer
  const isAdvanced = viewType === 'advanced' || hasAdvancedFilters(filters);
  const { additionalJoins, additionalWhere, organizerParams } = buildOrganizerClause(normalizedOrganizer, measure, 1);
  
  let countQuery;
  if (measure === 'Players') {
    if (isAdvanced) {
      countQuery = `
        SELECT COUNT(DISTINCT p.id) as total_count
        FROM players p
        JOIN teams t ON p.team_id = t.id
        JOIN player_advanced_stats pas ON p.id = pas.player_id
        JOIN games g ON pas.game_id = g.id
        ${additionalJoins || ''}
        WHERE g.game_type = 'regular'
      `;
    } else {
      countQuery = `
        SELECT COUNT(DISTINCT p.id) as total_count
        FROM players p
        JOIN teams t ON p.team_id = t.id
        JOIN player_game_stats pgs ON p.id = pgs.player_id
        JOIN games g ON pgs.game_id = g.id
        ${additionalJoins || ''}
        WHERE g.game_type = 'regular'
      `;
    }
  } else {
    if (isAdvanced) {
      countQuery = `
        SELECT COUNT(DISTINCT t.id) as total_count
        FROM teams t
        JOIN team_advanced_stats tas ON t.id = tas.team_id
        JOIN games g ON tas.game_id = g.id
        ${additionalJoins || ''}
        WHERE g.game_type = 'regular'
      `;
    } else {
      countQuery = `
        SELECT COUNT(DISTINCT t.id) as total_count
        FROM teams t
        JOIN team_game_stats tgs ON t.id = tgs.team_id
        JOIN games g ON tgs.game_id = g.id
        ${additionalJoins || ''}
        WHERE g.game_type = 'regular'
      `;
    }
  }
  
  // Add WHERE clause for filters
  const { whereClause, params: filterParams } = buildWhereClause(
    filters, 
    measure, 
    isAdvanced, 
    organizerParams.length + 1
  );
  countQuery += ` ${whereClause}`;
  
  // Add organizer WHERE conditions
  if (additionalWhere) {
    countQuery += ` ${additionalWhere}`;
  }
  
  const allParams = [...organizerParams, ...filterParams];
  return { sql: countQuery, params: allParams };
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
      queryType: isUnified ? 'unified' : 'legacy',
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
      queryType: isUnified ? 'unified' : 'legacy',
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