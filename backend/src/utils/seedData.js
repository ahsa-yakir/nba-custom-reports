// Seed database with mock NBA data
const { query, getClient } = require('../config/database');

// Mock team data (expanded from your frontend data)
const teamsData = [
  { code: 'BOS', name: 'Boston Celtics', city: 'Boston', conference: 'Eastern', division: 'Atlantic' },
  { code: 'MIL', name: 'Milwaukee Bucks', city: 'Milwaukee', conference: 'Eastern', division: 'Central' },
  { code: 'PHI', name: 'Philadelphia 76ers', city: 'Philadelphia', conference: 'Eastern', division: 'Atlantic' },
  { code: 'LAL', name: 'Los Angeles Lakers', city: 'Los Angeles', conference: 'Western', division: 'Pacific' },
  { code: 'GSW', name: 'Golden State Warriors', city: 'San Francisco', conference: 'Western', division: 'Pacific' },
  { code: 'DAL', name: 'Dallas Mavericks', city: 'Dallas', conference: 'Western', division: 'Southwest' },
  { code: 'DEN', name: 'Denver Nuggets', city: 'Denver', conference: 'Western', division: 'Northwest' },
  { code: 'OKC', name: 'Oklahoma City Thunder', city: 'Oklahoma City', conference: 'Western', division: 'Northwest' }
];

// Mock player data (from your frontend, expanded)
const playersData = [
  { name: 'LeBron James', team: 'LAL', age: 39, position: 'SF', height: 81, weight: 250, experience: 21 },
  { name: 'Stephen Curry', team: 'GSW', age: 36, position: 'PG', height: 75, weight: 185, experience: 15 },
  { name: 'Luka Dončić', team: 'DAL', age: 25, position: 'PG', height: 79, weight: 230, experience: 6 },
  { name: 'Giannis Antetokounmpo', team: 'MIL', age: 29, position: 'PF', height: 83, weight: 242, experience: 11 },
  { name: 'Jayson Tatum', team: 'BOS', age: 26, position: 'SF', height: 80, weight: 210, experience: 7 },
  { name: 'Joel Embiid', team: 'PHI', age: 30, position: 'C', height: 84, weight: 280, experience: 8 },
  { name: 'Nikola Jokić', team: 'DEN', age: 29, position: 'C', height: 83, weight: 284, experience: 9 },
  { name: 'Shai Gilgeous-Alexander', team: 'OKC', age: 26, position: 'PG', height: 78, weight: 195, experience: 6 }
];

// Sample game statistics (from your frontend data, converted to DB format)
const playerStatsData = [
  {
    player: 'LeBron James', gameDate: '2024-01-15', season: '2023-24',
    minutes: 35.3, points: 26, fgm: 9, fga: 19, fgPct: 0.474,
    tpm: 2, tpa: 5, tpPct: 0.400, ftm: 6, fta: 8, ftPct: 0.750,
    oreb: 1, dreb: 7, reb: 8, ast: 7, stl: 1, blk: 1, tov: 4, pf: 2, plusMinus: 5, gameType: 'Home'
  },
  {
    player: 'Stephen Curry', gameDate: '2024-01-16', season: '2023-24',
    minutes: 32.7, points: 28, fgm: 10, fga: 20, fgPct: 0.500,
    tpm: 5, tpa: 12, tpPct: 0.417, ftm: 3, fta: 3, ftPct: 1.000,
    oreb: 1, dreb: 4, reb: 5, ast: 5, stl: 1, blk: 0, tov: 3, pf: 2, plusMinus: 8, gameType: 'Away'
  },
  {
    player: 'Luka Dončić', gameDate: '2024-01-17', season: '2023-24',
    minutes: 36.2, points: 35, fgm: 12, fga: 26, fgPct: 0.462,
    tpm: 4, tpa: 10, tpPct: 0.400, ftm: 7, fta: 9, ftPct: 0.778,
    oreb: 1, dreb: 8, reb: 9, ast: 9, stl: 1, blk: 0, tov: 4, pf: 2, plusMinus: 3, gameType: 'Home'
  },
  {
    player: 'Giannis Antetokounmpo', gameDate: '2024-01-18', season: '2023-24',
    minutes: 35.2, points: 33, fgm: 12, fga: 21, fgPct: 0.571,
    tpm: 1, tpa: 2, tpPct: 0.500, ftm: 8, fta: 12, ftPct: 0.667,
    oreb: 3, dreb: 9, reb: 12, ast: 6, stl: 1, blk: 1, tov: 3, pf: 3, plusMinus: 7, gameType: 'Away'
  },
  {
    player: 'Jayson Tatum', gameDate: '2024-01-19', season: '2023-24',
    minutes: 35.8, points: 31, fgm: 11, fga: 23, fgPct: 0.478,
    tpm: 3, tpa: 10, tpPct: 0.300, ftm: 6, fta: 7, ftPct: 0.857,
    oreb: 1, dreb: 8, reb: 9, ast: 5, stl: 1, blk: 1, tov: 3, pf: 2, plusMinus: 9, gameType: 'Home'
  },
  {
    player: 'Joel Embiid', gameDate: '2024-01-20', season: '2023-24',
    minutes: 34.6, points: 36, fgm: 13, fga: 22, fgPct: 0.591,
    tpm: 1, tpa: 4, tpPct: 0.250, ftm: 9, fta: 11, ftPct: 0.818,
    oreb: 2, dreb: 9, reb: 11, ast: 4, stl: 1, blk: 2, tov: 3, pf: 3, plusMinus: 4, gameType: 'Away'
  },
  {
    player: 'Nikola Jokić', gameDate: '2024-01-21', season: '2023-24',
    minutes: 34.6, points: 24, fgm: 10, fga: 18, fgPct: 0.556,
    tpm: 1, tpa: 3, tpPct: 0.333, ftm: 3, fta: 4, ftPct: 0.750,
    oreb: 3, dreb: 10, reb: 13, ast: 9, stl: 1, blk: 1, tov: 3, pf: 3, plusMinus: 8, gameType: 'Home'
  },
  {
    player: 'Shai Gilgeous-Alexander', gameDate: '2024-01-22', season: '2023-24',
    minutes: 34.5, points: 32, fgm: 11, fga: 21, fgPct: 0.524,
    tpm: 2, tpa: 5, tpPct: 0.400, ftm: 8, fta: 9, ftPct: 0.889,
    oreb: 1, dreb: 4, reb: 5, ast: 6, stl: 2, blk: 1, tov: 3, pf: 2, plusMinus: 9, gameType: 'Away'
  }
];

// Team game stats data
const teamStatsData = [
  {
    team: 'BOS', gameDate: '2024-01-19', season: '2023-24', points: 118, opponentPoints: 102, win: true,
    fgm: 44, fga: 92, fgPct: 0.478, tpm: 16, tpa: 44, tpPct: 0.364, ftm: 14, fta: 18, ftPct: 0.778,
    oreb: 10, dreb: 36, reb: 46, ast: 27, stl: 8, blk: 6, tov: 13, pf: 18, plusMinus: 16, gameType: 'Home'
  },
  {
    team: 'MIL', gameDate: '2024-01-18', season: '2023-24', points: 125, opponentPoints: 108, win: true,
    fgm: 46, fga: 90, fgPct: 0.511, tpm: 15, tpa: 38, tpPct: 0.395, ftm: 18, fta: 22, ftPct: 0.818,
    oreb: 11, dreb: 36, reb: 47, ast: 25, stl: 7, blk: 5, tov: 14, pf: 20, plusMinus: 17, gameType: 'Away'
  },
  {
    team: 'PHI', gameDate: '2024-01-20', season: '2023-24', points: 112, opponentPoints: 109, win: true,
    fgm: 41, fga: 88, fgPct: 0.466, tpm: 13, tpa: 36, tpPct: 0.361, ftm: 17, fta: 23, ftPct: 0.739,
    oreb: 10, dreb: 33, reb: 43, ast: 24, stl: 8, blk: 5, tov: 13, pf: 22, plusMinus: 3, gameType: 'Away'
  },
  {
    team: 'LAL', gameDate: '2024-01-15', season: '2023-24', points: 120, opponentPoints: 115, win: true,
    fgm: 43, fga: 88, fgPct: 0.489, tpm: 13, tpa: 36, tpPct: 0.361, ftm: 21, fta: 26, ftPct: 0.808,
    oreb: 10, dreb: 34, reb: 44, ast: 26, stl: 7, blk: 6, tov: 15, pf: 20, plusMinus: 5, gameType: 'Home'
  },
  {
    team: 'GSW', gameDate: '2024-01-16', season: '2023-24', points: 128, opponentPoints: 120, win: true,
    fgm: 45, fga: 93, fgPct: 0.484, tpm: 18, tpa: 45, tpPct: 0.400, ftm: 20, fta: 24, ftPct: 0.833,
    oreb: 9, dreb: 35, reb: 44, ast: 28, stl: 8, blk: 5, tov: 15, pf: 18, plusMinus: 8, gameType: 'Away'
  },
  {
    team: 'DAL', gameDate: '2024-01-17', season: '2023-24', points: 116, opponentPoints: 113, win: true,
    fgm: 42, fga: 89, fgPct: 0.472, tpm: 15, tpa: 40, tpPct: 0.375, ftm: 17, fta: 22, ftPct: 0.773,
    oreb: 10, dreb: 32, reb: 42, ast: 25, stl: 7, blk: 5, tov: 13, pf: 19, plusMinus: 3, gameType: 'Home'
  },
  {
    team: 'DEN', gameDate: '2024-01-21', season: '2023-24', points: 122, opponentPoints: 110, win: true,
    fgm: 47, fga: 88, fgPct: 0.534, tpm: 12, tpa: 35, tpPct: 0.343, ftm: 16, fta: 20, ftPct: 0.800,
    oreb: 12, dreb: 41, reb: 53, ast: 29, stl: 9, blk: 7, tov: 12, pf: 16, plusMinus: 12, gameType: 'Home'
  },
  {
    team: 'OKC', gameDate: '2024-01-22', season: '2023-24', points: 125, opponentPoints: 115, win: true,
    fgm: 46, fga: 87, fgPct: 0.529, tpm: 14, tpa: 32, tpPct: 0.438, ftm: 19, fta: 23, ftPct: 0.826,
    oreb: 8, dreb: 37, reb: 45, ast: 27, stl: 10, blk: 4, tov: 11, pf: 19, plusMinus: 10, gameType: 'Away'
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
      INSERT INTO teams (team_code, team_name, city, conference, division)
      VALUES ($1, $2, $3, $4, $5)
    `, [team.code, team.name, team.city, team.conference, team.division]);
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
      INSERT INTO players (name, team_id, age, position, height_inches, weight_pounds, years_experience)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [player.name, teamId, player.age, player.position, player.height, player.weight, player.experience]);
  }
  
  console.log(`✅ Inserted ${playersData.length} players`);
};

/**
 * Create sample games
 */
const seedGames = async () => {
  console.log('🎮 Creating sample games...');
  
  const games = [
    { date: '2024-01-15', homeTeam: 'LAL', awayTeam: 'GSW', homeScore: 120, awayScore: 115 },
    { date: '2024-01-16', homeTeam: 'BOS', awayTeam: 'GSW', homeScore: 108, awayScore: 128 },
    { date: '2024-01-17', homeTeam: 'DAL', awayTeam: 'PHI', homeScore: 116, awayScore: 113 },
    { date: '2024-01-18', homeTeam: 'OKC', awayTeam: 'MIL', homeScore: 108, awayScore: 125 },
    { date: '2024-01-19', homeTeam: 'BOS', awayTeam: 'DEN', homeScore: 118, awayScore: 102 },
    { date: '2024-01-20', homeTeam: 'LAL', awayTeam: 'PHI', homeScore: 109, awayScore: 112 },
    { date: '2024-01-21', homeTeam: 'DEN', awayTeam: 'OKC', homeScore: 122, awayScore: 110 },
    { date: '2024-01-22', homeTeam: 'MIL', awayTeam: 'OKC', homeScore: 115, awayScore: 125 }
  ];
  
  for (const game of games) {
    const homeTeamResult = await query('SELECT id FROM teams WHERE team_code = $1', [game.homeTeam]);
    const awayTeamResult = await query('SELECT id FROM teams WHERE team_code = $1', [game.awayTeam]);
    
    await query(`
      INSERT INTO games (game_date, season, home_team_id, away_team_id, home_score, away_score)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [game.date, '2023-24', homeTeamResult.rows[0].id, awayTeamResult.rows[0].id, game.homeScore, game.awayScore]);
  }
  
  console.log(`✅ Created ${games.length} games`);
};

/**
 * Insert player game statistics
 */
const seedPlayerStats = async () => {
  console.log('📊 Seeding player statistics...');
  
  for (const stat of playerStatsData) {
    // Get player ID
    const playerResult = await query('SELECT id, team_id FROM players WHERE name = $1', [stat.player]);
    if (playerResult.rows.length === 0) continue;
    
    const player = playerResult.rows[0];
    
    // Get game ID
    const gameResult = await query('SELECT id FROM games WHERE game_date = $1', [stat.gameDate]);
    if (gameResult.rows.length === 0) continue;
    
    const gameId = gameResult.rows[0].id;
    
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
      player.id, gameId, player.team_id, stat.minutes, stat.points,
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
    if (teamResult.rows.length === 0) continue;
    
    const teamId = teamResult.rows[0].id;
    
    // Get game ID
    const gameResult = await query('SELECT id FROM games WHERE game_date = $1', [stat.gameDate]);
    if (gameResult.rows.length === 0) continue;
    
    const gameId = gameResult.rows[0].id;
    
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
      teamId, gameId, stat.points, stat.opponentPoints, stat.win,
      stat.fgm, stat.fga, stat.fgPct, stat.tpm, stat.tpa, stat.tpPct,
      stat.ftm, stat.fta, stat.ftPct, stat.oreb, stat.dreb, stat.reb,
      stat.ast, stat.stl, stat.blk, stat.tov, stat.pf, stat.plusMinus, stat.gameType
    ]);
  }
  
  console.log(`✅ Inserted ${teamStatsData.length} team stat records`);
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