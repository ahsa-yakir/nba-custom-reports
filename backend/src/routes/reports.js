// Reports API routes - handles custom NBA report generation
const express = require('express');
const router = express.Router();

// Import updated query builder
const { 
  buildReportQuery, 
  validateFilters, 
  getAvailableFilterTypes, 
  hasAdvancedFilters 
} = require('../utils/queryBuilder');

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
const getColumnMapping = (measure, isAdvanced = false) => {
  if (measure === 'Players') {
    if (isAdvanced) {
      return {
        'Name': 'p.name',
        'TEAM': 't.team_code',
        'AGE': 'p.age',
        'Games Played': 'COUNT(*)',
        'Offensive Rating': 'AVG(pas.offensive_rating)',
        'Defensive Rating': 'AVG(pas.defensive_rating)',
        'Net Rating': 'AVG(pas.net_rating)',
        'Usage %': 'AVG(pas.usage_percentage)',
        'True Shooting %': 'AVG(pas.true_shooting_percentage)',
        'Effective FG%': 'AVG(pas.effective_field_goal_percentage)',
        'Assist %': 'AVG(pas.assist_percentage)',
        'Assist Turnover Ratio': 'AVG(pas.assist_turnover_ratio)',
        'Assist Ratio': 'AVG(pas.assist_ratio)',
        'Offensive Rebound %': 'AVG(pas.offensive_rebound_percentage)',
        'Defensive Rebound %': 'AVG(pas.defensive_rebound_percentage)',
        'Rebound %': 'AVG(pas.rebound_percentage)',
        'Turnover %': 'AVG(pas.turnover_percentage)',
        'PIE': 'AVG(pas.pie)',
        'Pace': 'AVG(pas.pace)',
        
        // For filtering (individual game stats)
        'Team': 't.team_code',
        'Age': 'p.age'
      };
    } else {
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
    }
  } else {
    if (isAdvanced) {
      return {
        'Team': 't.team_code',
        'Games Played': 'COUNT(*)',
        'Offensive Rating': 'AVG(tas.offensive_rating)',
        'Defensive Rating': 'AVG(tas.defensive_rating)',
        'Net Rating': 'AVG(tas.net_rating)',
        'True Shooting %': 'AVG(tas.true_shooting_percentage)',
        'Effective FG%': 'AVG(tas.effective_field_goal_percentage)',
        'Assist %': 'AVG(tas.assist_percentage)',
        'Assist Turnover Ratio': 'AVG(tas.assist_turnover_ratio)',
        'Offensive Rebound %': 'AVG(tas.offensive_rebound_percentage)',
        'Defensive Rebound %': 'AVG(tas.defensive_rebound_percentage)',
        'Rebound %': 'AVG(tas.rebound_percentage)',
        'Turnover %': 'AVG(tas.turnover_percentage)',
        'PIE': 'AVG(tas.pie)',
        'Pace': 'AVG(tas.pace)'
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
  }
};

/**
 * POST /api/reports/generate
 * Generate a custom NBA report based on filters and sorting
 */
router.post('/generate', async (req, res) => {
  try {
    const { measure, filters, sortConfig, viewType } = req.body;
    
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
    
    // Validate filters
    const filterErrors = validateFilters(filters, measure);
    if (filterErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid filters',
        message: filterErrors.join(', ')
      });
    }
    
    // Determine if we should use advanced stats
    const isAdvancedRequest = viewType === 'advanced' || hasAdvancedFilters(filters);
    
    console.log(`🔍 Generating ${measure} report with ${filters.length} filters (${isAdvancedRequest ? 'Advanced' : 'Traditional'} stats)`);
    
    // Build and execute query using the enhanced query builder
    const { sql, params, isAdvanced } = buildReportQuery(measure, filters, sortConfig, 100, viewType);
    
    console.log('📊 Executing SQL:', sql.substring(0, 200) + '...');
    console.log('🎯 Parameters:', params);
    console.log('📈 Advanced View:', isAdvanced);
    
    const result = await query(sql, params);
    
    console.log(`✅ Query completed: ${result.rows.length} results`);
    
    res.json({
      success: true,
      measure,
      filters,
      sortConfig,
      viewType: isAdvanced ? 'advanced' : 'traditional',
      autoSwitched: isAdvanced && (!viewType || viewType === 'traditional'),
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
 * GET /api/reports/filters/:measure
 * Get available filter types for a specific measure
 */
router.get('/filters/:measure', async (req, res) => {
  try {
    const { measure } = req.params;
    const { type } = req.query; // 'traditional', 'advanced', or 'all'
    
    if (!['Players', 'Teams'].includes(measure)) {
      return res.status(400).json({
        error: 'Invalid measure',
        message: 'Measure must be either "Players" or "Teams"'
      });
    }
    
    const filterTypes = getAvailableFilterTypes(measure);
    
    let response;
    switch (type) {
      case 'traditional':
        response = { filters: filterTypes.traditional };
        break;
      case 'advanced':
        response = { filters: filterTypes.advanced };
        break;
      case 'all':
      default:
        response = {
          traditional: filterTypes.traditional,
          advanced: filterTypes.advanced,
          all: filterTypes.all
        };
        break;
    }
    
    res.json({
      success: true,
      measure,
      ...response
    });
    
  } catch (error) {
    console.error('❌ Filter types fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch filter types',
      message: error.message
    });
  }
});

/**
 * POST /api/reports/validate
 * Validate a report configuration before execution
 */
router.post('/validate', async (req, res) => {
  try {
    const { measure, filters, sortConfig, viewType } = req.body;
    
    const issues = [];
    
    // Validate measure
    if (!measure || !['Players', 'Teams'].includes(measure)) {
      issues.push('Invalid or missing measure. Must be "Players" or "Teams".');
    }
    
    // Validate filters
    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      issues.push('At least one filter is required.');
    } else {
      const filterErrors = validateFilters(filters, measure);
      issues.push(...filterErrors);
    }
    
    // Check for advanced filter usage
    const hasAdvanced = filters ? hasAdvancedFilters(filters) : false;
    const recommendedView = hasAdvanced ? 'advanced' : 'traditional';
    
    res.json({
      success: true,
      valid: issues.length === 0,
      issues,
      recommendations: {
        viewType: recommendedView,
        autoSwitch: hasAdvanced && viewType !== 'advanced',
        message: hasAdvanced 
          ? 'Advanced filters detected. Consider using advanced view for best results.'
          : 'Traditional filters detected. Using traditional view.'
      }
    });
    
  } catch (error) {
    console.error('❌ Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/test
 * Test endpoint to verify database connection and table availability
 */
router.get('/test', async (req, res) => {
  try {
    // Test traditional stats tables
    const playerResult = await query('SELECT COUNT(*) as player_count FROM players');
    const playerCount = playerResult.rows[0].player_count;
    
    const teamResult = await query('SELECT COUNT(*) as team_count FROM teams');
    const teamCount = teamResult.rows[0].team_count;
    
    const gameResult = await query('SELECT COUNT(*) as game_count FROM games');
    const gameCount = gameResult.rows[0].game_count;
    
    const playerStatsResult = await query('SELECT COUNT(*) as player_stats_count FROM player_game_stats');
    const playerStatsCount = playerStatsResult.rows[0].player_stats_count;
    
    const teamStatsResult = await query('SELECT COUNT(*) as team_stats_count FROM team_game_stats');
    const teamStatsCount = teamStatsResult.rows[0].team_stats_count;
    
    // Test advanced stats tables
    let advancedStatsAvailable = false;
    let playerAdvancedCount = 0;
    let teamAdvancedCount = 0;
    
    try {
      const playerAdvancedResult = await query('SELECT COUNT(*) as player_advanced_count FROM player_advanced_stats');
      playerAdvancedCount = playerAdvancedResult.rows[0].player_advanced_count;
      
      const teamAdvancedResult = await query('SELECT COUNT(*) as team_advanced_count FROM team_advanced_stats');
      teamAdvancedCount = teamAdvancedResult.rows[0].team_advanced_count;
      
      advancedStatsAvailable = true;
    } catch (advancedError) {
      console.warn('⚠️ Advanced stats tables not available:', advancedError.message);
    }
    
    res.json({
      status: 'success',
      database: 'connected',
      data: {
        players: parseInt(playerCount),
        teams: parseInt(teamCount),
        games: parseInt(gameCount),
        playerStats: parseInt(playerStatsCount),
        teamStats: parseInt(teamStatsCount),
        playerAdvancedStats: parseInt(playerAdvancedCount),
        teamAdvancedStats: parseInt(teamAdvancedCount)
      },
      features: {
        traditionalStats: true,
        advancedStats: advancedStatsAvailable
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

/**
 * GET /api/reports/sample/:measure
 * Get sample data for a measure type (for UI development and testing)
 */
router.get('/sample/:measure', async (req, res) => {
  try {
    const { measure } = req.params;
    const { view = 'traditional', limit = 5 } = req.query;
    
    if (!['Players', 'Teams'].includes(measure)) {
      return res.status(400).json({
        error: 'Invalid measure',
        message: 'Measure must be either "Players" or "Teams"'
      });
    }
    
    const isAdvanced = view === 'advanced';
    const { sql } = buildReportQuery(measure, [], null, parseInt(limit), view);
    const result = await query(sql);
    
    res.json({
      success: true,
      measure,
      view,
      sampleData: result.rows,
      columns: Object.keys(result.rows[0] || {}),
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('❌ Sample data fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch sample data',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/stats
 * Get database statistics for monitoring
 */
router.get('/stats', async (req, res) => {
  try {
    // Get table sizes and row counts
    const stats = await query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);
    
    // Get recent query performance (if available)
    const recentGames = await query(`
      SELECT COUNT(*) as count, MAX(game_date) as latest_game
      FROM games 
      WHERE game_date >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    res.json({
      success: true,
      tableStats: stats.rows,
      recentActivity: {
        gamesLast30Days: parseInt(recentGames.rows[0].count),
        latestGame: recentGames.rows[0].latest_game
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Stats fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

module.exports = router;