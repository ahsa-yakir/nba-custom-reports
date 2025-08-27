/**
 * Saved Reports controller for managing user's saved NBA reports
 */
const { query } = require('../config/database');
const { buildReportQuery, executeQuery: runQuery } = require('./reportController');

/**
 * Get saved reports for a dashboard
 */
const getReportsForDashboard = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const userId = req.user.id;

    // Verify dashboard ownership
    const dashboardCheck = await query(
      'SELECT id, name FROM dashboards WHERE id = $1 AND user_id = $2',
      [dashboardId, userId]
    );

    if (dashboardCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Dashboard not found',
        message: 'Dashboard not found or you do not have access'
      });
    }

    // Get reports
    const reports = await query(`
      SELECT 
        id, name, description, measure, filters, sort_config, view_type,
        is_favorite, view_count, last_viewed_at, created_at, updated_at,
        (cache_expires_at IS NOT NULL AND cache_expires_at > NOW()) as has_cached_data,
        (cached_results IS NOT NULL) as has_results_cached
      FROM saved_reports
      WHERE dashboard_id = $1
      ORDER BY is_favorite DESC, last_viewed_at DESC NULLS LAST, created_at DESC
    `, [dashboardId]);

    res.json({
      success: true,
      dashboardId,
      dashboardName: dashboardCheck.rows[0].name,
      reports: reports.rows.map(report => ({
        id: report.id,
        name: report.name,
        description: report.description,
        measure: report.measure,
        filters: report.filters,
        sortConfig: report.sort_config,
        viewType: report.view_type,
        isFavorite: report.is_favorite,
        viewCount: report.view_count,
        lastViewedAt: report.last_viewed_at,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
        hasCachedData: report.has_cached_data,
        hasResultsCached: report.has_results_cached
      }))
    });

  } catch (error) {
    console.error('Get reports for dashboard error:', error);
    res.status(500).json({
      error: 'Failed to get reports',
      message: 'Internal server error while fetching reports'
    });
  }
};

/**
 * Save a new report to dashboard
 */
const saveReport = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const userId = req.user.id;
    const { 
      name, 
      description, 
      measure, 
      filters, 
      sortConfig, 
      viewType = 'traditional',
      cacheResults = true 
    } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Report name required',
        message: 'Report name cannot be empty'
      });
    }

    if (!measure || !['Players', 'Teams'].includes(measure)) {
      return res.status(400).json({
        error: 'Invalid measure',
        message: 'Measure must be either "Players" or "Teams"'
      });
    }

    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      return res.status(400).json({
        error: 'Filters required',
        message: 'At least one filter is required'
      });
    }

    // Verify dashboard ownership
    const dashboardCheck = await query(
      'SELECT id, name FROM dashboards WHERE id = $1 AND user_id = $2',
      [dashboardId, userId]
    );

    if (dashboardCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Dashboard not found',
        message: 'Dashboard not found or you do not have access'
      });
    }

    // Check for duplicate report name in dashboard
    const existingReport = await query(
      'SELECT id FROM saved_reports WHERE dashboard_id = $1 AND name = $2',
      [dashboardId, name.trim()]
    );

    if (existingReport.rows.length > 0) {
      return res.status(409).json({
        error: 'Report name exists',
        message: 'A report with this name already exists in this dashboard'
      });
    }

    let cachedResults = null;
    let cachedMetadata = null;
    let cacheExpiresAt = null;

    // Generate and cache results if requested
    if (cacheResults) {
      try {
        console.log(`Generating report data for caching: ${name}`);
        
        // Use the existing report generation logic
        const reportConfig = {
          measure,
          filters: filters.map(filter => ({
            type: filter.type,
            operator: filter.operator,
            value: filter.value,
            value2: filter.value2,
            values: filter.values
          })),
          sortConfig: sortConfig || { column: null, direction: 'desc' },
          viewType: 'unified' // Always use unified for caching
        };

        // Import the report generation logic
        const reportController = require('./reportController');
        
        // Create a mock request/response for internal use
        const mockReq = { body: reportConfig };
        const mockRes = {
          json: (data) => data,
          status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
        };

        // Generate the report data
        const reportResult = await new Promise((resolve, reject) => {
          const originalJson = mockRes.json;
          mockRes.json = (data) => resolve(data);
          
          reportController.generateReport(mockReq, mockRes).catch(reject);
        });

        if (reportResult.success && reportResult.results) {
          cachedResults = reportResult.results;
          cachedMetadata = {
            count: reportResult.count,
            queryMetadata: reportResult.queryMetadata,
            generatedAt: new Date().toISOString()
          };
          
          // Cache expires in 1 hour
          cacheExpiresAt = new Date();
          cacheExpiresAt.setHours(cacheExpiresAt.getHours() + 1);
          
          console.log(`Report data cached: ${reportResult.count} results`);
        }
      } catch (cacheError) {
        console.warn('Failed to cache report results:', cacheError.message);
        // Continue without caching - it's not critical
      }
    }

    // Save the report
    const savedReport = await query(`
      INSERT INTO saved_reports (
        dashboard_id, user_id, name, description, measure, filters, 
        sort_config, view_type, cached_results, cached_metadata, cache_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, name, description, measure, view_type, created_at
    `, [
      dashboardId,
      userId,
      name.trim(),
      description?.trim(),
      measure,
      JSON.stringify(filters),
      JSON.stringify(sortConfig || { column: null, direction: 'desc' }),
      viewType,
      cachedResults ? JSON.stringify(cachedResults) : null,
      cachedMetadata ? JSON.stringify(cachedMetadata) : null,
      cacheExpiresAt
    ]);

    const report = savedReport.rows[0];

    console.log(`Report saved: ${report.name} to dashboard ${dashboardCheck.rows[0].name} by user ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Report saved successfully',
      report: {
        id: report.id,
        name: report.name,
        description: report.description,
        measure: report.measure,
        viewType: report.view_type,
        createdAt: report.created_at,
        hasCachedData: cachedResults !== null
      }
    });

  } catch (error) {
    console.error('Save report error:', error);
    res.status(500).json({
      error: 'Failed to save report',
      message: 'Internal server error while saving report'
    });
  }
};

/**
 * Get specific saved report with data
 */
const getSavedReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;
    const { regenerate = false } = req.query;

    // Get report details
    const reportResult = await query(`
      SELECT 
        sr.id, sr.name, sr.description, sr.measure, sr.filters, sr.sort_config, 
        sr.view_type, sr.is_favorite, sr.view_count, sr.cached_results, 
        sr.cached_metadata, sr.cache_expires_at, sr.created_at, sr.updated_at,
        d.name as dashboard_name, d.id as dashboard_id
      FROM saved_reports sr
      JOIN dashboards d ON sr.dashboard_id = d.id
      WHERE sr.id = $1 AND sr.user_id = $2
    `, [reportId, userId]);

    if (reportResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Report not found',
        message: 'Report not found or you do not have access'
      });
    }

    const report = reportResult.rows[0];
    const hasValidCache = report.cached_results && 
                          report.cache_expires_at && 
                          new Date(report.cache_expires_at) > new Date();

    let reportData = null;
    let metadata = null;

    // Use cached data if available and valid, unless regeneration is requested
    if (!regenerate && hasValidCache) {
      console.log(`Using cached data for report: ${report.name}`);
      reportData = report.cached_results;
      metadata = report.cached_metadata;
    } else {
      // Generate fresh data
      console.log(`Generating fresh data for report: ${report.name}`);
      
      try {
        const reportConfig = {
          measure: report.measure,
          filters: report.filters,
          sortConfig: report.sort_config,
          viewType: 'unified' // Use unified to get comprehensive data
        };

        // Generate report using existing logic
        const reportController = require('./reportController');
        
        const mockReq = { body: reportConfig };
        const mockRes = {
          json: (data) => data,
          status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
        };

        const reportResult = await new Promise((resolve, reject) => {
          const originalJson = mockRes.json;
          mockRes.json = (data) => resolve(data);
          
          reportController.generateReport(mockReq, mockRes).catch(reject);
        });

        if (reportResult.success && reportResult.results) {
          reportData = reportResult.results;
          metadata = {
            count: reportResult.count,
            queryMetadata: reportResult.queryMetadata,
            generatedAt: new Date().toISOString()
          };

          // Update cache
          const newCacheExpiresAt = new Date();
          newCacheExpiresAt.setHours(newCacheExpiresAt.getHours() + 1);
          
          await query(`
            UPDATE saved_reports 
            SET 
              cached_results = $1, 
              cached_metadata = $2, 
              cache_expires_at = $3
            WHERE id = $4
          `, [
            JSON.stringify(reportData),
            JSON.stringify(metadata),
            newCacheExpiresAt,
            reportId
          ]);
        }
      } catch (generationError) {
        console.error('Failed to generate fresh report data:', generationError);
        
        // Fall back to cached data if available
        if (report.cached_results) {
          console.log('Falling back to expired cached data');
          reportData = report.cached_results;
          metadata = report.cached_metadata;
        } else {
          throw generationError;
        }
      }
    }

    // Update view count and last viewed
    await query(`
      UPDATE saved_reports 
      SET 
        view_count = view_count + 1,
        last_viewed_at = NOW()
      WHERE id = $1
    `, [reportId]);

    res.json({
      success: true,
      report: {
        id: report.id,
        name: report.name,
        description: report.description,
        measure: report.measure,
        filters: report.filters,
        sortConfig: report.sort_config,
        viewType: report.view_type,
        isFavorite: report.is_favorite,
        viewCount: report.view_count + 1,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
        dashboardName: report.dashboard_name,
        dashboardId: report.dashboard_id
      },
      data: reportData,
      metadata: {
        ...metadata,
        cached: !regenerate && hasValidCache,
        cacheExpiresAt: hasValidCache ? report.cache_expires_at : null
      }
    });

  } catch (error) {
    console.error('Get saved report error:', error);
    res.status(500).json({
      error: 'Failed to get report',
      message: 'Internal server error while fetching report'
    });
  }
};

/**
 * Update saved report
 */
const updateSavedReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;
    const { name, description, filters, sortConfig, viewType } = req.body;

    // Check if report exists and user owns it
    const existingReport = await query(`
      SELECT sr.id, sr.name, sr.dashboard_id
      FROM saved_reports sr
      JOIN dashboards d ON sr.dashboard_id = d.id
      WHERE sr.id = $1 AND sr.user_id = $2
    `, [reportId, userId]);

    if (existingReport.rows.length === 0) {
      return res.status(404).json({
        error: 'Report not found',
        message: 'Report not found or you do not have access'
      });
    }

    // Check for duplicate name if name is being updated
    if (name && name !== existingReport.rows[0].name) {
      const duplicateName = await query(
        'SELECT id FROM saved_reports WHERE dashboard_id = $1 AND name = $2 AND id != $3',
        [existingReport.rows[0].dashboard_id, name.trim(), reportId]
      );

      if (duplicateName.rows.length > 0) {
        return res.status(409).json({
          error: 'Report name exists',
          message: 'A report with this name already exists in this dashboard'
        });
      }
    }

    // Clear cache if filters or config changed
    const clearCache = filters || sortConfig || viewType;

    // Update report
    const updatedReport = await query(`
      UPDATE saved_reports 
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        filters = COALESCE($3, filters),
        sort_config = COALESCE($4, sort_config),
        view_type = COALESCE($5, view_type),
        cached_results = CASE WHEN $6 THEN NULL ELSE cached_results END,
        cached_metadata = CASE WHEN $6 THEN NULL ELSE cached_metadata END,
        cache_expires_at = CASE WHEN $6 THEN NULL ELSE cache_expires_at END,
        updated_at = NOW()
      WHERE id = $7 AND user_id = $8
      RETURNING id, name, description, measure, view_type, updated_at
    `, [
      name?.trim(),
      description?.trim(),
      filters ? JSON.stringify(filters) : null,
      sortConfig ? JSON.stringify(sortConfig) : null,
      viewType,
      clearCache,
      reportId,
      userId
    ]);

    const report = updatedReport.rows[0];

    console.log(`Report updated: ${report.name} by user ${req.user.username}`);

    res.json({
      success: true,
      message: 'Report updated successfully',
      report: {
        id: report.id,
        name: report.name,
        description: report.description,
        measure: report.measure,
        viewType: report.view_type,
        updatedAt: report.updated_at
      }
    });

  } catch (error) {
    console.error('Update saved report error:', error);
    res.status(500).json({
      error: 'Failed to update report',
      message: 'Internal server error while updating report'
    });
  }
};

/**
 * Delete saved report
 */
const deleteSavedReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;

    // Check if report exists and user owns it
    const existingReport = await query(`
      SELECT sr.id, sr.name
      FROM saved_reports sr
      JOIN dashboards d ON sr.dashboard_id = d.id
      WHERE sr.id = $1 AND sr.user_id = $2
    `, [reportId, userId]);

    if (existingReport.rows.length === 0) {
      return res.status(404).json({
        error: 'Report not found',
        message: 'Report not found or you do not have access'
      });
    }

    // Delete report
    await query('DELETE FROM saved_reports WHERE id = $1', [reportId]);

    console.log(`Report deleted: ${existingReport.rows[0].name} by user ${req.user.username}`);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Delete saved report error:', error);
    res.status(500).json({
      error: 'Failed to delete report',
      message: 'Internal server error while deleting report'
    });
  }
};

/**
 * Toggle report favorite status
 */
const toggleFavorite = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;

    // Check if report exists and user owns it
    const existingReport = await query(`
      SELECT sr.id, sr.name, sr.is_favorite
      FROM saved_reports sr
      JOIN dashboards d ON sr.dashboard_id = d.id
      WHERE sr.id = $1 AND sr.user_id = $2
    `, [reportId, userId]);

    if (existingReport.rows.length === 0) {
      return res.status(404).json({
        error: 'Report not found',
        message: 'Report not found or you do not have access'
      });
    }

    const currentFavorite = existingReport.rows[0].is_favorite;
    const newFavorite = !currentFavorite;

    // Toggle favorite
    await query(
      'UPDATE saved_reports SET is_favorite = $1 WHERE id = $2',
      [newFavorite, reportId]
    );

    console.log(`Report ${newFavorite ? 'favorited' : 'unfavorited'}: ${existingReport.rows[0].name} by user ${req.user.username}`);

    res.json({
      success: true,
      message: `Report ${newFavorite ? 'added to' : 'removed from'} favorites`,
      isFavorite: newFavorite
    });

  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      error: 'Failed to update favorite status',
      message: 'Internal server error while updating favorite status'
    });
  }
};

/**
 * Get user's recent reports across all dashboards
 */
const getRecentReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const recentReports = await query(`
      SELECT 
        sr.id, sr.name, sr.description, sr.measure, sr.view_type, 
        sr.is_favorite, sr.view_count, sr.last_viewed_at, sr.created_at,
        d.name as dashboard_name, d.id as dashboard_id,
        (sr.cache_expires_at IS NOT NULL AND sr.cache_expires_at > NOW()) as has_cached_data
      FROM saved_reports sr
      JOIN dashboards d ON sr.dashboard_id = d.id
      WHERE sr.user_id = $1 AND sr.last_viewed_at IS NOT NULL
      ORDER BY sr.last_viewed_at DESC
      LIMIT $2
    `, [userId, Math.min(parseInt(limit), 50)]);

    res.json({
      success: true,
      recentReports: recentReports.rows.map(report => ({
        id: report.id,
        name: report.name,
        description: report.description,
        measure: report.measure,
        viewType: report.view_type,
        isFavorite: report.is_favorite,
        viewCount: report.view_count,
        lastViewedAt: report.last_viewed_at,
        createdAt: report.created_at,
        dashboardName: report.dashboard_name,
        dashboardId: report.dashboard_id,
        hasCachedData: report.has_cached_data
      }))
    });

  } catch (error) {
    console.error('Get recent reports error:', error);
    res.status(500).json({
      error: 'Failed to get recent reports',
      message: 'Internal server error while fetching recent reports'
    });
  }
};

module.exports = {
  getReportsForDashboard,
  saveReport,
  getSavedReport,
  updateSavedReport,
  deleteSavedReport,
  toggleFavorite,
  getRecentReports
};