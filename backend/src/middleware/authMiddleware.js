/**
 * Authentication middleware for JWT-based authentication
 * Follows security best practices for token validation
 */
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// JWT configuration from environment
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'nba-analytics-access-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'nba-analytics-refresh-secret-key-change-in-production';

/**
 * Middleware to verify JWT access tokens
 * Checks Authorization header and validates token
 */
const verifyAccessToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'No token provided' 
      });
    }

    // Extract token from Bearer format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ 
        error: 'Invalid token format', 
        message: 'Token must be in Bearer format' 
      });
    }

    const token = parts[1];
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    
    // Check if user still exists and is active
    const userResult = await query(
      'SELECT id, username, email, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid token', 
        message: 'User not found' 
      });
    }
    
    const user = userResult.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account deactivated', 
        message: 'User account is not active' 
      });
    }
    
    // Add user info to request object
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isActive: user.is_active
    };
    
    // Add token info for logging
    req.tokenInfo = {
      type: 'access',
      issued: new Date(decoded.iat * 1000),
      expires: new Date(decoded.exp * 1000)
    };
    
    next();
    
  } catch (error) {
    console.error('Token verification failed:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired', 
        message: 'Access token has expired',
        expired: true 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token', 
        message: 'Token is malformed or invalid' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Authentication failed', 
      message: 'Internal server error during authentication' 
    });
  }
};

/**
 * Middleware to verify JWT refresh tokens
 * Used for token refresh endpoint
 */
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        error: 'Refresh token required', 
        message: 'No refresh token provided' 
      });
    }
    
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    // Check if session exists and is active
    const sessionResult = await query(`
      SELECT s.*, u.id as user_id, u.username, u.email, u.is_active 
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = $1 AND s.is_active = true AND s.expires_at > NOW()
    `, [decoded.userId]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid refresh token', 
        message: 'Session not found or expired' 
      });
    }
    
    const session = sessionResult.rows[0];
    
    if (!session.is_active) {
      return res.status(401).json({ 
        error: 'Account deactivated', 
        message: 'User account is not active' 
      });
    }
    
    // Add user and session info to request
    req.user = {
      id: session.user_id,
      username: session.username,
      email: session.email,
      isActive: session.is_active
    };
    
    req.session = {
      id: session.id,
      deviceInfo: session.device_info,
      ipAddress: session.ip_address,
      userAgent: session.user_agent
    };
    
    next();
    
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Refresh token expired', 
        message: 'Please log in again',
        expired: true 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid refresh token', 
        message: 'Token is malformed or invalid' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Token refresh failed', 
      message: 'Internal server error during token refresh' 
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user info if token is present but doesn't fail if missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      // No token provided, continue without auth
      req.user = null;
      return next();
    }

    // Try to verify token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      req.user = null;
      return next();
    }

    const token = parts[1];
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    
    // Get user info if token is valid
    const userResult = await query(
      'SELECT id, username, email, is_active FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );
    
    if (userResult.rows.length > 0) {
      req.user = {
        id: userResult.rows[0].id,
        username: userResult.rows[0].username,
        email: userResult.rows[0].email,
        isActive: userResult.rows[0].is_active
      };
    } else {
      req.user = null;
    }
    
    next();
    
  } catch (error) {
    // On any error, continue without authentication
    req.user = null;
    next();
  }
};

/**
 * Middleware to check if user owns a dashboard
 */
const verifyDashboardOwnership = async (req, res, next) => {
  try {
    const dashboardId = req.params.dashboardId || req.body.dashboardId;
    const userId = req.user.id;
    
    if (!dashboardId) {
      return res.status(400).json({ 
        error: 'Dashboard ID required', 
        message: 'Dashboard ID must be provided' 
      });
    }
    
    const result = await query(
      'SELECT id, name FROM dashboards WHERE id = $1 AND user_id = $2',
      [dashboardId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Dashboard not found or you do not have access' 
      });
    }
    
    req.dashboard = result.rows[0];
    next();
    
  } catch (error) {
    console.error('Dashboard ownership verification failed:', error);
    return res.status(500).json({ 
      error: 'Authorization failed', 
      message: 'Error verifying dashboard ownership' 
    });
  }
};

/**
 * Middleware to check if user owns a saved report
 */
const verifyReportOwnership = async (req, res, next) => {
  try {
    const reportId = req.params.reportId || req.body.reportId;
    const userId = req.user.id;
    
    if (!reportId) {
      return res.status(400).json({ 
        error: 'Report ID required', 
        message: 'Report ID must be provided' 
      });
    }
    
    const result = await query(`
      SELECT sr.id, sr.name, sr.dashboard_id, d.name as dashboard_name
      FROM saved_reports sr
      JOIN dashboards d ON sr.dashboard_id = d.id
      WHERE sr.id = $1 AND sr.user_id = $2
    `, [reportId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Report not found or you do not have access' 
      });
    }
    
    req.savedReport = result.rows[0];
    next();
    
  } catch (error) {
    console.error('Report ownership verification failed:', error);
    return res.status(500).json({ 
      error: 'Authorization failed', 
      message: 'Error verifying report ownership' 
    });
  }
};

/**
 * Rate limiting middleware for auth endpoints
 */
const authRateLimit = () => {
  const attempts = new Map();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 5; // Max attempts per window

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean old entries
    for (const [k, v] of attempts) {
      if (now - v.firstAttempt > WINDOW_MS) {
        attempts.delete(k);
      }
    }
    
    const userAttempts = attempts.get(key) || { count: 0, firstAttempt: now };
    
    if (now - userAttempts.firstAttempt > WINDOW_MS) {
      // Reset window
      userAttempts.count = 0;
      userAttempts.firstAttempt = now;
    }
    
    if (userAttempts.count >= MAX_ATTEMPTS) {
      return res.status(429).json({ 
        error: 'Too many attempts', 
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: Math.ceil((WINDOW_MS - (now - userAttempts.firstAttempt)) / 1000)
      });
    }
    
    // Increment attempts on POST requests (login/register)
    if (req.method === 'POST') {
      userAttempts.count++;
      attempts.set(key, userAttempts);
    }
    
    next();
  };
};

module.exports = {
  verifyAccessToken,
  verifyRefreshToken,
  optionalAuth,
  verifyDashboardOwnership,
  verifyReportOwnership,
  authRateLimit,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET
};