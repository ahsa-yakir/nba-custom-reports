/**
 * Health check and monitoring endpoints
 */

// Test if database module loads properly
let query;
try {
  const db = require('../config/database');
  query = db.query;
} catch (error) {
  console.error('Database connection failed:', error.message);
  query = async () => {
    throw new Error('Database not connected');
  };
}

const testConnection = async (req, res) => {
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
      console.warn('Advanced stats tables not available:', advancedError.message);
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
    console.error('Database test error:', error);
    
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
};

const getStats = async (req, res) => {
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
    
    // Get recent query performance
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
    console.error('Stats fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
};

const checkHealth = async (req, res) => {
  try {
    // Simple health check - test basic connectivity
    const start = Date.now();
    await query('SELECT 1 as health_check');
    const dbResponseTime = Date.now() - start;
    
    // Check if essential tables exist
    const tableChecks = await Promise.allSettled([
      query("SELECT 1 FROM information_schema.tables WHERE table_name = 'players'"),
      query("SELECT 1 FROM information_schema.tables WHERE table_name = 'teams'"),
      query("SELECT 1 FROM information_schema.tables WHERE table_name = 'games'"),
      query("SELECT 1 FROM information_schema.tables WHERE table_name = 'player_game_stats'"),
      query("SELECT 1 FROM information_schema.tables WHERE table_name = 'team_game_stats'")
    ]);
    
    const tablesExist = tableChecks.every(check => check.status === 'fulfilled');
    
    const health = {
      status: tablesExist ? 'healthy' : 'degraded',
      database: {
        connected: true,
        responseTime: `${dbResponseTime}ms`
      },
      tables: {
        essential: tablesExist,
        checked: ['players', 'teams', 'games', 'player_game_stats', 'team_game_stats']
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(tablesExist ? 200 : 503).json(health);
    
  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      database: {
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
};

const getSystemInfo = async (req, res) => {
  try {
    // Get PostgreSQL version and settings
    const versionResult = await query('SELECT version() as pg_version');
    const settingsResult = await query(`
      SELECT name, setting, unit, context 
      FROM pg_settings 
      WHERE name IN ('max_connections', 'shared_buffers', 'work_mem', 'maintenance_work_mem')
    `);
    
    // Get current connections
    const connectionsResult = await query(`
      SELECT COUNT(*) as active_connections,
             COUNT(CASE WHEN state = 'active' THEN 1 END) as active_queries
      FROM pg_stat_activity
    `);
    
    const systemInfo = {
      database: {
        version: versionResult.rows[0].pg_version,
        connections: {
          active: parseInt(connectionsResult.rows[0].active_connections),
          activeQueries: parseInt(connectionsResult.rows[0].active_queries)
        },
        settings: settingsResult.rows.reduce((acc, row) => {
          acc[row.name] = {
            value: row.setting,
            unit: row.unit,
            context: row.context
          };
          return acc;
        }, {})
      },
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime()
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      systemInfo
    });
    
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({
      error: 'Failed to fetch system information',
      message: error.message
    });
  }
};

module.exports = {
  testConnection,
  getStats,
  checkHealth,
  getSystemInfo
};