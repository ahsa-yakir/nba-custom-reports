// Database setup script - creates tables and indexes
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

/**
 * Reads and executes SQL migration files
 */
const runMigration = async (filename) => {
  console.log(`🔄 Running migration: ${filename}`);
  
  try {
    const migrationPath = path.join(__dirname, '../../migrations', filename);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await query(sql);
    console.log(`✅ Migration completed: ${filename}`);
    
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`, error);
    throw error;
  }
};

/**
 * Setup the complete database schema
 */
const setupDatabase = async () => {
  console.log('🚀 Starting database setup...');
  
  try {
    // Run migrations in order
    await runMigration('001_create_tables.sql');
    await runMigration('002_create_indexes.sql');
    
    console.log('🎉 Database setup completed successfully!');
    console.log('📊 Ready to load data with: npm run seed');
    
  } catch (error) {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { setupDatabase, runMigration };