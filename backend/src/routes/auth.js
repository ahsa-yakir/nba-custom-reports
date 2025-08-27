/**
 * Authentication routes
 */
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { 
  verifyAccessToken, 
  verifyRefreshToken, 
  authRateLimit 
} = require('../middleware/authMiddleware');

// Apply rate limiting to auth endpoints
router.use(authRateLimit());

// Public routes (no authentication required)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', verifyRefreshToken, authController.refreshToken);

// Protected routes (require authentication)
router.post('/logout', verifyAccessToken, authController.logout);
router.post('/logout-all', verifyAccessToken, authController.logoutAll);
router.get('/profile', verifyAccessToken, authController.getProfile);
router.put('/profile', verifyAccessToken, authController.updateProfile);
router.get('/sessions', verifyAccessToken, authController.getSessions);
router.delete('/sessions/:sessionId', verifyAccessToken, authController.revokeSession);

module.exports = router;