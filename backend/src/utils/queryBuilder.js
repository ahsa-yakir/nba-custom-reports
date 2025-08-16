/**
 * Main query builder - orchestrates all the pieces
 */
const { buildWhereClause } = require('./whereClauseBuilder');
const { buildOrderByClause, normalizeSortConfig } = require('./sortingUtils');
const { getBaseQuery, getGroupByClause } = require('./queryTemplates');
const { hasAdvancedFilters, validateFilters } = require('./filterValidation');

// Test if database module loads properly
let query;
try {
  const db = require('../config/database');
  query = db.query;
  console.log('✅ Database connection loaded');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  // Create a dummy query function for now
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
  
  // Determine if we should use advanced stats based on filters or viewType
  const isAdvanced = viewType === 'advanced' || hasAdvancedFilters(filters);
  
  console.log(`📊 Building ${measure} query (${isAdvanced ? 'Advanced' : 'Traditional'} view)`);
  console.log(`🔧 Filters: ${filters.length}, Limit: ${limit}`);
  
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
    normalizedSort
  };
};

const buildCountQuery = (measure, filters, viewType = 'traditional') => {
  // Build a count query to get total results without limit
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
    const { sql, params } = buildReportQuery(measure, filters, sortConfig, 10, viewType);
    await executeQuery(sql, params);
    
    const duration = Date.now() - start;
    return {
      success: true,
      duration,
      message: `Query completed in ${duration}ms`
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

module.exports = {
  executeQuery,
  buildReportQuery,
  buildCountQuery,
  getSampleData,
  testQueryPerformance,
  
  // Re-export commonly used functions from other modules
  validateFilters,
  hasAdvancedFilters
};