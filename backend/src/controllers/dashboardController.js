/**
 * Dashboard controller for managing user dashboards and saved reports
 */
const { query } = require('../config/database');

/**
 * Get all dashboards for authenticated user
 */
const getDashboards = async (req, res) => {
  try {
    const userId = req.user.id;

    const dashboards = await query(`
      SELECT 
        d.id,
        d.name,
        d.description,
        d.is_default,
        d.settings,
        d.created_at,
        d.updated_at,
        COUNT(sr.id) as report_count,
        COUNT(CASE WHEN sr.is_favorite = true THEN 1 END) as favorite_count,
        MAX(sr.last_viewed_at) as last_activity
      FROM dashboards d
      LEFT JOIN saved_reports sr ON d.id = sr.dashboard_id
      WHERE d.user_id = $1
      GROUP BY d.id, d.name, d.description, d.is_default, d.settings, d.created_at, d.updated_at
      ORDER BY d.is_default DESC, d.created_at ASC
    `, [userId]);

    res.json({
      success: true,
      dashboards: dashboards.rows.map(dashboard => ({
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        isDefault: dashboard.is_default,
        settings: dashboard.settings,
        createdAt: dashboard.created_at,
        updatedAt: dashboard.updated_at,
        stats: {
          reportCount: parseInt(dashboard.report_count),
          favoriteCount: parseInt(dashboard.favorite_count),
          lastActivity: dashboard.last_activity
        }
      }))
    });

  } catch (error) {
    console.error('Get dashboards error:', error);
    res.status(500).json({
      error: 'Failed to get dashboards',
      message: 'Internal server error while fetching dashboards'
    });
  }
};

/**
 * Get specific dashboard by ID
 */
const getDashboard = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const userId = req.user.id;

    const dashboardResult = await query(`
      SELECT 
        d.id,
        d.name,
        d.description,
        d.is_default,
        d.settings,
        d.created_at,
        d.updated_at
      FROM dashboards d
      WHERE d.id = $1 AND d.user_id = $2
    `, [dashboardId, userId]);

    if (dashboardResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Dashboard not found',
        message: 'Dashboard not found or you do not have access'
      });
    }

    const dashboard = dashboardResult.rows[0];

    // Get reports for this dashboard
    const reportsResult = await query(`
      SELECT 
        id, name, description, measure, view_type, is_favorite,
        view_count, last_viewed_at, created_at, updated_at,
        (cache_expires_at IS NOT NULL AND cache_expires_at > NOW()) as has_cached_data
      FROM saved_reports
      WHERE dashboard_id = $1
      ORDER BY is_favorite DESC, last_viewed_at DESC NULLS LAST, created_at DESC
    `, [dashboardId]);

    res.json({
      success: true,
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        isDefault: dashboard.is_default,
        settings: dashboard.settings,
        createdAt: dashboard.created_at,
        updatedAt: dashboard.updated_at,
        reports: reportsResult.rows.map(report => ({
          id: report.id,
          name: report.name,
          description: report.description,
          measure: report.measure,
          viewType: report.view_type,
          isFavorite: report.is_favorite,
          viewCount: report.view_count,
          lastViewedAt: report.last_viewed_at,
          createdAt: report.created_at,
          updatedAt: report.updated_at,
          hasCachedData: report.has_cached_data
        }))
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      error: 'Failed to get dashboard',
      message: 'Internal server error while fetching dashboard'
    });
  }
};

/**
 * Create new dashboard
 */
const createDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, isDefault = false, settings = {} } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Dashboard name required',
        message: 'Dashboard name cannot be empty'
      });
    }

    if (name.length > 255) {
      return res.status(400).json({
        error: 'Dashboard name too long',
        message: 'Dashboard name must be 255 characters or less'
      });
    }

    // Check if dashboard name already exists for user
    const existingDashboard = await query(
      'SELECT id FROM dashboards WHERE user_id = $1 AND name = $2',
      [userId, name.trim()]
    );

    if (existingDashboard.rows.length > 0) {
      return res.status(409).json({
        error: 'Dashboard name exists',
        message: 'A dashboard with this name already exists'
      });
    }

    // If setting as default, remove default from other dashboards
    if (isDefault) {
      await query(
        'UPDATE dashboards SET is_default = false WHERE user_id = $1',
        [userId]
      );
    }

    // Create dashboard
    const newDashboard = await query(`
      INSERT INTO dashboards (user_id, name, description, is_default, settings)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, description, is_default, settings, created_at, updated_at
    `, [userId, name.trim(), description?.trim(), isDefault, JSON.stringify(settings)]);

    const dashboard = newDashboard.rows[0];

    console.log(`Dashboard created: ${dashboard.name} by user ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Dashboard created successfully',
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        isDefault: dashboard.is_default,
        settings: dashboard.settings,
        createdAt: dashboard.created_at,
        updatedAt: dashboard.updated_at,
        reports: []
      }
    });

  } catch (error) {
    console.error('Create dashboard error:', error);
    res.status(500).json({
      error: 'Failed to create dashboard',
      message: 'Internal server error while creating dashboard'
    });
  }
};

/**
 * Update dashboard
 */
const updateDashboard = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const userId = req.user.id;
    const { name, description, isDefault, settings } = req.body;

    // Check if dashboard exists and user owns it
    const existingDashboard = await query(
      'SELECT id, name FROM dashboards WHERE id = $1 AND user_id = $2',
      [dashboardId, userId]
    );

    if (existingDashboard.rows.length === 0) {
      return res.status(404).json({
        error: 'Dashboard not found',
        message: 'Dashboard not found or you do not have access'
      });
    }

    // Validation
    if (name && name.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid dashboard name',
        message: 'Dashboard name cannot be empty'
      });
    }

    if (name && name.length > 255) {
      return res.status(400).json({
        error: 'Dashboard name too long',
        message: 'Dashboard name must be 255 characters or less'
      });
    }

    // Check for duplicate name (excluding current dashboard)
    if (name) {
      const duplicateName = await query(
        'SELECT id FROM dashboards WHERE user_id = $1 AND name = $2 AND id != $3',
        [userId, name.trim(), dashboardId]
      );

      if (duplicateName.rows.length > 0) {
        return res.status(409).json({
          error: 'Dashboard name exists',
          message: 'A dashboard with this name already exists'
        });
      }
    }

    // If setting as default, remove default from other dashboards
    if (isDefault === true) {
      await query(
        'UPDATE dashboards SET is_default = false WHERE user_id = $1 AND id != $2',
        [userId, dashboardId]
      );
    }

    // Update dashboard
    const updatedDashboard = await query(`
      UPDATE dashboards 
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_default = COALESCE($3, is_default),
        settings = COALESCE($4, settings),
        updated_at = NOW()
      WHERE id = $5 AND user_id = $6
      RETURNING id, name, description, is_default, settings, created_at, updated_at
    `, [
      name?.trim(),
      description?.trim(),
      isDefault,
      settings ? JSON.stringify(settings) : null,
      dashboardId,
      userId
    ]);

    const dashboard = updatedDashboard.rows[0];

    console.log(`Dashboard updated: ${dashboard.name} by user ${req.user.username}`);

    res.json({
      success: true,
      message: 'Dashboard updated successfully',
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        isDefault: dashboard.is_default,
        settings: dashboard.settings,
        createdAt: dashboard.created_at,
        updatedAt: dashboard.updated_at
      }
    });

  } catch (error) {
    console.error('Update dashboard error:', error);
    res.status(500).json({
      error: 'Failed to update dashboard',
      message: 'Internal server error while updating dashboard'
    });
  }
};

/**
 * Delete dashboard
 */
const deleteDashboard = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const userId = req.user.id;

    // Check if dashboard exists and user owns it
    const existingDashboard = await query(
      'SELECT id, name, is_default FROM dashboards WHERE id = $1 AND user_id = $2',
      [dashboardId, userId]
    );

    if (existingDashboard.rows.length === 0) {
      return res.status(404).json({
        error: 'Dashboard not found',
        message: 'Dashboard not found or you do not have access'
      });
    }

    const dashboard = existingDashboard.rows[0];

    // Check if there are other dashboards
    const dashboardCount = await query(
      'SELECT COUNT(*) as count FROM dashboards WHERE user_id = $1',
      [userId]
    );

    if (parseInt(dashboardCount.rows[0].count) <= 1) {
      return res.status(400).json({
        error: 'Cannot delete last dashboard',
        message: 'You must have at least one dashboard'
      });
    }

    // If deleting default dashboard, make another one default
    if (dashboard.is_default) {
      await query(`
        UPDATE dashboards 
        SET is_default = true 
        WHERE user_id = $1 AND id != $2 
        ORDER BY created_at ASC 
        LIMIT 1
      `, [userId, dashboardId]);
    }

    // Delete dashboard (cascade will delete reports)
    await query('DELETE FROM dashboards WHERE id = $1', [dashboardId]);

    console.log(`Dashboard deleted: ${dashboard.name} by user ${req.user.username}`);

    res.json({
      success: true,
      message: 'Dashboard deleted successfully'
    });

  } catch (error) {
    console.error('Delete dashboard error:', error);
    res.status(500).json({
      error: 'Failed to delete dashboard',
      message: 'Internal server error while deleting dashboard'
    });
  }
};

/**
 * Set dashboard as default
 */
const setDefaultDashboard = async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const userId = req.user.id;

    // Check if dashboard exists and user owns it
    const existingDashboard = await query(
      'SELECT id, name FROM dashboards WHERE id = $1 AND user_id = $2',
      [dashboardId, userId]
    );

    if (existingDashboard.rows.length === 0) {
      return res.status(404).json({
        error: 'Dashboard not found',
        message: 'Dashboard not found or you do not have access'
      });
    }

    // Remove default from all user dashboards
    await query(
      'UPDATE dashboards SET is_default = false WHERE user_id = $1',
      [userId]
    );

    // Set this dashboard as default
    await query(
      'UPDATE dashboards SET is_default = true WHERE id = $1',
      [dashboardId]
    );

    console.log(`Default dashboard set: ${existingDashboard.rows[0].name} by user ${req.user.username}`);

    res.json({
      success: true,
      message: 'Default dashboard updated successfully'
    });

  } catch (error) {
    console.error('Set default dashboard error:', error);
    res.status(500).json({
      error: 'Failed to set default dashboard',
      message: 'Internal server error while setting default dashboard'
    });
  }
};

module.exports = {
  getDashboards,
  getDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  setDefaultDashboard
};