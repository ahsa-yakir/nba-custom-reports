// Database setup script - creates tables and indexes including career statistics and authentication
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
 * Verify all expected tables exist (including career stats and auth tables)
 */
const verifyTablesCreated = async () => {
  console.log('🔍 Verifying all tables were created...');
  
  const expectedTables = [
    // Core NBA tables
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
    'player_season_rankings_playoffs',
    // Authentication tables
    'users',
    'user_sessions',
    'dashboards',
    'saved_reports',
    'report_shares'
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
 * Verify all expected views exist (including career stats and auth views)
 */
const verifyViewsCreated = async () => {
  console.log('🔍 Verifying all views were created...');
  
  const expectedViews = [
    // NBA statistics views
    'player_season_averages',
    'player_advanced_season_averages',
    'team_season_totals',
    'team_advanced_season_totals',
    // Career statistics views
    'player_career_overview',
    'player_season_progression',
    // Authentication views
    'user_profiles',
    'dashboard_summary',
    'recent_reports'
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
 * Verify indexes were created for all tables (including career stats and auth)
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
    
    // Expected minimum index counts (including primary key indexes, career stats, and auth indexes)
    const expectedMinIndexes = {
      // Core NBA tables
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
      'player_season_rankings_playoffs': 4,
      // Authentication tables
      'users': 4,
      'user_sessions': 6,
      'dashboards': 4,
      'saved_reports': 8,
      'report_shares': 6
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
 * Verify foreign key constraints exist (including career stats and auth FKs)
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
    
    // Expected foreign key count (original 13 + career stats 10 + auth 7)
    const expectedFKCount = 30;
    
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
 * Verify triggers and functions exist (for auth tables)
 */
const verifyTriggersAndFunctions = async () => {
  console.log('🔍 Verifying triggers and functions...');
  
  try {
    // Check for the update timestamp function
    const functionResult = await query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'update_updated_at_column'
    `);
    
    if (functionResult.rows.length === 0) {
      throw new Error('Missing update_updated_at_column function');
    }
    
    // Check for triggers
    const triggerResult = await query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      AND trigger_name LIKE '%updated_at%'
      ORDER BY event_object_table
    `);
    
    const expectedTriggers = ['users', 'user_sessions', 'dashboards', 'saved_reports'];
    const actualTriggerTables = triggerResult.rows.map(row => row.event_object_table);
    const missingTriggers = expectedTriggers.filter(table => !actualTriggerTables.includes(table));
    
    if (missingTriggers.length > 0) {
      throw new Error(`Missing triggers for tables: ${missingTriggers.join(', ')}`);
    }
    
    console.log(`✅ Found update_updated_at_column function and ${triggerResult.rows.length} triggers`);
    
    return { function: functionResult.rows, triggers: triggerResult.rows };
    
  } catch (error) {
    console.error(`❌ Trigger/function verification failed: ${error.message}`);
    throw error;
  }
};

/**
 * Verify game numbering columns and their indexes exist
 */
const verifyGameNumberingColumns = async () => {
  console.log('🔍 Verifying game numbering columns and indexes...');
  
  try {
    // Check for game numbering columns in games table
    const columnResult = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'games'
      AND column_name IN (
        'home_team_game_number',
        'away_team_game_number', 
        'home_team_game_type_number',
        'away_team_game_type_number'
      )
      ORDER BY column_name
    `);
    
    const expectedColumns = [
      'away_team_game_number',
      'away_team_game_type_number',
      'home_team_game_number',
      'home_team_game_type_number'
    ];
    
    const actualColumns = columnResult.rows.map(row => row.column_name);
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing game numbering columns: ${missingColumns.join(', ')}`);
    }
    
    // Verify all columns are INTEGER type
    const wrongTypes = columnResult.rows.filter(row => row.data_type !== 'integer');
    if (wrongTypes.length > 0) {
      throw new Error(`Game numbering columns have wrong data types: ${wrongTypes.map(row => `${row.column_name}:${row.data_type}`).join(', ')}`);
    }
    
    // Check for specific game numbering indexes
    const indexResult = await query(`
      SELECT indexname
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'games'
      AND indexname IN (
        'idx_games_home_team_game_number',
        'idx_games_away_team_game_number',
        'idx_games_home_team_game_type_number', 
        'idx_games_away_team_game_type_number',
        'idx_games_home_team_season_game_num',
        'idx_games_away_team_season_game_num',
        'idx_games_home_team_type_game_num',
        'idx_games_away_team_type_game_num'
      )
      ORDER BY indexname
    `);
    
    const expectedIndexes = [
      'idx_games_away_team_game_number',
      'idx_games_away_team_game_type_number',
      'idx_games_away_team_season_game_num',
      'idx_games_away_team_type_game_num',
      'idx_games_home_team_game_number',
      'idx_games_home_team_game_type_number',
      'idx_games_home_team_season_game_num',
      'idx_games_home_team_type_game_num'
    ];
    
    const actualIndexes = indexResult.rows.map(row => row.indexname);
    const missingIndexes = expectedIndexes.filter(idx => !actualIndexes.includes(idx));
    
    if (missingIndexes.length > 0) {
      console.log(`⚠️  Missing some game numbering indexes: ${missingIndexes.join(', ')}`);
      console.log('   This may affect performance but won\'t break functionality');
    }
    
    console.log(`✅ Found all ${expectedColumns.length} game numbering columns and ${actualIndexes.length}/${expectedIndexes.length} specialized indexes`);
    
    return { columns: columnResult.rows, indexes: indexResult.rows };
    
  } catch (error) {
    console.error(`❌ Game numbering verification failed: ${error.message}`);
    throw error;
  }
};

/**
 * Test sample queries on the new schema (including career stats and auth)
 */
const testSampleQueries = async () => {
  console.log('🔍 Testing sample queries...');
  
  try {
    // Test core NBA tables
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
    
    // Test authentication tables
    await query('SELECT COUNT(*) FROM users');
    await query('SELECT COUNT(*) FROM user_sessions');
    await query('SELECT COUNT(*) FROM dashboards');
    await query('SELECT COUNT(*) FROM saved_reports');
    await query('SELECT COUNT(*) FROM report_shares');
    
    // Test NBA statistics views
    await query('SELECT COUNT(*) FROM player_season_averages');
    await query('SELECT COUNT(*) FROM player_advanced_season_averages');
    await query('SELECT COUNT(*) FROM team_season_totals');
    await query('SELECT COUNT(*) FROM team_advanced_season_totals');
    
    // Test career statistics views
    await query('SELECT COUNT(*) FROM player_career_overview');
    await query('SELECT COUNT(*) FROM player_season_progression');
    
    // Test authentication views
    await query('SELECT COUNT(*) FROM user_profiles');
    await query('SELECT COUNT(*) FROM dashboard_summary');
    await query('SELECT COUNT(*) FROM recent_reports');
    
    // Test complex join queries
    await query(`
      SELECT COUNT(*) 
      FROM players p 
      JOIN teams t ON p.team_id = t.id 
      LEFT JOIN player_career_totals_regular pctr ON p.id = pctr.player_id
      WHERE p.position IS NOT NULL
    `);
    
    await query(`
      SELECT COUNT(*)
      FROM users u
      LEFT JOIN dashboards d ON u.id = d.user_id
      LEFT JOIN saved_reports sr ON d.id = sr.dashboard_id
      WHERE u.is_active = TRUE
    `);
    
    // Test game numbering columns specifically
    await query(`
      SELECT COUNT(*) 
      FROM games g 
      WHERE g.home_team_game_number IS NOT NULL 
      OR g.away_team_game_number IS NOT NULL
      OR g.home_team_game_type_number IS NOT NULL  
      OR g.away_team_game_type_number IS NOT NULL
    `);
    
    // Test game numbering column queries (even with empty data)
    await query(`
      SELECT g.id, g.home_team_game_number, g.away_team_game_number
      FROM games g 
      WHERE g.season = '2023-24'
      ORDER BY g.home_team_game_number DESC
      LIMIT 1
    `);
    
    console.log('✅ All sample queries executed successfully');
    
  } catch (error) {
    console.error(`❌ Sample query test failed: ${error.message}`);
    throw error;
  }
};

/**
 * Setup the complete database schema (including career statistics and authentication)
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
    console.log('📁 Running migrations...');
    await runMigration('001_create_tables.sql');
    await runMigration('002_create_indexes.sql');
    await runMigration('003_create_career_stats_tables.sql');
    await runMigration('004_create_auth_tables.sql');
    
    // Comprehensive verification
    console.log('🔍 Running comprehensive verification...');
    await verifyTablesCreated();
    await verifyViewsCreated();
    await verifyIndexesCreated();
    await verifyForeignKeys();
    await verifyTriggersAndFunctions();
    await verifyGameNumberingColumns();
    await testSampleQueries();
    
    console.log('🎉 Database setup completed successfully!');
    console.log('📊 Schema includes:');
    console.log('   - 18 tables (7 NBA core + 6 career statistics + 5 authentication)');
    console.log('   - 9 views (4 NBA + 2 career statistics + 3 authentication)');
    console.log('   - Comprehensive indexes for performance');
    console.log('   - Foreign key constraints for data integrity');
    console.log('   - Triggers and functions for auto-timestamps');
    console.log('   - Career statistics support for player analytics');
    console.log('   - User authentication and dashboard management');
    console.log('📊 Ready to load data with: npm run seed');
    console.log('🏆 Ready to load career stats with: python nba_pipeline.py load-career-active');
    console.log('👤 Sample users created (demo_user, admin_user) with password: password123');
    
    return true;
    
  } catch (error) {
    console.error('💥 Database setup failed:', error.message);
    console.error('💡 Make sure your database exists and connection settings are correct');
    throw error;
  }
};

/**
 * Clean up database (drop all tables including career stats and auth)
 */
const cleanDatabase = async () => {
  console.log('🧹 Cleaning database...');
  
  try {
    // Drop views first with more aggressive CASCADE and error handling
    const viewsToRemove = [
      'user_profiles',
      'dashboard_summary', 
      'recent_reports',
      'player_career_overview',
      'player_season_progression',
      'player_season_averages',
      'player_advanced_season_averages',
      'team_season_totals',
      'team_advanced_season_totals'
    ];
    
    for (const view of viewsToRemove) {
      try {
        await query(`DROP VIEW IF EXISTS ${view} CASCADE`);
        console.log(`   Dropped view: ${view}`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop view ${view}: ${error.message}`);
        // Try to drop with more aggressive options
        try {
          await query(`DROP VIEW ${view} CASCADE`);
          console.log(`   Forced drop of view: ${view}`);
        } catch (retryError) {
          console.log(`   ⚠️  Failed to force drop view ${view}, continuing...`);
        }
      }
    }
    
    // Drop functions and triggers with error handling
    try {
      await query(`DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`);
      console.log(`   Dropped function: update_updated_at_column`);
    } catch (error) {
      console.log(`   ⚠️  Could not drop function: ${error.message}`);
    }
    
    // Drop tables in reverse order of dependencies with individual error handling
    const dropOrder = [
      // Authentication tables (drop first due to FKs)
      'report_shares',
      'saved_reports',
      'dashboards',
      'user_sessions',
      'users',
      // Career statistics tables
      'player_season_rankings_playoffs',
      'player_season_rankings_regular',
      'player_career_totals_playoffs',
      'player_career_totals_regular',
      'player_season_totals_playoffs',
      'player_season_totals_regular',
      // NBA core tables
      'player_advanced_stats',
      'player_game_stats',
      'team_advanced_stats',
      'team_game_stats', 
      'games',
      'players',
      'teams'
    ];
    
    for (const table of dropOrder) {
      try {
        await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`   Dropped table: ${table}`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop table ${table}: ${error.message}`);
        // Try to force drop without IF EXISTS
        try {
          await query(`DROP TABLE ${table} CASCADE`);
          console.log(`   Forced drop of table: ${table}`);
        } catch (retryError) {
          console.log(`   ⚠️  Failed to force drop table ${table}, continuing...`);
        }
      }
    }
    
    console.log('✅ Database cleanup completed (some objects may have had permission issues)');
    console.log('💡 If you encountered permission errors, consider running as a database superuser');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
    console.error('💡 Try running as a superuser (postgres) or grant ownership of database objects to your user');
    throw error;
  }
};

/**
 * Get database status and statistics (including career stats and auth)
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
    
    // Function counts
    const functions = await query(`
      SELECT COUNT(*) as total_functions
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
    `);
    
    // Trigger counts
    const triggers = await query(`
      SELECT COUNT(*) as total_triggers
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
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
      functions: parseInt(functions.rows[0].total_functions),
      triggers: parseInt(triggers.rows[0].total_triggers),
      dataCounts
    };
    
    console.log('Database Status:');
    console.log(`   Tables: ${status.tables} (expected 18 with career stats and auth)`);
    console.log(`   Views: ${status.views} (expected 9 with career stats and auth)`);
    console.log(`   Indexes: ${status.indexes}`);
    console.log(`   Foreign Keys: ${status.foreignKeys} (expected 32 with career stats and auth)`);
    console.log(`   Functions: ${status.functions} (expected 1 for timestamps)`);
    console.log(`   Triggers: ${status.triggers} (expected 4 for auth tables)`);
    console.log('Data Counts:');
    
    // Group data counts by category
    const coreTables = ['teams', 'players', 'games', 'player_game_stats', 'player_advanced_stats', 'team_game_stats', 'team_advanced_stats'];
    const careerTables = ['player_season_totals_regular', 'player_career_totals_regular', 'player_season_totals_playoffs', 'player_career_totals_playoffs', 'player_season_rankings_regular', 'player_season_rankings_playoffs'];
    const authTables = ['users', 'user_sessions', 'dashboards', 'saved_reports', 'report_shares'];
    
    console.log('  Core NBA Tables:');
    coreTables.forEach(table => {
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
    
    console.log('  Authentication Tables:');
    authTables.forEach(table => {
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
  verifyTriggersAndFunctions,
  verifyGameNumberingColumns,
  testSampleQueries,
  getDatabaseStatus
};