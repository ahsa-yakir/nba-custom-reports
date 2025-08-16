/**
 * Main report generation logic
 */
const { buildReportQuery, validateFilters, hasAdvancedFilters, executeQuery } = require('../utils/queryBuilder');

const generateReport = async (req, res) => {
  try {
    const { measure, filters, sortConfig, viewType } = req.body;
    
    // Validate required fields
    if (!measure) {
      return res.status(400).json({
        error: 'Missing required field: measure',
        message: 'Please specify either "Players" or "Teams"'
      });
    }
    
    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      return res.status(400).json({
        error: 'Missing required field: filters',
        message: 'At least one filter is required'
      });
    }
    
    // Validate filters
    const filterErrors = validateFilters(filters, measure);
    if (filterErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid filters',
        message: filterErrors.join(', ')
      });
    }
    
    // Determine if we should use advanced stats
    const isAdvancedRequest = viewType === 'advanced' || hasAdvancedFilters(filters);
    
    console.log(`Generating ${measure} report with ${filters.length} filters (${isAdvancedRequest ? 'Advanced' : 'Traditional'} stats)`);
    
    // Build and execute query using the enhanced query builder
    const { sql, params, isAdvanced, normalizedSort } = buildReportQuery(measure, filters, sortConfig, 100, viewType);
    
    console.log('Executing SQL:', sql.substring(0, 200) + '...');
    console.log('Parameters:', params);
    console.log('Advanced View:', isAdvanced);
    
    const result = await executeQuery(sql, params);
    
    console.log(`Query completed: ${result.rows.length} results`);
    
    res.json({
      success: true,
      measure,
      filters,
      sortConfig: normalizedSort,
      viewType: isAdvanced ? 'advanced' : 'traditional',
      autoSwitched: isAdvanced && (!viewType || viewType === 'traditional'),
      count: result.rows.length,
      results: result.rows
    });
    
  } catch (error) {
    console.error('Report generation error:', error);
    
    res.status(500).json({
      error: 'Report generation failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const validateReport = async (req, res) => {
  try {
    const { measure, filters, sortConfig, viewType } = req.body;
    
    const issues = [];
    
    // Validate measure
    if (!measure || !['Players', 'Teams'].includes(measure)) {
      issues.push('Invalid or missing measure. Must be "Players" or "Teams".');
    }
    
    // Validate filters
    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      issues.push('At least one filter is required.');
    } else {
      const filterErrors = validateFilters(filters, measure);
      issues.push(...filterErrors);
    }
    
    // Validate sortConfig if provided
    if (sortConfig) {
      if (typeof sortConfig !== 'object') {
        issues.push('Sort configuration must be an object.');
      } else {
        if (sortConfig.column && typeof sortConfig.column !== 'string') {
          issues.push('Sort column must be a string.');
        }
        if (sortConfig.direction && !['asc', 'desc'].includes(sortConfig.direction.toLowerCase())) {
          issues.push('Sort direction must be "asc" or "desc".');
        }
      }
    }
    
    // Check for advanced filter usage
    const hasAdvanced = filters ? hasAdvancedFilters(filters) : false;
    const recommendedView = hasAdvanced ? 'advanced' : 'traditional';
    
    // Performance warnings
    const warnings = [];
    if (filters && filters.length > 10) {
      warnings.push('Large number of filters may impact performance.');
    }
    
    // Try to build the query to catch any other issues
    let queryValid = true;
    let queryError = null;
    
    if (issues.length === 0) {
      try {
        buildReportQuery(measure, filters, sortConfig, 1, viewType);
      } catch (queryErr) {
        queryValid = false;
        queryError = queryErr.message;
        issues.push(`Query building failed: ${queryError}`);
      }
    }
    
    res.json({
      success: true,
      valid: issues.length === 0 && queryValid,
      issues,
      warnings,
      recommendations: {
        viewType: recommendedView,
        autoSwitch: hasAdvanced && viewType !== 'advanced',
        message: hasAdvanced 
          ? 'Advanced filters detected. Consider using advanced view for best results.'
          : 'Traditional filters detected. Using traditional view.'
      },
      query: {
        valid: queryValid,
        error: queryError
      }
    });
    
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
};

const previewReport = async (req, res) => {
  try {
    const { measure, filters, sortConfig, viewType } = req.body;
    
    // Validate inputs (reuse validation from generateReport)
    if (!measure || !['Players', 'Teams'].includes(measure)) {
      return res.status(400).json({
        error: 'Invalid measure',
        message: 'Must be "Players" or "Teams"'
      });
    }
    
    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      return res.status(400).json({
        error: 'Missing filters',
        message: 'At least one filter is required'
      });
    }
    
    // Generate a small preview (limit to 5 results)
    const { sql, params, isAdvanced } = buildReportQuery(measure, filters, sortConfig, 5, viewType);
    const result = await executeQuery(sql, params);
    
    res.json({
      success: true,
      measure,
      viewType: isAdvanced ? 'advanced' : 'traditional',
      preview: result.rows,
      count: result.rows.length,
      message: `Preview of first 5 results (${result.rows.length} returned)`
    });
    
  } catch (error) {
    console.error('Preview generation error:', error);
    res.status(500).json({
      error: 'Preview generation failed',
      message: error.message
    });
  }
};

module.exports = {
  generateReport,
  validateReport,
  previewReport
};