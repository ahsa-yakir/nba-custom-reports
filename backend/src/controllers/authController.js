/**
 * Authentication controller for user registration, login, and token management
 * Implements secure JWT-based authentication with refresh tokens
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = require('../middleware/authMiddleware');

// Token configuration
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const BCRYPT_ROUNDS = 12;

/**
 * Generate access and refresh token pair
 */
const generateTokens = async (userId, sessionInfo = {}) => {
  // Generate access token (short-lived)
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  // Generate refresh token (longer-lived)
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  // Hash refresh token for storage
  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // Store refresh token session in database
  await query(`
    INSERT INTO user_sessions (
      user_id, refresh_token_hash, device_info, ip_address, user_agent, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    userId,
    refreshTokenHash,
    JSON.stringify(sessionInfo.deviceInfo || {}),
    sessionInfo.ipAddress,
    sessionInfo.userAgent,
    expiresAt
  ]);

  return { accessToken, refreshToken };
};

/**
 * User registration
 */
const register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Username, email, and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password too short',
        message: 'Password must be at least 8 characters long'
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        error: 'Username too short',
        message: 'Username must be at least 3 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username.toLowerCase(), email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'Username or email is already taken'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const newUser = await query(`
      INSERT INTO users (username, email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, first_name, last_name, created_at
    `, [
      username.toLowerCase(),
      email.toLowerCase(),
      passwordHash,
      firstName || null,
      lastName || null
    ]);

    const user = newUser.rows[0];

    // Create default dashboard for new user
    await query(`
      INSERT INTO dashboards (user_id, name, description, is_default)
      VALUES ($1, $2, $3, $4)
    `, [
      user.id,
      'My NBA Analytics',
      'Default dashboard for NBA statistical analysis',
      true
    ]);

    // Generate tokens
    const sessionInfo = {
      deviceInfo: { type: 'web', browser: req.headers['user-agent'] },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    const { accessToken, refreshToken } = await generateTokens(user.id, sessionInfo);

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    console.log(`New user registered: ${user.username} (${user.id})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error during registration'
    });
  }
};

/**
 * User login
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Username and password are required'
      });
    }

    // Find user (allow login with username or email)
    const userResult = await query(`
      SELECT id, username, email, password_hash, first_name, last_name, is_active, last_login
      FROM users 
      WHERE (username = $1 OR email = $1) AND is_active = true
    `, [username.toLowerCase()]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }

    // Generate tokens
    const sessionInfo = {
      deviceInfo: { type: 'web', browser: req.headers['user-agent'] },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    const { accessToken, refreshToken } = await generateTokens(user.id, sessionInfo);

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    console.log(`User logged in: ${user.username} (${user.id})`);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        lastLogin: user.last_login
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error during login'
    });
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshToken = async (req, res) => {
  try {
    // User and session info added by verifyRefreshToken middleware
    const { user, session } = req;

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: user.id, type: 'access' },
      JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Update session last used time
    await query(
      'UPDATE user_sessions SET last_used_at = NOW() WHERE id = $1',
      [session.id]
    );

    console.log(`Token refreshed for user: ${user.username} (${user.id})`);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      tokens: {
        accessToken,
        expiresIn: ACCESS_TOKEN_EXPIRY
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'Internal server error during token refresh'
    });
  }
};

/**
 * Logout from current device
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user.id;

    if (refreshToken) {
      // Hash the refresh token to find the session
      const refreshTokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      // Deactivate specific session
      await query(`
        UPDATE user_sessions 
        SET is_active = false 
        WHERE user_id = $1 AND refresh_token_hash = $2
      `, [userId, refreshTokenHash]);
    }

    console.log(`User logged out: ${req.user.username} (${userId})`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error during logout'
    });
  }
};

/**
 * Logout from all devices
 */
const logoutAll = async (req, res) => {
  try {
    const userId = req.user.id;

    // Deactivate all sessions for the user
    await query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
      [userId]
    );

    console.log(`User logged out from all devices: ${req.user.username} (${userId})`);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error during logout'
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await query(`
      SELECT 
        u.id, u.username, u.email, u.first_name, u.last_name, 
        u.is_active, u.email_verified, u.last_login, u.created_at,
        COUNT(d.id) as dashboard_count,
        COUNT(sr.id) as report_count
      FROM users u
      LEFT JOIN dashboards d ON u.id = d.user_id
      LEFT JOIN saved_reports sr ON u.id = sr.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, 
               u.is_active, u.email_verified, u.last_login, u.created_at
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        stats: {
          dashboardCount: parseInt(user.dashboard_count),
          reportCount: parseInt(user.report_count)
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'Internal server error while fetching profile'
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email } = req.body;

    // Basic validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingEmail = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email.toLowerCase(), userId]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(409).json({
          error: 'Email already exists',
          message: 'Email is already in use by another account'
        });
      }
    }

    // Update user profile
    const updateResult = await query(`
      UPDATE users 
      SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, username, email, first_name, last_name, updated_at
    `, [firstName, lastName, email?.toLowerCase(), userId]);

    const updatedUser = updateResult.rows[0];

    console.log(`Profile updated for user: ${updatedUser.username} (${userId})`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        updatedAt: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'Internal server error while updating profile'
    });
  }
};

/**
 * Get user sessions (active devices)
 */
const getSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await query(`
      SELECT 
        id, device_info, ip_address, user_agent, 
        is_active, expires_at, created_at, last_used_at
      FROM user_sessions 
      WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
      ORDER BY last_used_at DESC
    `, [userId]);

    res.json({
      success: true,
      sessions: sessions.rows.map(session => ({
        id: session.id,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        isActive: session.is_active,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        lastUsedAt: session.last_used_at
      }))
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Failed to get sessions',
      message: 'Internal server error while fetching sessions'
    });
  }
};

/**
 * Revoke a specific session
 */
const revokeSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    await query(`
      UPDATE user_sessions 
      SET is_active = false 
      WHERE id = $1 AND user_id = $2
    `, [sessionId, userId]);

    console.log(`Session revoked: ${sessionId} for user ${req.user.username}`);

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });

  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      error: 'Failed to revoke session',
      message: 'Internal server error while revoking session'
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getProfile,
  updateProfile,
  getSessions,
  revokeSession
};