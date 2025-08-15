// Database setup script - creates tables and indexes
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

/**
 * Reads and executes SQL migration files with better error handling
 */
const runMigration = async (filename) => {
  console.log(`🔄 Running migration: ${filename}`);
  
  try {
    const migrationPath = path.join(__dirname, '../../migrations', filename);
    
    // Check if file exists
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Log the first few lines for debugging
    const firstLines = sql.split('\n').slice(0, 3).join('\n');
    console.log(`📄 File content preview: ${firstLines}...`);
    
    // Execute the SQL
    const result = await query(sql);
    
    console.log(`✅ Migration completed: ${filename}`);
    
    // Log any results from verification queries
    if (result && result.rows) {
      result.rows.forEach(row => {
        console.log(`   ${JSON.stringify(row)}`);
      });
    }
    
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`);
    console.error(`   Error: ${error.message}`);
    
    // Log more details for debugging
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.position) {
      console.error(`   Error Position: ${error.position}`);
    }
    
    throw error;
  }
};

/**
 * Test database connection before running migrations
 */
const testConnection = async () => {
  console.log('🔍 Testing database connection...');
  
  try {
    const result = await query('SELECT NOW() as current_time, version() as postgres_version');
    console.log(`✅ Database connected successfully`);
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].postgres_version.split(' ')[0]}`);
    return true;
  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`);
    return false;
  }
};

/**
 * Check if database is already set up
 */
const checkExistingSchema = async () => {
  console.log('🔍 Checking for existing schema...');
  
  try {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(row => row.table_name);
    
    if (tables.length > 0) {
      console.log(`⚠️  Found existing tables: ${tables.join(', ')}`);
      return tables;
    } else {
      console.log(`✅ No existing tables found, ready for setup`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Schema check failed: ${error.message}`);
    return null;
  }
};

/**
 * Setup the complete database schema
 */
const setupDatabase = async (force = false) => {
  console.log('🚀 Starting database setup...');
  
  try {
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    
    // Check for existing schema
    const existingTables = await checkExistingSchema();
    if (existingTables && existingTables.length > 0 && !force) {
      console.log('⚠️  Database already has tables. Use --force to recreate.');
      console.log('   Existing tables:', existingTables.join(', '));
      return false;
    }
    
    // If forcing and tables exist, warn user
    if (existingTables && existingTables.length > 0 && force) {
      console.log('⚠️  FORCE MODE: Will drop and recreate existing tables!');
    }
    
    // Run migrations in order
    console.log('📝 Running migrations...');
    await runMigration('001_create_tables.sql');
    await runMigration('002_create_indexes.sql');
    
    // Verify setup
    console.log('🔍 Verifying setup...');
    const finalTables = await checkExistingSchema();
    const expectedTables = ['teams', 'players', 'games', 'player_game_stats', 'team_game_stats'];
    
    const missingTables = expectedTables.filter(table => !finalTables.includes(table));
    if (missingTables.length > 0) {
      throw new Error(`Missing tables after setup: ${missingTables.join(', ')}`);
    }
    
    console.log('🎉 Database setup completed successfully!');
    console.log(`📊 Created ${finalTables.length} tables`);
    console.log('📊 Ready to load data with: npm run seed');
    
    return true;
    
  } catch (error) {
    console.error('💥 Database setup failed:', error.message);
    console.error('💡 Make sure your database exists and connection settings are correct');
    throw error;
  }
};

/**
 * Clean up database (drop all tables)
 */
const cleanDatabase = async () => {
  console.log('🧹 Cleaning database...');
  
  try {
    // Drop views first
    await query(`
      DROP VIEW IF EXISTS player_season_averages CASCADE;
      DROP VIEW IF EXISTS team_season_totals CASCADE;
    `);
    
    // Drop tables in reverse order of dependencies
    const dropOrder = [
      'player_game_stats',
      'team_game_stats', 
      'players',
      'games',
      'teams'
    ];
    
    for (const table of dropOrder) {
      await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`   Dropped table: ${table}`);
    }
    
    console.log('✅ Database cleaned successfully');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
    throw error;
  }
};

// Handle command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');
  const clean = args.includes('--clean') || args.includes('-c');
  
  if (clean) {
    cleanDatabase()
      .then(() => {
        console.log('🎯 Run setup again to recreate tables');
        process.exit(0);
      })
      .catch(() => process.exit(1));
  } else {
    setupDatabase(force)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { 
  setupDatabase, 
  runMigration, 
  testConnection, 
  checkExistingSchema,
  cleanDatabase 
};