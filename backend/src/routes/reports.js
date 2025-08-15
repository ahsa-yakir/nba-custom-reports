// Reports API routes - handles custom NBA report generation
const express = require('express');
const router = express.Router();

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

/**
 * Maps frontend filter/column names to database column names
 */
const getColumnMapping = (measure) => {
  if (measure === 'Players') {
    return {
      'Name': 'p.name',
      'TEAM': 't.team_code',
      'AGE': 'p.age',
      'Games Played': 'COUNT(*)',
      'PTS': 'AVG(pgs.points)',
      'MINS': 'AVG(pgs.minutes_played)',
      'FGM': 'AVG(pgs.field_goals_made)',
      'FGA': 'AVG(pgs.field_goals_attempted)',
      'FG%': 'AVG(pgs.field_goal_percentage)',
      '3PM': 'AVG(pgs.three_pointers_made)',
      '3PA': 'AVG(pgs.three_pointers_attempted)',
      '3P%': 'AVG(pgs.three_point_percentage)',
      'FTM': 'AVG(pgs.free_throws_made)',
      'FTA': 'AVG(pgs.free_throws_attempted)',
      'FT%': 'AVG(pgs.free_throw_percentage)',
      'OREB': 'AVG(pgs.offensive_rebounds)',
      'DREB': 'AVG(pgs.defensive_rebounds)',
      'REB': 'AVG(pgs.total_rebounds)',
      'AST': 'AVG(pgs.assists)',
      'TOV': 'AVG(pgs.turnovers)',
      'STL': 'AVG(pgs.steals)',
      'BLK': 'AVG(pgs.blocks)',
      'PF': 'AVG(pgs.personal_fouls)',
      '+/-': 'AVG(pgs.plus_minus)',
      
      // For filtering (individual game stats)
      'Team': 't.team_code',
      'Age': 'p.age'
    };
  } else {
    return {
      'Team': 't.team_code',
      'Games Played': 'COUNT(*)',
      'Wins': 'SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END)',
      'Losses': 'SUM(CASE WHEN tgs.win = FALSE THEN 1 ELSE 0 END)',
      'Win %': 'ROUND(SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1)',
      'PTS': 'AVG(tgs.points)',
      'FGM': 'AVG(tgs.field_goals_made)',
      'FGA': 'AVG(tgs.field_goals_attempted)',
      'FG%': 'AVG(tgs.field_goal_percentage)',
      '3PM': 'AVG(tgs.three_pointers_made)',
      '3PA': 'AVG(tgs.three_pointers_attempted)',
      '3P%': 'AVG(tgs.three_point_percentage)',
      'FTM': 'AVG(tgs.free_throws_made)',
      'FTA': 'AVG(tgs.free_throws_attempted)',
      'FT%': 'AVG(tgs.free_throw_percentage)',
      'OREB': 'AVG(tgs.offensive_rebounds)',
      'DREB': 'AVG(tgs.defensive_rebounds)',
      'REB': 'AVG(tgs.total_rebounds)',
      'AST': 'AVG(tgs.assists)',
      'TOV': 'AVG(tgs.turnovers)',
      'STL': 'AVG(tgs.steals)',
      'BLK': 'AVG(tgs.blocks)',
      '+/-': 'AVG(tgs.plus_minus)',
      
      // For filtering
      'Points': 'tgs.points',
      'Wins': 'tgs.win'
    };
  }
};

/**
 * Build WHERE clause for a single filter
 */
const buildFilterClause = (filter, measure, paramIndex) => {
  const columnMap = getColumnMapping(measure);
  const filterType = filter.type;
  const operator = filter.operator;
  
  // Map filter type to database column for WHERE clauses
  let dbColumn;
  if (measure === 'Players') {
    const filterColumnMap = {
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
    dbColumn = filterColumnMap[filterType];
  } else {
    const filterColumnMap = {
      'Points': 'tgs.points',
      'Wins': 'CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END',
      'Games Played': '1', // This will be handled in HAVING clause
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
    dbColumn = filterColumnMap[filterType];
  }
  
  if (!dbColumn) {
    return { clause: null, params: [] };
  }
  
  let clause;
  let params = [];
  
  switch (operator) {
    case 'greater than':
      clause = `${dbColumn} > $${paramIndex}`;
      params = [filter.value];
      break;
    case 'less than':
      clause = `${dbColumn} < $${paramIndex}`;
      params = [filter.value];
      break;
    case 'equals':
      clause = `${dbColumn} = $${paramIndex}`;
      params = [filter.value];
      break;
    case 'between':
      clause = `${dbColumn} BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params = [filter.value, filter.value2];
      break;
    case 'in':
      const placeholders = filter.values.map((_, i) => `$${paramIndex + i}`).join(', ');
      clause = `${dbColumn} IN (${placeholders})`;
      params = filter.values;
      break;
    default:
      return { clause: null, params: [] };
  }
  
  return { clause, params };
};

/**
 * Build complete SQL query for report generation
 */
const buildReportQuery = (measure, filters, sortConfig) => {
  let baseQuery;
  let params = [];
  let paramIndex = 1;
  
  if (measure === 'Players') {
    baseQuery = `
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
  } else {
    baseQuery = `
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
  
  // Add filter conditions
  const whereClauses = [];
  filters.forEach(filter => {
    const { clause, params: filterParams } = buildFilterClause(filter, measure, paramIndex);
    if (clause) {
      whereClauses.push(clause);
      params.push(...filterParams);
      paramIndex += filterParams.length;
    }
  });
  
  if (whereClauses.length > 0) {
    baseQuery += ` AND ${whereClauses.join(' AND ')}`;
  }
  
  // Add GROUP BY clause
  if (measure === 'Players') {
    baseQuery += ` GROUP BY p.id, p.name, t.team_code, p.age`;
  } else {
    baseQuery += ` GROUP BY t.id, t.team_code`;
  }
  
  // Add sorting
  if (sortConfig && sortConfig.column) {
    const columnMap = getColumnMapping(measure);
    let sortColumn;
    
    // Map display column to actual column name for sorting
    switch (sortConfig.column) {
      case 'Name': sortColumn = 'p.name'; break;
      case 'TEAM': case 'Team': sortColumn = 't.team_code'; break;
      case 'AGE': sortColumn = 'p.age'; break;
      case 'Games Played': sortColumn = 'games_played'; break;
      case 'Minutes Played': sortColumn = 'minutes_played'; break;
      case 'Wins': sortColumn = 'wins'; break;
      case 'Losses': sortColumn = 'losses'; break;
      case 'Win %': sortColumn = 'win_pct'; break;
      case 'PTS': sortColumn = 'pts'; break;
      case 'FGM': sortColumn = 'fgm'; break;
      case 'FGA': sortColumn = 'fga'; break;
      case 'FG%': sortColumn = 'fg_pct'; break;
      case '3PM': sortColumn = 'tpm'; break;
      case '3PA': sortColumn = 'tpa'; break;
      case '3P%': sortColumn = 'tp_pct'; break;
      case 'FTM': sortColumn = 'ftm'; break;
      case 'FTA': sortColumn = 'fta'; break;
      case 'FT%': sortColumn = 'ft_pct'; break;
      case 'OREB': sortColumn = 'oreb'; break;
      case 'DREB': sortColumn = 'dreb'; break;
      case 'REB': sortColumn = 'reb'; break;
      case 'AST': sortColumn = 'ast'; break;
      case 'TOV': sortColumn = 'tov'; break;
      case 'STL': sortColumn = 'stl'; break;
      case 'BLK': sortColumn = 'blk'; break;
      case '+/-': sortColumn = 'plus_minus'; break;
      default: sortColumn = 'pts'; // Default fallback
    }
    
    const direction = sortConfig.direction === 'asc' ? 'ASC' : 'DESC';
    baseQuery += ` ORDER BY ${sortColumn} ${direction}`;
  }
  
  // Add limit for performance
  baseQuery += ` LIMIT 100`;
  
  return { sql: baseQuery, params };
};

/**
 * POST /api/reports/generate
 * Generate a custom NBA report based on filters and sorting
 */
router.post('/generate', async (req, res) => {
  try {
    const { measure, filters, sortConfig } = req.body;
    
    // Validate required fields
    if (!measure) {
      return res.status(400).json({
        error: 'Missing required field: measure',
        message: 'Please specify either "Players" or "Teams"'
      });
    }
    
    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      return res.status(400).json({
        error: 'Missing required field: filters',
        message: 'At least one filter is required'
      });
    }
    
    console.log(`🔍 Generating ${measure} report with ${filters.length} filters`);
    
    // Build and execute query
    const { sql, params } = buildReportQuery(measure, filters, sortConfig);
    
    console.log('📊 Executing SQL:', sql);
    console.log('🎯 Parameters:', params);
    
    const result = await query(sql, params);
    
    console.log(`✅ Query completed: ${result.rows.length} results`);
    
    res.json({
      success: true,
      measure,
      filters,
      sortConfig,
      count: result.rows.length,
      results: result.rows
    });
    
  } catch (error) {
    console.error('❌ Report generation error:', error);
    
    res.status(500).json({
      error: 'Report generation failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/reports/test
 * Test endpoint to verify database connection
 */
router.get('/test', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as player_count FROM players');
    const playerCount = result.rows[0].player_count;
    
    const teamResult = await query('SELECT COUNT(*) as team_count FROM teams');
    const teamCount = teamResult.rows[0].team_count;
    
    const gameResult = await query('SELECT COUNT(*) as game_count FROM games');
    const gameCount = gameResult.rows[0].game_count;
    
    res.json({
      status: 'success',
      database: 'connected',
      data: {
        players: parseInt(playerCount),
        teams: parseInt(teamCount),
        games: parseInt(gameCount)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database test error:', error);
    
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/teams
 * Get list of all teams (for filter dropdowns)
 */
router.get('/teams', async (req, res) => {
  try {
    const result = await query(`
      SELECT team_code, team_name, city, conference 
      FROM teams 
      ORDER BY team_code
    `);
    
    res.json({
      success: true,
      teams: result.rows
    });
    
  } catch (error) {
    console.error('❌ Teams fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch teams',
      message: error.message
    });
  }
});

module.exports = router;