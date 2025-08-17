/**
 * Enhanced query builder supporting unified queries and backward compatibility
 */
const { buildWhereClause } = require('./whereClauseBuilder');
const { buildOrderByClause, normalizeSortConfig } = require('./sortingUtils');
const { getBaseQuery, getGroupByClause } = require('./queryTemplates');
const { hasAdvancedFilters, validateFilters } = require('./filterValidation');
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

const buildReportQuery = (measure, filters, sortConfig, limit = 100, viewType = 'traditional') => {
  // Validate inputs
  if (!measure || !['Players', 'Teams'].includes(measure)) {
    throw new Error('Invalid measure. Must be "Players" or "Teams"');
  }
  
  if (!Array.isArray(filters)) {
    throw new Error('Filters must be an array');
  }
  
  // Analyze filters to determine best approach
  const filterAnalysis = analyzeFilterTypes(filters);
  const recommendedViewType = getRecommendedViewType(filters);
  
  console.log(`🔧 Building ${measure} query`);
  console.log(`📊 Filter analysis:`, filterAnalysis);
  console.log(`💡 Recommended view: ${recommendedViewType}`);
  
  // Use unified query for mixed filters or when explicitly requested
  if (filterAnalysis.isMixed || viewType === 'unified') {
    console.log('🔄 Using unified query approach');
    const result = buildUnifiedQuery(measure, filters, sortConfig, limit);
    return {
      ...result,
      recommendedViewType,
      filterAnalysis,
      activeColumns: getActiveColumns(filters, measure)
    };
  }
  
  // Fall back to legacy approach for pure traditional or advanced queries
  console.log(`🔧 Using legacy ${viewType} approach`);
  
  // Determine if we should use advanced stats based on filters or viewType
  const isAdvanced = viewType === 'advanced' || hasAdvancedFilters(filters);
  
  console.log(`📊 Filters: ${filters.length}, Limit: ${limit}, Advanced: ${isAdvanced}`);
  
  // Base SELECT and FROM clauses
  let baseQuery = getBaseQuery(measure, isAdvanced);
  
  // Add WHERE clause for filters
  const { whereClause, params } = buildWhereClause(filters, measure, isAdvanced);
  baseQuery += ` ${whereClause}`;
  
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
    params, 
    isAdvanced,
    normalizedSort,
    recommendedViewType,
    filterAnalysis,
    isUnified: false
  };
};

const buildCountQuery = (measure, filters, viewType = 'traditional') => {
  // Build a count query to get total results without limit
  const filterAnalysis = analyzeFilterTypes(filters);
  
  // Use unified approach for mixed filters
  if (filterAnalysis.isMixed || viewType === 'unified') {
    // For unified queries, we need to adapt the count query
    const { sql } = buildUnifiedQuery(measure, filters, null, null);
    
    // Extract the main query part and wrap it in a COUNT
    const mainQuery = sql.replace(/SELECT[\s\S]*?FROM/, 'FROM')
                         .replace(/ORDER BY[\s\S]*$/, '')
                         .replace(/LIMIT[\s\S]*$/, '');
    
    const countQuery = measure === 'Players' 
      ? `SELECT COUNT(DISTINCT p.id) as total_count ${mainQuery}`
      : `SELECT COUNT(DISTINCT t.id) as total_count ${mainQuery}`;
      
    const { params } = buildWhereClause(filters, measure, false, true);
    return { sql: countQuery, params };
  }
  
  // Legacy count query approach
  const isAdvanced = viewType === 'advanced' || hasAdvancedFilters(filters);
  
  let countQuery;
  if (measure === 'Players') {
    if (isAdvanced) {
      countQuery = `
        SELECT COUNT(DISTINCT p.id) as total_count
        FROM players p
        JOIN teams t ON p.team_id = t.id
        JOIN player_advanced_stats pas ON p.id = pas.player_id
        JOIN games g ON pas.game_id = g.id
        WHERE 1=1
      `;
    } else {
      countQuery = `
        SELECT COUNT(DISTINCT p.id) as total_count
        FROM players p
        JOIN teams t ON p.team_id = t.id
        JOIN player_game_stats pgs ON p.id = pgs.player_id
        JOIN games g ON pgs.game_id = g.id
        WHERE 1=1
      `;
    }
  } else {
    if (isAdvanced) {
      countQuery = `
        SELECT COUNT(DISTINCT t.id) as total_count
        FROM teams t
        JOIN team_advanced_stats tas ON t.id = tas.team_id
        JOIN games g ON tas.game_id = g.id
        WHERE 1=1
      `;
    } else {
      countQuery = `
        SELECT COUNT(DISTINCT t.id) as total_count
        FROM teams t
        JOIN team_game_stats tgs ON t.id = tgs.team_id
        JOIN games g ON tgs.game_id = g.id
        WHERE 1=1
      `;
    }
  }
  
  // Add WHERE clause for filters
  const { whereClause, params } = buildWhereClause(filters, measure, isAdvanced);
  countQuery += ` ${whereClause}`;
  
  return { sql: countQuery, params };
};

const getSampleData = async (measure, limit = 5, viewType = 'traditional') => {
  const { sql } = buildReportQuery(measure, [], null, limit, viewType);
  return await executeQuery(sql);
};

const testQueryPerformance = async (measure, filters, sortConfig, viewType = 'traditional') => {
  const start = Date.now();
  
  try {
    const { sql, params, isUnified } = buildReportQuery(measure, filters, sortConfig, 10, viewType);
    
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
      queryType: isUnified ? 'unified' : 'legacy'
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

const getQueryMetadata = (measure, filters, viewType = 'traditional') => {
  // Analyze the query without executing it
  try {
    const filterAnalysis = analyzeFilterTypes(filters);
    const recommendedViewType = getRecommendedViewType(filters);
    const activeColumns = getActiveColumns(filters, measure);
    
    const { isUnified, isAdvanced } = buildReportQuery(measure, filters, null, 1, viewType);
    
    return {
      success: true,
      filterAnalysis,
      recommendedViewType,
      activeColumns,
      queryType: isUnified ? 'unified' : 'legacy',
      statsType: isAdvanced ? 'advanced' : 'traditional',
      canUseUnified: filterAnalysis.isMixed || filterAnalysis.hasAdvanced,
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
  getActiveColumns
};