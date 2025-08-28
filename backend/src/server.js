/**
 * NBA Analytics Backend Server with Authentication
 * Enhanced with JWT-based auth, dashboards, and saved reports
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import middleware
const { optionalAuth } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  console.log(`[${timestamp}] ${method} ${url} - ${req.ip} - ${userAgent}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes - Load dynamically with error handling
console.log('🚀 Setting up API routes...');

// Import and use routes with error handling
try {
  // Load existing routes
  const reportsRoutes = require('./routes/reports');
  const careerRoutes = require('./routes/career');
  
  // Load new authentication routes
  const authRoutes = require('./routes/auth');
  const dashboardRoutes = require('./routes/dashboards');
  const savedReportsRoutes = require('./routes/saved-reports');
  
  // Register existing routes (with optional auth for backward compatibility)
  app.use('/api/reports', optionalAuth, reportsRoutes);
  app.use('/api/career', careerRoutes);
  
  // Register new authentication routes
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboards', dashboardRoutes);
  app.use('/api/saved-reports', savedReportsRoutes);
  
  console.log('✅ All routes loaded successfully');
  console.log('  📊 Reports routes: /api/reports/* (with optional auth)');
  console.log('  🏀 Career routes: /api/career/*');
  console.log('  🔐 Auth routes: /api/auth/*');
  console.log('  📋 Dashboard routes: /api/dashboards/*');
  console.log('  💾 Saved reports routes: /api/saved-reports/*');
  
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  
  // More detailed error logging for debugging
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('💡 Missing route files. Available routes:');
    
    // Try to load individual routes and show which are missing
    const routes = [
      { path: './routes/reports', name: 'Reports (existing)' },
      { path: './routes/career', name: 'Career (existing)' },
      { path: './routes/auth', name: 'Authentication (new)' },
      { path: './routes/dashboards', name: 'Dashboards (new)' },
      { path: './routes/saved-reports', name: 'Saved Reports (new)' }
    ];
    
    routes.forEach(route => {
      try {
        require(route.path);
        console.error(`   ✅ ${route.name}: ${route.path}.js`);
      } catch (err) {
        console.error(`   ❌ ${route.name}: ${route.path}.js - ${err.message}`);
      }
    });
    
    console.error('\n💡 If authentication files are missing, you may need to:');
    console.error('   1. Create the new authentication route files');
    console.error('   2. Or temporarily comment out the new routes');
    console.error('   3. Run without authentication features first');
  }
  
  // Don't exit - try to continue with available routes
  console.warn('⚠️ Continuing with available routes...');
  
  // Try to load at least the existing routes
  try {
    const reportsRoutes = require('./routes/reports');
    const careerRoutes = require('./routes/career');
    
    app.use('/api/reports', reportsRoutes);
    app.use('/api/career', careerRoutes);
    
    console.log('✅ Existing routes loaded successfully');
    console.log('  📊 Reports routes: /api/reports/*');
    console.log('  🏀 Career routes: /api/career/*');
    
  } catch (existingError) {
    console.error('❌ Failed to load even existing routes:', existingError.message);
    process.exit(1);
  }
}

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    message: `The endpoint ${req.method} ${req.url} does not exist`,
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      health: ['GET /health'],
      existing: [
        'POST /api/reports/generate',
        'POST /api/reports/validate',
        'GET /api/reports/teams',
        'GET /api/reports/players',
        'GET /api/career/player/:playerId',
        'GET /api/career/search'
      ],
      authentication: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/auth/refresh',
        'POST /api/auth/logout',
        'GET /api/auth/profile'
      ],
      dashboards: [
        'GET /api/dashboards',
        'POST /api/dashboards',
        'GET /api/dashboards/:id',
        'PUT /api/dashboards/:id'
      ],
      savedReports: [
        'GET /api/saved-reports/recent',
        'GET /api/saved-reports/:id',
        'PUT /api/saved-reports/:id'
      ]
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('🚨 Unhandled error:', error);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: isDevelopment ? error.message : 'Something went wrong',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n📴 Received ${signal}. Starting graceful shutdown...`);
  
  // Close server
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database connections
    try {
      const db = require('./config/database');
      if (db && db.end) {
        db.end(() => {
          console.log('✅ Database connections closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⏰ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, () => {
  console.log(`
🏀 NBA Analytics Backend Server Started!
📍 Server: http://localhost:${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 CORS Origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}
🔐 JWT Secrets: ${process.env.JWT_ACCESS_SECRET ? 'Configured' : 'Using defaults (change in production!)'}
⏰ Started: ${new Date().toISOString()}

📋 Available Endpoints:
   • Health Check: /health
   • Reports (existing): /api/reports/* 
   • Career (existing): /api/career/*
   • Authentication: /api/auth/*
   • Dashboards: /api/dashboards/*
   • Saved Reports: /api/saved-reports/*
  `);
  
  // Test database connection
  try {
    const db = require('./config/database');
    db.query('SELECT NOW() as server_time', (err, result) => {
      if (err) {
        console.error('❌ Database connection test failed:', err.message);
      } else {
        console.log('✅ Database connection successful');
        console.log(`   Server time: ${result.rows[0].server_time}`);
      }
    });
  } catch (error) {
    console.error('⚠️ Database module not found or misconfigured');
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;