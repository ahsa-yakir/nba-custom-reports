// Database connection configuration
const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'nba_analytics',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  
  // SSL configuration for AWS RDS
  ssl: process.env.NODE_ENV === 'production' || process.env.DB_HOST?.includes('amazonaws.com') 
    ? { rejectUnauthorized: false } 
    : false,
  
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`📊 Query executed in ${duration}ms`);
    return res;
  } catch (error) {
    console.error('❌ Query error:', error);
    throw error;
  }
};

// Helper function to get a client from the pool (for transactions)
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query;
  const originalRelease = client.release;
  
  // Add query logging
  client.query = (...args) => {
    console.log('🔍 Executing query:', args[0]);
    return originalQuery.apply(client, args);
  };
  
  // Add release logging
  client.release = () => {
    console.log('🔓 Client released');
    return originalRelease.apply(client);
  };
  
  return client;
};

module.exports = {
  query,
  getClient,
  pool
};