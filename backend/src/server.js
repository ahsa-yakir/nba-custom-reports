// Main Express server for NBA Analytics API
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import and use routes after middleware setup
try {
  const reportsRoutes = require('./routes/reports');
  const careerRoutes = require('./routes/career');  // Added career routes import
  
  app.use('/api/reports', reportsRoutes);
  app.use('/api/career', careerRoutes);  // Added career routes registration
  
  console.log('✅ Routes loaded successfully');
  console.log('  📊 Reports routes: /api/reports/*');
  console.log('  🏀 Career routes: /api/career/*');  // Added career routes log
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  
  // More detailed error logging for debugging
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('💡 Make sure all route files exist:');
    console.error('   - ./routes/reports.js');
    console.error('   - ./routes/career.js');  // Added career route file check
  }
  
  process.exit(1);
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /health',
      'POST /api/reports/generate',
      'GET /api/reports/teams',
      'GET /api/career/player/:playerId',  // Added career endpoints documentation
      'GET /api/career/search'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NBA Analytics API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🏀 Reports API: http://localhost:${PORT}/api/reports`);
  console.log(`👤 Career API: http://localhost:${PORT}/api/career`);  // Added career API endpoint info
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;