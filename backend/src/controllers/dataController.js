/**
 * Data fetching and sample data endpoints
 */
const { getAvailableFilterTypes } = require('../utils/filterValidation');
const { buildReportQuery, executeQuery } = require('../utils/queryBuilder');

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

const getFilterTypes = async (req, res) => {
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
    console.error('Filter types fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch filter types',
      message: error.message
    });
  }
};

const getTeams = async (req, res) => {
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
    console.error('Teams fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch teams',
      message: error.message
    });
  }
};

const getSampleData = async (req, res) => {
  try {
    const { measure } = req.params;
    const { view = 'traditional', limit = 5 } = req.query;
    
    if (!['Players', 'Teams'].includes(measure)) {
      return res.status(400).json({
        error: 'Invalid measure',
        message: 'Measure must be either "Players" or "Teams"'
      });
    }
    
    const parsedLimit = Math.min(parseInt(limit) || 5, 20); // Cap at 20 for sample data
    const { sql } = buildReportQuery(measure, [], null, parsedLimit, view);
    const result = await executeQuery(sql);
    
    res.json({
      success: true,
      measure,
      view,
      sampleData: result.rows,
      columns: Object.keys(result.rows[0] || {}),
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Sample data fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch sample data',
      message: error.message
    });
  }
};

const getPlayers = async (req, res) => {
  try {
    const { team, limit = 50 } = req.query;
    
    let sql = `
      SELECT p.name, p.age, t.team_code, t.team_name
      FROM players p
      JOIN teams t ON p.team_id = t.id
    `;
    
    const params = [];
    
    if (team) {
      sql += ` WHERE t.team_code = $1`;
      params.push(team);
    }
    
    sql += ` ORDER BY p.name LIMIT ${Math.min(parseInt(limit) || 50, 200)}`;
    
    const result = await query(sql, params);
    
    res.json({
      success: true,
      players: result.rows,
      count: result.rows.length,
      filters: { team }
    });
    
  } catch (error) {
    console.error('Players fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch players',
      message: error.message
    });
  }
};

const getSeasons = async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT EXTRACT(YEAR FROM game_date) as season_year
      FROM games 
      ORDER BY season_year DESC
    `);
    
    res.json({
      success: true,
      seasons: result.rows.map(row => parseInt(row.season_year))
    });
    
  } catch (error) {
    console.error('Seasons fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch seasons',
      message: error.message
    });
  }
};

const getDataOverview = async (req, res) => {
  try {
    // Get counts for all major entities
    const queries = await Promise.all([
      query('SELECT COUNT(*) as count FROM players'),
      query('SELECT COUNT(*) as count FROM teams'),
      query('SELECT COUNT(*) as count FROM games'),
      query('SELECT COUNT(*) as count FROM player_game_stats'),
      query('SELECT COUNT(*) as count FROM team_game_stats'),
      query('SELECT MIN(game_date) as min_date, MAX(game_date) as max_date FROM games')
    ]);
    
    const [players, teams, games, playerStats, teamStats, dateRange] = queries;
    
    // Try to get advanced stats counts
    let advancedStats = { players: 0, teams: 0, available: false };
    try {
      const advancedQueries = await Promise.all([
        query('SELECT COUNT(*) as count FROM player_advanced_stats'),
        query('SELECT COUNT(*) as count FROM team_advanced_stats')
      ]);
      advancedStats = {
        players: parseInt(advancedQueries[0].rows[0].count),
        teams: parseInt(advancedQueries[1].rows[0].count),
        available: true
      };
    } catch (error) {
      console.warn('Advanced stats not available:', error.message);
    }
    
    res.json({
      success: true,
      overview: {
        players: parseInt(players.rows[0].count),
        teams: parseInt(teams.rows[0].count),
        games: parseInt(games.rows[0].count),
        playerGameStats: parseInt(playerStats.rows[0].count),
        teamGameStats: parseInt(teamStats.rows[0].count),
        dateRange: {
          from: dateRange.rows[0].min_date,
          to: dateRange.rows[0].max_date
        },
        advancedStats
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Data overview fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch data overview',
      message: error.message
    });
  }
};

module.exports = {
  getFilterTypes,
  getTeams,
  getSampleData,
  getPlayers,
  getSeasons,
  getDataOverview
};