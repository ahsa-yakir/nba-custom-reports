/**
 * Career data API routes
 * Create this file at: backend/routes/career.js
 */
const express = require('express');
const router = express.Router();
const careerController = require('../controllers/careerController');

// Get complete career data for a player
router.get('/player/:playerId', careerController.getPlayerCareerData);

// Search players by name (helper endpoint)
router.get('/search', careerController.getPlayersByName);

module.exports = router;