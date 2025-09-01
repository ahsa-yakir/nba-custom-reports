/**
 * Data fetching and sample data endpoints - updated with organizer support
 */
const { getAvailableFilterTypes } = require('../utils/filterValidation');
const { buildReportQuery, executeQuery } = require('../utils/queryBuilder');
const { getOrganizerDescription } = require('../utils/organizerBuilder');

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

const getOrganizerTypes = async (req, res) => {
  try {
    const organizerTypes = [
      {
        type: 'all_games',
        name: 'All Games',
        description: 'Calculate averages across all games in the season',
        parameters: [],
        default: true
      },
      {
        type: 'last_games',
        name: 'Last X Games',
        description: 'Calculate averages for the last X games played by each player/team',
        parameters: [
          {
            name: 'value',
            type: 'number',
            required: true,
            min: 1,
            max: 82,
            description: 'Number of recent games to include'
          }
        ]
      },
      {
        type: 'game_range',
        name: 'Game Range',
        description: 'Calculate averages for games within a specific range (e.g., games 10-20)',
        parameters: [
          {
            name: 'from',
            type: 'number',
            required: true,
            min: 1,
            max: 82,
            description: 'Starting game number'
          },
          {
            name: 'to',
            type: 'number',
            required: true,
            min: 1,
            max: 82,
            description: 'Ending game number'
          }
        ]
      },
      {
        type: 'home_away',
        name: 'Home/Away Games',
        description: 'Filter by whether the team was playing at home or away',
        parameters: [
          {
            name: 'gameType',
            type: 'select',
            required: true,
            options: ['home', 'away'],
            description: 'Home or away games'
          }
        ],
        stackable: true
      }
    ];

    res.json({
      success: true,
      organizerTypes,
      message: 'Available organizer types for filtering game scope'
    });

  } catch (error) {
    console.error('Organizer types fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch organizer types',
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
    const { view = 'traditional', limit = 5, organizer } = req.query;
    
    if (!['Players', 'Teams'].includes(measure)) {
      return res.status(400).json({
        error: 'Invalid measure',
        message: 'Measure must be either "Players" or "Teams"'
      });
    }
    
    // Parse organizer from query string if provided
    let parsedOrganizer = { type: 'all_games' };
    if (organizer) {
      try {
        parsedOrganizer = JSON.parse(organizer);
      } catch (e) {
        console.warn('Invalid organizer JSON, using default');
      }
    }
    
    const parsedLimit = Math.min(parseInt(limit) || 5, 20); // Cap at 20 for sample data
    const { sql } = buildReportQuery(measure, [], parsedOrganizer, null, parsedLimit, view);
    const result = await executeQuery(sql);
    
    res.json({
      success: true,
      measure,
      view,
      organizer: parsedOrganizer,
      organizerDescription: getOrganizerDescription(parsedOrganizer),
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
      SELECT DISTINCT season
      FROM games 
      WHERE game_type = 'regular'
      ORDER BY season DESC
    `);
    
    res.json({
      success: true,
      seasons: result.rows.map(row => row.season)
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
      query('SELECT COUNT(*) as count FROM games WHERE game_type = \'regular\''),
      query('SELECT COUNT(*) as count FROM player_game_stats pgs JOIN games g ON pgs.game_id = g.id WHERE g.game_type = \'regular\''),
      query('SELECT COUNT(*) as count FROM team_game_stats tgs JOIN games g ON tgs.game_id = g.id WHERE g.game_type = \'regular\''),
      query('SELECT MIN(game_date) as min_date, MAX(game_date) as max_date FROM games WHERE game_type = \'regular\''),
      query('SELECT COUNT(DISTINCT season) as season_count FROM games WHERE game_type = \'regular\'')
    ]);
    
    const [players, teams, games, playerStats, teamStats, dateRange, seasons] = queries;
    
    // Try to get advanced stats counts
    let advancedStats = { players: 0, teams: 0, available: false };
    try {
      const advancedQueries = await Promise.all([
        query('SELECT COUNT(*) as count FROM player_advanced_stats pas JOIN games g ON pas.game_id = g.id WHERE g.game_type = \'regular\''),
        query('SELECT COUNT(*) as count FROM team_advanced_stats tas JOIN games g ON tas.game_id = g.id WHERE g.game_type = \'regular\'')
      ]);
      advancedStats = {
        players: parseInt(advancedQueries[0].rows[0].count),
        teams: parseInt(advancedQueries[1].rows[0].count),
        available: true
      };
    } catch (error) {
      console.warn('Advanced stats not available:', error.message);
    }
    
    // Get game number statistics for organizers
    const gameNumberStats = await query(`
      SELECT 
        MAX(home_team_game_number) as max_home_games,
        MAX(away_team_game_number) as max_away_games,
        AVG(home_team_game_number) as avg_home_games,
        AVG(away_team_game_number) as avg_away_games
      FROM games 
      WHERE game_type = 'regular'
        AND home_team_game_number IS NOT NULL 
        AND away_team_game_number IS NOT NULL
    `);
    
    res.json({
      success: true,
      overview: {
        players: parseInt(players.rows[0].count),
        teams: parseInt(teams.rows[0].count),
        games: parseInt(games.rows[0].count),
        seasons: parseInt(seasons.rows[0].season_count),
        playerGameStats: parseInt(playerStats.rows[0].count),
        teamGameStats: parseInt(teamStats.rows[0].count),
        dateRange: {
          from: dateRange.rows[0].min_date,
          to: dateRange.rows[0].max_date
        },
        advancedStats,
        gameNumbers: gameNumberStats.rows[0] ? {
          maxGamesPerTeam: Math.max(
            parseInt(gameNumberStats.rows[0].max_home_games) || 0,
            parseInt(gameNumberStats.rows[0].max_away_games) || 0
          ),
          avgGamesPerTeam: Math.round((
            parseFloat(gameNumberStats.rows[0].avg_home_games) +
            parseFloat(gameNumberStats.rows[0].avg_away_games)
          ) / 2)
        } : null
      },
      organizerSupport: {
        available: true,
        gameNumberingEnabled: gameNumberStats.rows[0] ? true : false,
        maxGameRange: gameNumberStats.rows[0] ? Math.max(
          parseInt(gameNumberStats.rows[0].max_home_games) || 82,
          parseInt(gameNumberStats.rows[0].max_away_games) || 82
        ) : 82
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
  getOrganizerTypes, // New endpoint
  getTeams,
  getSampleData,
  getPlayers,
  getSeasons,
  getDataOverview
};