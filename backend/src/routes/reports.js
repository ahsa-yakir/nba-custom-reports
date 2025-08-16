/**
 * Reports API routes - simplified orchestration layer
 */
const express = require('express');
const router = express.Router();

// Import controllers
const reportController = require('../controllers/reportController');
const dataController = require('../controllers/dataController');
const healthController = require('../controllers/healthController');

// Report generation and validation routes
router.post('/generate', reportController.generateReport);
router.post('/validate', reportController.validateReport);
router.post('/preview', reportController.previewReport);

// Data fetching routes
router.get('/filters/:measure', dataController.getFilterTypes);
router.get('/teams', dataController.getTeams);
router.get('/players', dataController.getPlayers);
router.get('/seasons', dataController.getSeasons);
router.get('/sample/:measure', dataController.getSampleData);
router.get('/overview', dataController.getDataOverview);

// Health and monitoring routes
router.get('/test', healthController.testConnection);
router.get('/health', healthController.checkHealth);
router.get('/stats', healthController.getStats);
router.get('/system', healthController.getSystemInfo);

module.exports = router;