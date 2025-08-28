/**
 * Dashboard management routes
 */
const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const savedReportsController = require('../controllers/savedReportsController');
const { 
  verifyAccessToken, 
  verifyDashboardOwnership 
} = require('../middleware/authMiddleware');

// All dashboard routes require authentication
router.use(verifyAccessToken);

// Dashboard management routes
router.get('/', dashboardController.getDashboards);
router.post('/', dashboardController.createDashboard);
router.get('/:dashboardId', dashboardController.getDashboard);
router.put('/:dashboardId', dashboardController.updateDashboard);
router.delete('/:dashboardId', dashboardController.deleteDashboard);
router.put('/:dashboardId/default', dashboardController.setDefaultDashboard);

// Saved reports routes
router.get('/:dashboardId/reports', savedReportsController.getReportsForDashboard);
router.post('/:dashboardId/reports', savedReportsController.saveReport);

module.exports = router;