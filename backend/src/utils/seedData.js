// Seed database with mock NBA data - Updated for new schema
const { query, getClient } = require('../config/database');

// Mock team data with NBA API-style IDs
const teamsData = [
  { id: '1610612738', code: 'BOS', name: 'Boston Celtics', city: 'Boston', conference: 'Eastern', division: 'Atlantic' },
  { id: '1610612749', code: 'MIL', name: 'Milwaukee Bucks', city: 'Milwaukee', conference: 'Eastern', division: 'Central' },
  { id: '1610612755', code: 'PHI', name: 'Philadelphia 76ers', city: 'Philadelphia', conference: 'Eastern', division: 'Atlantic' },
  { id: '1610612747', code: 'LAL', name: 'Los Angeles Lakers', city: 'Los Angeles', conference: 'Western', division: 'Pacific' },
  { id: '1610612744', code: 'GSW', name: 'Golden State Warriors', city: 'San Francisco', conference: 'Western', division: 'Pacific' },
  { id: '1610612742', code: 'DAL', name: 'Dallas Mavericks', city: 'Dallas', conference: 'Western', division: 'Southwest' },
  { id: '1610612743', code: 'DEN', name: 'Denver Nuggets', city: 'Denver', conference: 'Western', division: 'Northwest' },
  { id: '1610612760', code: 'OKC', name: 'Oklahoma City Thunder', city: 'Oklahoma City', conference: 'Western', division: 'Northwest' }
];

// Mock player data with NBA API-style IDs
const playersData = [
  { id: '2544', name: 'LeBron James', team: 'LAL', age: 39, position: 'SF', height: 81, weight: 250, experience: 21 },
  { id: '201939', name: 'Stephen Curry', team: 'GSW', age: 36, position: 'PG', height: 75, weight: 185, experience: 15 },
  { id: '1629029', name: 'Luka Dončić', team: 'DAL', age: 25, position: 'PG', height: 79, weight: 230, experience: 6 },
  { id: '203507', name: 'Giannis Antetokounmpo', team: 'MIL', age: 29, position: 'PF', height: 83, weight: 242, experience: 11 },
  { id: '1628369', name: 'Jayson Tatum', team: 'BOS', age: 26, position: 'SF', height: 80, weight: 210, experience: 7 },
  { id: '203954', name: 'Joel Embiid', team: 'PHI', age: 30, position: 'C', height: 84, weight: 280, experience: 8 },
  { id: '203999', name: 'Nikola Jokić', team: 'DEN', age: 29, position: 'C', height: 83, weight: 284, experience: 9 },
  { id: '1628983', name: 'Shai Gilgeous-Alexander', team: 'OKC', age: 26, position: 'PG', height: 78, weight: 195, experience: 6 }
];

// Sample games with NBA API-style IDs
const gamesData = [
  { id: '0022300001', date: '2024-01-15', homeTeam: 'LAL', awayTeam: 'GSW', homeScore: 120, awayScore: 115 },
  { id: '0022300002', date: '2024-01-16', homeTeam: 'BOS', awayTeam: 'GSW', homeScore: 108, awayScore: 128 },
  { id: '0022300003', date: '2024-01-17', homeTeam: 'DAL', awayTeam: 'PHI', homeScore: 116, awayScore: 113 },
  { id: '0022300004', date: '2024-01-18', homeTeam: 'OKC', awayTeam: 'MIL', homeScore: 108, awayScore: 125 },
  { id: '0022300005', date: '2024-01-19', homeTeam: 'BOS', awayTeam: 'DEN', homeScore: 118, awayScore: 102 },
  { id: '0022300006', date: '2024-01-20', homeTeam: 'LAL', awayTeam: 'PHI', homeScore: 109, awayScore: 112 },
  { id: '0022300007', date: '2024-01-21', homeTeam: 'DEN', awayTeam: 'OKC', homeScore: 122, awayScore: 110 },
  { id: '0022300008', date: '2024-01-22', homeTeam: 'MIL', awayTeam: 'OKC', homeScore: 115, awayScore: 125 }
];

// Sample game statistics (updated to match games)
const playerStatsData = [
  {
    player: 'LeBron James', gameId: '0022300001', season: '2023-24',
    minutes: 35.3, points: 26, fgm: 9, fga: 19, fgPct: 0.474,
    tpm: 2, tpa: 5, tpPct: 0.400, ftm: 6, fta: 8, ftPct: 0.750,
    oreb: 1, dreb: 7, reb: 8, ast: 7, stl: 1, blk: 1, tov: 4, pf: 2, plusMinus: 5, gameType: 'Home'
  },
  {
    player: 'Stephen Curry', gameId: '0022300001', season: '2023-24',
    minutes: 32.7, points: 28, fgm: 10, fga: 20, fgPct: 0.500,
    tpm: 5, tpa: 12, tpPct: 0.417, ftm: 3, fta: 3, ftPct: 1.000,
    oreb: 1, dreb: 4, reb: 5, ast: 5, stl: 1, blk: 0, tov: 3, pf: 2, plusMinus: -5, gameType: 'Away'
  },
  {
    player: 'Luka Dončić', gameId: '0022300003', season: '2023-24',
    minutes: 36.2, points: 35, fgm: 12, fga: 26, fgPct: 0.462,
    tpm: 4, tpa: 10, tpPct: 0.400, ftm: 7, fta: 9, ftPct: 0.778,
    oreb: 1, dreb: 8, reb: 9, ast: 9, stl: 1, blk: 0, tov: 4, pf: 2, plusMinus: 3, gameType: 'Home'
  },
  {
    player: 'Giannis Antetokounmpo', gameId: '0022300004', season: '2023-24',
    minutes: 35.2, points: 33, fgm: 12, fga: 21, fgPct: 0.571,
    tpm: 1, tpa: 2, tpPct: 0.500, ftm: 8, fta: 12, ftPct: 0.667,
    oreb: 3, dreb: 9, reb: 12, ast: 6, stl: 1, blk: 1, tov: 3, pf: 3, plusMinus: -17, gameType: 'Away'
  },
  {
    player: 'Jayson Tatum', gameId: '0022300005', season: '2023-24',
    minutes: 35.8, points: 31, fgm: 11, fga: 23, fgPct: 0.478,
    tpm: 3, tpa: 10, tpPct: 0.300, ftm: 6, fta: 7, ftPct: 0.857,
    oreb: 1, dreb: 8, reb: 9, ast: 5, stl: 1, blk: 1, tov: 3, pf: 2, plusMinus: 16, gameType: 'Home'
  },
  {
    player: 'Joel Embiid', gameId: '0022300006', season: '2023-24',
    minutes: 34.6, points: 36, fgm: 13, fga: 22, fgPct: 0.591,
    tpm: 1, tpa: 4, tpPct: 0.250, ftm: 9, fta: 11, ftPct: 0.818,
    oreb: 2, dreb: 9, reb: 11, ast: 4, stl: 1, blk: 2, tov: 3, pf: 3, plusMinus: 3, gameType: 'Away'
  },
  {
    player: 'Nikola Jokić', gameId: '0022300007', season: '2023-24',
    minutes: 34.6, points: 24, fgm: 10, fga: 18, fgPct: 0.556,
    tpm: 1, tpa: 3, tpPct: 0.333, ftm: 3, fta: 4, ftPct: 0.750,
    oreb: 3, dreb: 10, reb: 13, ast: 9, stl: 1, blk: 1, tov: 3, pf: 3, plusMinus: 12, gameType: 'Home'
  },
  {
    player: 'Shai Gilgeous-Alexander', gameId: '0022300008', season: '2023-24',
    minutes: 34.5, points: 32, fgm: 11, fga: 21, fgPct: 0.524,
    tpm: 2, tpa: 5, tpPct: 0.400, ftm: 8, fta: 9, ftPct: 0.889,
    oreb: 1, dreb: 4, reb: 5, ast: 6, stl: 2, blk: 1, tov: 3, pf: 2, plusMinus: 10, gameType: 'Away'
  }
];

// Team game stats data (updated to match games)
const teamStatsData = [
  {
    team: 'LAL', gameId: '0022300001', season: '2023-24', points: 120, opponentPoints: 115, win: true,
    fgm: 43, fga: 88, fgPct: 0.489, tpm: 13, tpa: 36, tpPct: 0.361, ftm: 21, fta: 26, ftPct: 0.808,
    oreb: 10, dreb: 34, reb: 44, ast: 26, stl: 7, blk: 6, tov: 15, pf: 20, plusMinus: 5, gameType: 'Home'
  },
  {
    team: 'GSW', gameId: '0022300001', season: '2023-24', points: 115, opponentPoints: 120, win: false,
    fgm: 41, fga: 85, fgPct: 0.482, tpm: 17, tpa: 43, tpPct: 0.395, ftm: 16, fta: 20, ftPct: 0.800,
    oreb: 8, dreb: 32, reb: 40, ast: 24, stl: 6, blk: 4, tov: 13, pf: 22, plusMinus: -5, gameType: 'Away'
  },
  {
    team: 'GSW', gameId: '0022300002', season: '2023-24', points: 128, opponentPoints: 108, win: true,
    fgm: 45, fga: 93, fgPct: 0.484, tpm: 18, tpa: 45, tpPct: 0.400, ftm: 20, fta: 24, ftPct: 0.833,
    oreb: 9, dreb: 35, reb: 44, ast: 28, stl: 8, blk: 5, tov: 15, pf: 18, plusMinus: 20, gameType: 'Away'
  },
  {
    team: 'BOS', gameId: '0022300002', season: '2023-24', points: 108, opponentPoints: 128, win: false,
    fgm: 38, fga: 89, fgPct: 0.427, tpm: 12, tpa: 42, tpPct: 0.286, ftm: 20, fta: 25, ftPct: 0.800,
    oreb: 12, dreb: 33, reb: 45, ast: 22, stl: 7, blk: 5, tov: 16, pf: 20, plusMinus: -20, gameType: 'Home'
  },
  {
    team: 'DAL', gameId: '0022300003', season: '2023-24', points: 116, opponentPoints: 113, win: true,
    fgm: 42, fga: 89, fgPct: 0.472, tpm: 15, tpa: 40, tpPct: 0.375, ftm: 17, fta: 22, ftPct: 0.773,
    oreb: 10, dreb: 32, reb: 42, ast: 25, stl: 7, blk: 5, tov: 13, pf: 19, plusMinus: 3, gameType: 'Home'
  },
  {
    team: 'PHI', gameId: '0022300003', season: '2023-24', points: 113, opponentPoints: 116, win: false,
    fgm: 40, fga: 86, fgPct: 0.465, tpm: 14, tpa: 35, tpPct: 0.400, ftm: 19, fta: 24, ftPct: 0.792,
    oreb: 9, dreb: 35, reb: 44, ast: 23, stl: 6, blk: 4, tov: 14, pf: 21, plusMinus: -3, gameType: 'Away'
  },
  {
    team: 'MIL', gameId: '0022300004', season: '2023-24', points: 125, opponentPoints: 108, win: true,
    fgm: 46, fga: 90, fgPct: 0.511, tpm: 15, tpa: 38, tpPct: 0.395, ftm: 18, fta: 22, ftPct: 0.818,
    oreb: 11, dreb: 36, reb: 47, ast: 25, stl: 7, blk: 5, tov: 14, pf: 20, plusMinus: 17, gameType: 'Away'
  },
  {
    team: 'OKC', gameId: '0022300004', season: '2023-24', points: 108, opponentPoints: 125, win: false,
    fgm: 39, fga: 84, fgPct: 0.464, tpm: 13, tpa: 31, tpPct: 0.419, ftm: 17, fta: 21, ftPct: 0.810,
    oreb: 7, dreb: 34, reb: 41, ast: 24, stl: 8, blk: 3, tov: 12, pf: 18, plusMinus: -17, gameType: 'Home'
  }
];

/**
 * Clear all data from tables (for re-seeding)
 */
const clearData = async () => {
  console.log('🧹 Clearing existing data...');
  
  await query('DELETE FROM player_game_stats');
  await query('DELETE FROM team_game_stats');
  await query('DELETE FROM games');
  await query('DELETE FROM players');
  await query('DELETE FROM teams');
  
  console.log('✅ Data cleared');
};

/**
 * Insert teams into the database
 */
const seedTeams = async () => {
  console.log('🏀 Seeding teams...');
  
  for (const team of teamsData) {
    await query(`
      INSERT INTO teams (id, team_code, team_name, city, conference, division)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [team.id, team.code, team.name, team.city, team.conference, team.division]);
  }
  
  console.log(`✅ Inserted ${teamsData.length} teams`);
};

/**
 * Insert players into the database
 */
const seedPlayers = async () => {
  console.log('👥 Seeding players...');
  
  for (const player of playersData) {
    // Get team ID from team code
    const teamResult = await query('SELECT id FROM teams WHERE team_code = $1', [player.team]);
    const teamId = teamResult.rows[0].id;
    
    await query(`
      INSERT INTO players (id, name, team_id, age, position, height_inches, weight_pounds, years_experience)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [player.id, player.name, teamId, player.age, player.position, player.height, player.weight, player.experience]);
  }
  
  console.log(`✅ Inserted ${playersData.length} players`);
};

/**
 * Create sample games
 */
const seedGames = async () => {
  console.log('🎮 Creating sample games...');
  
  for (const game of gamesData) {
    const homeTeamResult = await query('SELECT id FROM teams WHERE team_code = $1', [game.homeTeam]);
    const awayTeamResult = await query('SELECT id FROM teams WHERE team_code = $1', [game.awayTeam]);
    
    await query(`
      INSERT INTO games (id, game_date, season, home_team_id, away_team_id, home_score, away_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [game.id, game.date, '2023-24', homeTeamResult.rows[0].id, awayTeamResult.rows[0].id, game.homeScore, game.awayScore]);
  }
  
  console.log(`✅ Created ${gamesData.length} games`);
};

/**
 * Insert player game statistics
 */
const seedPlayerStats = async () => {
  console.log('📊 Seeding player statistics...');
  
  for (const stat of playerStatsData) {
    // Get player ID and team ID
    const playerResult = await query('SELECT id, team_id FROM players WHERE name = $1', [stat.player]);
    if (playerResult.rows.length === 0) {
      console.warn(`⚠️  Player not found: ${stat.player}`);
      continue;
    }
    
    const player = playerResult.rows[0];
    
    await query(`
      INSERT INTO player_game_stats (
        player_id, game_id, team_id, minutes_played, points,
        field_goals_made, field_goals_attempted, field_goal_percentage,
        three_pointers_made, three_pointers_attempted, three_point_percentage,
        free_throws_made, free_throws_attempted, free_throw_percentage,
        offensive_rebounds, defensive_rebounds, total_rebounds,
        assists, steals, blocks, turnovers, personal_fouls, plus_minus, game_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
    `, [
      player.id, stat.gameId, player.team_id, stat.minutes, stat.points,
      stat.fgm, stat.fga, stat.fgPct, stat.tpm, stat.tpa, stat.tpPct,
      stat.ftm, stat.fta, stat.ftPct, stat.oreb, stat.dreb, stat.reb,
      stat.ast, stat.stl, stat.blk, stat.tov, stat.pf, stat.plusMinus, stat.gameType
    ]);
  }
  
  console.log(`✅ Inserted ${playerStatsData.length} player stat records`);
};

/**
 * Insert team game statistics
 */
const seedTeamStats = async () => {
  console.log('🏆 Seeding team statistics...');
  
  for (const stat of teamStatsData) {
    // Get team ID
    const teamResult = await query('SELECT id FROM teams WHERE team_code = $1', [stat.team]);
    if (teamResult.rows.length === 0) {
      console.warn(`⚠️  Team not found: ${stat.team}`);
      continue;
    }
    
    const teamId = teamResult.rows[0].id;
    
    await query(`
      INSERT INTO team_game_stats (
        team_id, game_id, points, opponent_points, win,
        field_goals_made, field_goals_attempted, field_goal_percentage,
        three_pointers_made, three_pointers_attempted, three_point_percentage,
        free_throws_made, free_throws_attempted, free_throw_percentage,
        offensive_rebounds, defensive_rebounds, total_rebounds,
        assists, steals, blocks, turnovers, personal_fouls, plus_minus, game_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
    `, [
      teamId, stat.gameId, stat.points, stat.opponentPoints, stat.win,
      stat.fgm, stat.fga, stat.fgPct, stat.tpm, stat.tpa, stat.tpPct,
      stat.ftm, stat.fta, stat.ftPct, stat.oreb, stat.dreb, stat.reb,
      stat.ast, stat.stl, stat.blk, stat.tov, stat.pf, stat.plusMinus, stat.gameType
    ]);
  }
  
  console.log(`✅ Inserted ${teamStatsData.length} team stat records`);
};

/**
 * Verify seeded data
 */
const verifyData = async () => {
  console.log('🔍 Verifying seeded data...');
  
  const results = await query(`
    SELECT 
      (SELECT COUNT(*) FROM teams) as teams,
      (SELECT COUNT(*) FROM players) as players,
      (SELECT COUNT(*) FROM games) as games,
      (SELECT COUNT(*) FROM player_game_stats) as player_stats,
      (SELECT COUNT(*) FROM team_game_stats) as team_stats
  `);
  
  const counts = results.rows[0];
  console.log('📊 Data verification:');
  console.log(`   Teams: ${counts.teams}`);
  console.log(`   Players: ${counts.players}`);
  console.log(`   Games: ${counts.games}`);
  console.log(`   Player Stats: ${counts.player_stats}`);
  console.log(`   Team Stats: ${counts.team_stats}`);
  
  // Test a sample query
  const sampleQuery = await query(`
    SELECT p.name, t.team_code, AVG(pgs.points) as avg_points
    FROM players p
    JOIN teams t ON p.team_id = t.id
    JOIN player_game_stats pgs ON p.id = pgs.player_id
    GROUP BY p.name, t.team_code
    ORDER BY avg_points DESC
    LIMIT 3
  `);
  
  console.log('🏆 Top scorers (sample):');
  sampleQuery.rows.forEach(row => {
    console.log(`   ${row.name} (${row.team_code}): ${parseFloat(row.avg_points).toFixed(1)} PPG`);
  });
};

/**
 * Main seed function
 */
const seedDatabase = async () => {
  console.log('🌱 Starting database seeding...');
  
  const client = await getClient();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Clear existing data
    await clearData();
    
    // Seed data in correct order (respecting foreign keys)
    await seedTeams();
    await seedPlayers();
    await seedGames();
    await seedPlayerStats();
    await seedTeamStats();
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Verify the data
    await verifyData();
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('🚀 Ready to start the API server with: npm run dev');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('💥 Database seeding failed:', error);
    throw error;
    
  } finally {
    client.release();
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedDatabase };