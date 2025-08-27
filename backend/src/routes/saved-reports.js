/**
 * Saved reports management routes
 */
const express = require('express');
const router = express.Router();

const savedReportsController = require('../controllers/savedReportsController');
const { 
  verifyAccessToken, 
  verifyReportOwnership 
} = require('../middleware/authMiddleware');

// All saved report routes require authentication
router.use(verifyAccessToken);

// Recent reports (across all dashboards)
router.get('/recent', savedReportsController.getRecentReports);

// Individual report management
router.get('/:reportId', savedReportsController.getSavedReport);
router.put('/:reportId', savedReportsController.updateSavedReport);
router.delete('/:reportId', savedReportsController.deleteSavedReport);
router.put('/:reportId/favorite', savedReportsController.toggleFavorite);

module.exports = router;