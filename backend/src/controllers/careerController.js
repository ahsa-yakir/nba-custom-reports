/**
 * Player career data controller
 * Create this file at: backend/src/controllers/careerController.js
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

const getPlayerCareerData = async (req, res) => {
  try {
    const { playerId } = req.params;
    
    if (!playerId) {
      return res.status(400).json({
        error: 'Player ID is required'
      });
    }

    console.log(`Fetching career data for player: ${playerId}`);

    // Get player basic info
    const playerInfoQuery = `
      SELECT 
        p.id,
        p.name,
        p.age,
        p.position,
        p.years_experience,
        t.team_code,
        t.team_name,
        t.city
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE p.id = $1
    `;

    // Get career totals (regular season)
    const careerTotalsQuery = `
      SELECT 
        games_played,
        points,
        total_rebounds,
        assists,
        steals,
        blocks,
        minutes_played,
        field_goal_percentage,
        free_throw_percentage,
        three_point_percentage
      FROM player_career_totals_regular
      WHERE player_id = $1
    `;

    // Get career totals (playoffs) - may not exist
    const careerTotalsPlayoffsQuery = `
      SELECT 
        games_played,
        points,
        total_rebounds,
        assists,
        steals,
        blocks,
        minutes_played,
        field_goal_percentage,
        free_throw_percentage,
        three_point_percentage
      FROM player_career_totals_playoffs
      WHERE player_id = $1
    `;

    // Get season by season regular season stats
    const seasonStatsQuery = `
      SELECT 
        season_id,
        team_abbreviation,
        player_age,
        games_played,
        games_started,
        minutes_played,
        points,
        total_rebounds,
        assists,
        steals,
        blocks,
        field_goal_percentage,
        three_point_percentage,
        free_throw_percentage
      FROM player_season_totals_regular
      WHERE player_id = $1
      ORDER BY season_id
    `;

    // Get season by season playoff stats
    const seasonStatsPlayoffsQuery = `
      SELECT 
        season_id,
        team_abbreviation,
        player_age,
        games_played,
        games_started,
        minutes_played,
        points,
        total_rebounds,
        assists,
        steals,
        blocks,
        field_goal_percentage,
        three_point_percentage,
        free_throw_percentage
      FROM player_season_totals_playoffs
      WHERE player_id = $1
      ORDER BY season_id
    `;

    // Execute all queries in parallel
    const [
      playerInfo,
      careerTotals,
      careerTotalsPlayoffs,
      seasonStats,
      seasonStatsPlayoffs
    ] = await Promise.all([
      query(playerInfoQuery, [playerId]),
      query(careerTotalsQuery, [playerId]),
      query(careerTotalsPlayoffsQuery, [playerId]),
      query(seasonStatsQuery, [playerId]),
      query(seasonStatsPlayoffsQuery, [playerId])
    ]);

    // Check if player exists
    if (playerInfo.rows.length === 0) {
      return res.status(404).json({
        error: 'Player not found',
        playerId
      });
    }

    const player = playerInfo.rows[0];

    // Process career totals
    const processCareerTotals = (totals) => {
      if (totals.length === 0) return null;
      
      const stats = totals[0];
      return {
        games_played: parseInt(stats.games_played) || 0,
        total_points: parseInt(stats.points) || 0,
        total_rebounds: parseInt(stats.total_rebounds) || 0,
        total_assists: parseInt(stats.assists) || 0,
        total_steals: parseInt(stats.steals) || 0,
        total_blocks: parseInt(stats.blocks) || 0,
        total_minutes: parseFloat(stats.minutes_played) || 0,
        career_fg_pct: parseFloat(stats.field_goal_percentage) || 0,
        career_ft_pct: parseFloat(stats.free_throw_percentage) || 0,
        career_3p_pct: parseFloat(stats.three_point_percentage) || 0,
        // Calculate per game averages
        ppg: stats.games_played > 0 ? (parseFloat(stats.points) / parseInt(stats.games_played)).toFixed(1) : '0.0',
        rpg: stats.games_played > 0 ? (parseFloat(stats.total_rebounds) / parseInt(stats.games_played)).toFixed(1) : '0.0',
        apg: stats.games_played > 0 ? (parseFloat(stats.assists) / parseInt(stats.games_played)).toFixed(1) : '0.0',
        spg: stats.games_played > 0 ? (parseFloat(stats.steals) / parseInt(stats.games_played)).toFixed(1) : '0.0',
        bpg: stats.games_played > 0 ? (parseFloat(stats.blocks) / parseInt(stats.games_played)).toFixed(1) : '0.0',
        mpg: stats.games_played > 0 ? (parseFloat(stats.minutes_played) / parseInt(stats.games_played)).toFixed(1) : '0.0'
      };
    };

    // Process season stats
    const processSeasonStats = (seasons) => {
      return seasons.map(season => ({
        season: season.season_id,
        team: season.team_abbreviation,
        age: parseInt(season.player_age) || 0,
        gp: parseInt(season.games_played) || 0,
        gs: parseInt(season.games_started) || 0,
        mpg: season.games_played > 0 ? (parseFloat(season.minutes_played) / parseInt(season.games_played)).toFixed(1) : '0.0',
        ppg: season.games_played > 0 ? (parseFloat(season.points) / parseInt(season.games_played)).toFixed(1) : '0.0',
        rpg: season.games_played > 0 ? (parseFloat(season.total_rebounds) / parseInt(season.games_played)).toFixed(1) : '0.0',
        apg: season.games_played > 0 ? (parseFloat(season.assists) / parseInt(season.games_played)).toFixed(1) : '0.0',
        spg: season.games_played > 0 ? (parseFloat(season.steals) / parseInt(season.games_played)).toFixed(1) : '0.0',
        bpg: season.games_played > 0 ? (parseFloat(season.blocks) / parseInt(season.games_played)).toFixed(1) : '0.0',
        fg_pct: (parseFloat(season.field_goal_percentage) * 100).toFixed(1),
        three_p_pct: (parseFloat(season.three_point_percentage) * 100).toFixed(1),
        ft_pct: (parseFloat(season.free_throw_percentage) * 100).toFixed(1)
      }));
    };

    // Build response
    const careerData = {
      success: true,
      player: {
        id: player.id,
        name: player.name,
        age: parseInt(player.age) || 0,
        position: player.position || 'N/A',
        experience: parseInt(player.years_experience) || 0,
        current_team: {
          code: player.team_code || 'FA',
          name: player.team_name || 'Free Agent',
          city: player.city || ''
        }
      },
      career_stats: {
        regular_season: processCareerTotals(careerTotals.rows),
        playoffs: processCareerTotals(careerTotalsPlayoffs.rows)
      },
      season_stats: {
        regular_season: processSeasonStats(seasonStats.rows),
        playoffs: processSeasonStats(seasonStatsPlayoffs.rows)
      }
    };

    // Add metadata
    careerData.metadata = {
      has_playoff_career_data: careerTotalsPlayoffs.rows.length > 0,
      has_playoff_seasons: seasonStatsPlayoffs.rows.length > 0,
      total_seasons: seasonStats.rows.length,
      total_playoff_seasons: seasonStatsPlayoffs.rows.length
    };

    console.log(`Career data fetched successfully for ${player.name}: ${seasonStats.rows.length} seasons, ${seasonStatsPlayoffs.rows.length} playoff seasons`);

    res.json(careerData);

  } catch (error) {
    console.error('Career data fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch career data',
      message: error.message
    });
  }
};

const getPlayersByName = async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name || name.length < 2) {
      return res.status(400).json({
        error: 'Name parameter is required (minimum 2 characters)'
      });
    }

    const searchQuery = `
      SELECT 
        p.id,
        p.name,
        t.team_code,
        t.team_name
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE LOWER(p.name) LIKE LOWER($1)
      ORDER BY p.name
      LIMIT 10
    `;

    const result = await query(searchQuery, [`%${name}%`]);

    res.json({
      success: true,
      players: result.rows.map(player => ({
        id: player.id,
        name: player.name,
        team_code: player.team_code || 'FA',
        team_name: player.team_name || 'Free Agent'
      }))
    });

  } catch (error) {
    console.error('Player search error:', error);
    res.status(500).json({
      error: 'Failed to search players',
      message: error.message
    });
  }
};

module.exports = {
  getPlayerCareerData,
  getPlayersByName
};