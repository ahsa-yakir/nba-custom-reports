/**
 * Enhanced Reports API routes with organizer and unified query support
 */
const express = require('express');
const router = express.Router();

// Import controllers
const reportController = require('../controllers/reportController');
const dataController = require('../controllers/dataController');
const healthController = require('../controllers/healthController');

// Enhanced report generation and validation routes
router.post('/generate', reportController.generateReport);
router.post('/validate', reportController.validateReport);
router.post('/preview', reportController.previewReport);
router.post('/query-info', reportController.getQueryInfo);

// Data fetching routes (updated with organizer support)
router.get('/filters/:measure', dataController.getFilterTypes);
router.get('/organizers', dataController.getOrganizerTypes); // New endpoint for organizer types
router.get('/teams', dataController.getTeams);
router.get('/players', dataController.getPlayers);
router.get('/seasons', dataController.getSeasons);
router.get('/sample/:measure', dataController.getSampleData); // Updated to support organizer parameter
router.get('/overview', dataController.getDataOverview); // Updated with organizer statistics

// Health and monitoring routes (unchanged)
router.get('/test', healthController.testConnection);
router.get('/health', healthController.checkHealth);
router.get('/stats', healthController.getStats);
router.get('/system', healthController.getSystemInfo);

module.exports = router;