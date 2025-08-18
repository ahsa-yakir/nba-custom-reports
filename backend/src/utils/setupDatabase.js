// Database setup script - creates tables and indexes including career statistics
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

/**
 * Reads and executes SQL migration files with better error handling
 */
const runMigration = async (filename) => {
  console.log(`📄 Running migration: ${filename}`);
  
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
 * Verify all expected tables exist (including career stats tables)
 */
const verifyTablesCreated = async () => {
  console.log('🔍 Verifying all tables were created...');
  
  const expectedTables = [
    // Original tables
    'teams',
    'players', 
    'games',
    'player_game_stats',
    'player_advanced_stats',
    'team_game_stats',
    'team_advanced_stats',
    // Career statistics tables
    'player_season_totals_regular',
    'player_career_totals_regular',
    'player_season_totals_playoffs',
    'player_career_totals_playoffs',
    'player_season_rankings_regular',
    'player_season_rankings_playoffs'
  ];
  
  try {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const actualTables = result.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !actualTables.includes(table));
    
    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}`);
    }
    
    console.log(`✅ All ${expectedTables.length} expected tables found`);
    return actualTables;
    
  } catch (error) {
    console.error(`❌ Table verification failed: ${error.message}`);
    throw error;
  }
};

/**
 * Verify all expected views exist (including career stats views)
 */
const verifyViewsCreated = async () => {
  console.log('🔍 Verifying all views were created...');
  
  const expectedViews = [
    // Original views
    'player_season_averages',
    'player_advanced_season_averages',
    'team_season_totals',
    'team_advanced_season_totals',
    // Career statistics views
    'player_career_overview',
    'player_season_progression'
  ];
  
  try {
    const result = await query(`
      SELECT table_name as view_name
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const actualViews = result.rows.map(row => row.view_name);
    const missingViews = expectedViews.filter(view => !actualViews.includes(view));
    
    if (missingViews.length > 0) {
      throw new Error(`Missing views: ${missingViews.join(', ')}`);
    }
    
    console.log(`✅ All ${expectedViews.length} expected views found`);
    return actualViews;
    
  } catch (error) {
    console.error(`❌ View verification failed: ${error.message}`);
    throw error;
  }
};

/**
 * Verify indexes were created for all tables (including career stats)
 */
const verifyIndexesCreated = async () => {
  console.log('🔍 Verifying indexes were created...');
  
  try {
    const result = await query(`
      SELECT 
        schemaname,
        tablename,
        COUNT(*) as index_count
      FROM pg_indexes 
      WHERE schemaname = 'public'
      GROUP BY schemaname, tablename
      ORDER BY tablename
    `);
    
    const indexCounts = {};
    result.rows.forEach(row => {
      indexCounts[row.tablename] = parseInt(row.index_count);
    });
    
    // Expected minimum index counts (including primary key indexes and career stats indexes)
    const expectedMinIndexes = {
      // Original tables
      'teams': 3,
      'players': 5,
      'games': 6,
      'player_game_stats': 10,
      'player_advanced_stats': 10,
      'team_game_stats': 8,
      'team_advanced_stats': 8,
      // Career statistics tables
      'player_season_totals_regular': 5,
      'player_career_totals_regular': 3,
      'player_season_totals_playoffs': 5,
      'player_career_totals_playoffs': 3,
      'player_season_rankings_regular': 4,
      'player_season_rankings_playoffs': 4
    };
    
    const issues = [];
    Object.entries(expectedMinIndexes).forEach(([table, minCount]) => {
      const actualCount = indexCounts[table] || 0;
      if (actualCount < minCount) {
        issues.push(`${table}: expected at least ${minCount} indexes, found ${actualCount}`);
      }
    });
    
    if (issues.length > 0) {
      throw new Error(`Index verification issues: ${issues.join(', ')}`);
    }
    
    console.log('✅ All tables have adequate indexes');
    
    // Log index summary
    Object.entries(indexCounts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} indexes`);
    });
    
    return indexCounts;
    
  } catch (error) {
    console.error(`❌ Index verification failed: ${error.message}`);
    throw error;
  }
};

/**
 * Verify foreign key constraints exist (including career stats FKs)
 */
const verifyForeignKeys = async () => {
  console.log('🔍 Verifying foreign key constraints...');
  
  try {
    const result = await query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `);
    
    const foreignKeys = result.rows;
    
    // Expected foreign key count (original 12 + career stats 12)
    const expectedFKCount = 24;
    
    if (foreignKeys.length < expectedFKCount) {
      throw new Error(`Expected at least ${expectedFKCount} foreign keys, found ${foreignKeys.length}`);
    }
    
    console.log(`✅ Found ${foreignKeys.length} foreign key constraints`);
    
    // Log foreign key summary
    const fksByTable = {};
    foreignKeys.forEach(fk => {
      if (!fksByTable[fk.table_name]) {
        fksByTable[fk.table_name] = [];
      }
      fksByTable[fk.table_name].push(`${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    Object.entries(fksByTable).forEach(([table, fks]) => {
      console.log(`   ${table}: ${fks.join(', ')}`);
    });
    
    return foreignKeys;
    
  } catch (error) {
    console.error(`❌ Foreign key verification failed: ${error.message}`);
    throw error;
  }
};

/**
 * Test sample queries on the new schema (including career stats)
 */
const testSampleQueries = async () => {
  console.log('🔍 Testing sample queries...');
  
  try {
    // Test basic table access (original tables)
    await query('SELECT COUNT(*) FROM teams');
    await query('SELECT COUNT(*) FROM players');
    await query('SELECT COUNT(*) FROM games');
    await query('SELECT COUNT(*) FROM player_game_stats');
    await query('SELECT COUNT(*) FROM player_advanced_stats');
    await query('SELECT COUNT(*) FROM team_game_stats');
    await query('SELECT COUNT(*) FROM team_advanced_stats');
    
    // Test career statistics tables
    await query('SELECT COUNT(*) FROM player_season_totals_regular');
    await query('SELECT COUNT(*) FROM player_career_totals_regular');
    await query('SELECT COUNT(*) FROM player_season_totals_playoffs');
    await query('SELECT COUNT(*) FROM player_career_totals_playoffs');
    await query('SELECT COUNT(*) FROM player_season_rankings_regular');
    await query('SELECT COUNT(*) FROM player_season_rankings_playoffs');
    
    // Test view access (original views)
    await query('SELECT COUNT(*) FROM player_season_averages');
    await query('SELECT COUNT(*) FROM player_advanced_season_averages');
    await query('SELECT COUNT(*) FROM team_season_totals');
    await query('SELECT COUNT(*) FROM team_advanced_season_totals');
    
    // Test career statistics views
    await query('SELECT COUNT(*) FROM player_career_overview');
    await query('SELECT COUNT(*) FROM player_season_progression');
    
    // Test a complex join query with career stats
    await query(`
      SELECT COUNT(*) 
      FROM players p 
      JOIN teams t ON p.team_id = t.id 
      LEFT JOIN player_career_totals_regular pctr ON p.id = pctr.player_id
      WHERE p.position IS NOT NULL
    `);
    
    console.log('✅ All sample queries executed successfully');
    
  } catch (error) {
    console.error(`❌ Sample query test failed: ${error.message}`);
    throw error;
  }
};

/**
 * Setup the complete database schema (including career statistics)
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
    
    // Run migrations in order (including career stats)
    console.log('📁 Running migrations...');
    await runMigration('001_create_tables.sql');
    await runMigration('002_create_indexes.sql');
    await runMigration('003_create_career_stats_tables.sql');
    
    // Comprehensive verification
    console.log('🔍 Running comprehensive verification...');
    await verifyTablesCreated();
    await verifyViewsCreated();
    await verifyIndexesCreated();
    await verifyForeignKeys();
    await testSampleQueries();
    
    console.log('🎉 Database setup completed successfully!');
    console.log('📊 Schema includes:');
    console.log('   - 13 tables (7 original + 6 career statistics)');
    console.log('   - 6 views (4 original + 2 career statistics)');
    console.log('   - Comprehensive indexes for performance');
    console.log('   - Foreign key constraints for data integrity');
    console.log('   - Career statistics support for player analytics');
    console.log('📊 Ready to load data with: npm run seed');
    console.log('🏆 Ready to load career stats with: python nba_pipeline.py load-career-active');
    
    return true;
    
  } catch (error) {
    console.error('💥 Database setup failed:', error.message);
    console.error('💡 Make sure your database exists and connection settings are correct');
    throw error;
  }
};

/**
 * Clean up database (drop all tables including career stats)
 */
const cleanDatabase = async () => {
  console.log('🧹 Cleaning database...');
  
  try {
    // Drop views first (including career stats views)
    await query(`
      DROP VIEW IF EXISTS player_career_overview CASCADE;
      DROP VIEW IF EXISTS player_season_progression CASCADE;
      DROP VIEW IF EXISTS player_season_averages CASCADE;
      DROP VIEW IF EXISTS player_advanced_season_averages CASCADE;
      DROP VIEW IF EXISTS team_season_totals CASCADE;
      DROP VIEW IF EXISTS team_advanced_season_totals CASCADE;
    `);
    
    // Drop tables in reverse order of dependencies (including career stats)
    const dropOrder = [
      // Career statistics tables (drop first due to FKs)
      'player_season_rankings_playoffs',
      'player_season_rankings_regular',
      'player_career_totals_playoffs',
      'player_career_totals_regular',
      'player_season_totals_playoffs',
      'player_season_totals_regular',
      // Original tables
      'player_game_stats',
      'player_advanced_stats',
      'team_game_stats', 
      'team_advanced_stats',
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

/**
 * Get database status and statistics (including career stats)
 */
const getDatabaseStatus = async () => {
  console.log('📊 Gathering database status...');
  
  try {
    // Table counts
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    // View counts
    const views = await query(`
      SELECT table_name as view_name
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    // Index counts
    const indexes = await query(`
      SELECT COUNT(*) as total_indexes
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    
    // Foreign key counts
    const foreignKeys = await query(`
      SELECT COUNT(*) as total_fks
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
    `);
    
    // Data counts (if tables exist and have data)
    let dataCounts = {};
    const tableNames = tables.rows.map(r => r.table_name);
    
    for (const table of tableNames) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        dataCounts[table] = parseInt(result.rows[0].count);
      } catch (error) {
        dataCounts[table] = 'error';
      }
    }
    
    const status = {
      tables: tables.rows.length,
      views: views.rows.length,
      indexes: parseInt(indexes.rows[0].total_indexes),
      foreignKeys: parseInt(foreignKeys.rows[0].total_fks),
      dataCounts
    };
    
    console.log('Database Status:');
    console.log(`   Tables: ${status.tables} (expected 13 with career stats)`);
    console.log(`   Views: ${status.views} (expected 6 with career stats)`);
    console.log(`   Indexes: ${status.indexes}`);
    console.log(`   Foreign Keys: ${status.foreignKeys} (expected 24 with career stats)`);
    console.log('Data Counts:');
    
    // Group data counts by category
    const originalTables = ['teams', 'players', 'games', 'player_game_stats', 'player_advanced_stats', 'team_game_stats', 'team_advanced_stats'];
    const careerTables = ['player_season_totals_regular', 'player_career_totals_regular', 'player_season_totals_playoffs', 'player_career_totals_playoffs', 'player_season_rankings_regular', 'player_season_rankings_playoffs'];
    
    console.log('  Original Tables:');
    originalTables.forEach(table => {
      if (dataCounts.hasOwnProperty(table)) {
        console.log(`    ${table}: ${dataCounts[table]}`);
      }
    });
    
    console.log('  Career Statistics Tables:');
    careerTables.forEach(table => {
      if (dataCounts.hasOwnProperty(table)) {
        console.log(`    ${table}: ${dataCounts[table]}`);
      }
    });
    
    return status;
    
  } catch (error) {
    console.error('❌ Failed to get database status:', error.message);
    throw error;
  }
};

// Handle command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');
  const clean = args.includes('--clean') || args.includes('-c');
  const status = args.includes('--status') || args.includes('-s');
  
  if (clean) {
    cleanDatabase()
      .then(() => {
        console.log('🎯 Run setup again to recreate tables');
        process.exit(0);
      })
      .catch(() => process.exit(1));
  } else if (status) {
    getDatabaseStatus()
      .then(() => process.exit(0))
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
  cleanDatabase,
  verifyTablesCreated,
  verifyViewsCreated, 
  verifyIndexesCreated,
  verifyForeignKeys,
  testSampleQueries,
  getDatabaseStatus
};