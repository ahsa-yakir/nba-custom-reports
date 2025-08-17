/**
 * Enhanced report controller supporting unified queries
 */
const { 
  buildReportQuery, 
  validateFilters, 
  hasAdvancedFilters, 
  executeQuery,
  getQueryMetadata,
  analyzeFilterTypes,
  getRecommendedViewType,
  getActiveColumns
} = require('../utils/queryBuilder');

const { executeQuery: unifiedExecuteQuery } = require('../utils/unifiedQueryBuilder');

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
    
    // Analyze filters and determine optimal query strategy
    const filterAnalysis = analyzeFilterTypes(filters);
    const recommendedViewType = getRecommendedViewType(filters);
    const activeColumns = getActiveColumns(filters, measure);
    
    console.log(`Generating ${measure} report with ${filters.length} filters`);
    console.log('Filter analysis:', filterAnalysis);
    console.log('Recommended view:', recommendedViewType);
    
    // Build query using enhanced query builder
    const queryResult = buildReportQuery(measure, filters, sortConfig, 100, viewType);
    const { 
      sql, 
      params, 
      isAdvanced, 
      normalizedSort, 
      isUnified,
      filterAnalysis: analysisFromQuery,
      recommendedViewType: recommendedFromQuery
    } = queryResult;
    
    console.log('Query type:', isUnified ? 'Unified' : (isAdvanced ? 'Advanced' : 'Traditional'));
    console.log('Executing SQL:', sql.substring(0, 200) + '...');
    
    // Execute query using appropriate method
    const result = isUnified 
      ? await unifiedExecuteQuery(sql, params)
      : await executeQuery(sql, params);
    
    console.log(`Query completed: ${result.rows.length} results`);
    
    // Determine final view type for response
    let finalViewType = viewType;
    if (isUnified && filterAnalysis.isMixed) {
      finalViewType = 'custom';
    } else if (isAdvanced && (!viewType || viewType === 'traditional')) {
      finalViewType = 'advanced';
    } else if (!isAdvanced && viewType === 'advanced') {
      finalViewType = 'traditional';
    }
    
    // Enhanced response with metadata
    res.json({
      success: true,
      measure,
      filters,
      sortConfig: normalizedSort,
      viewType: finalViewType,
      queryMetadata: {
        isUnified,
        isAdvanced,
        queryType: isUnified ? 'unified' : (isAdvanced ? 'advanced' : 'traditional'),
        filterAnalysis: filterAnalysis,
        recommendedViewType: recommendedViewType,
        activeColumns: activeColumns,
        autoSwitched: finalViewType !== viewType,
        hasAdvancedData: isUnified || isAdvanced,
        hasTraditionalData: true // Always true since we JOIN traditional stats
      },
      count: result.rows.length,
      results: result.rows,
      availableViews: {
        traditional: true,
        advanced: isUnified || isAdvanced,
        custom: filterAnalysis.isMixed
      }
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
    
    // Get enhanced metadata if no critical issues
    let queryMetadata = null;
    let queryValid = true;
    let queryError = null;
    
    if (issues.length === 0) {
      try {
        queryMetadata = getQueryMetadata(measure, filters, viewType);
        if (!queryMetadata.success) {
          queryValid = false;
          queryError = queryMetadata.error;
          issues.push(`Query analysis failed: ${queryError}`);
        }
      } catch (queryErr) {
        queryValid = false;
        queryError = queryErr.message;
        issues.push(`Query building failed: ${queryError}`);
      }
    }
    
    // Enhanced recommendations
    const recommendations = {
      message: 'Report configuration analyzed',
      suggestions: []
    };
    
    if (queryMetadata && queryMetadata.success) {
      const { filterAnalysis, recommendedViewType, suggestions } = queryMetadata;
      
      recommendations.viewType = recommendedViewType;
      recommendations.autoSwitch = recommendedViewType !== viewType;
      
      if (filterAnalysis.isMixed) {
        recommendations.message = 'Mixed filter types detected. Custom view recommended.';
        recommendations.suggestions.push('Consider using custom view for mixed traditional and advanced filters');
      } else if (filterAnalysis.hasAdvanced && viewType !== 'advanced') {
        recommendations.message = 'Advanced filters detected. Consider switching to advanced view.';
        recommendations.suggestions.push('Switch to advanced view for optimal display of advanced statistics');
      } else if (!filterAnalysis.hasAdvanced && viewType === 'advanced') {
        recommendations.message = 'Only traditional filters detected. Traditional view may be sufficient.';
        recommendations.suggestions.push('Traditional view may be more appropriate for these filters');
      }
      
      if (suggestions) {
        if (suggestions.useUnified) {
          recommendations.suggestions.push('Unified query approach recommended for mixed filter types');
        }
        if (suggestions.switchToAdvanced) {
          recommendations.suggestions.push('Advanced view recommended based on filter analysis');
        }
        if (suggestions.switchToTraditional) {
          recommendations.suggestions.push('Traditional view may be sufficient for these filters');
        }
      }
    }
    
    // Performance warnings
    const warnings = [];
    if (filters && filters.length > 10) {
      warnings.push('Large number of filters may impact performance.');
    }
    
    if (queryMetadata && queryMetadata.queryType === 'unified') {
      warnings.push('Unified query may take longer but provides comprehensive data.');
    }
    
    res.json({
      success: true,
      valid: issues.length === 0 && queryValid,
      issues,
      warnings,
      recommendations,
      query: {
        valid: queryValid,
        error: queryError
      },
      metadata: queryMetadata
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
    const queryResult = buildReportQuery(measure, filters, sortConfig, 5, viewType);
    const { sql, params, isAdvanced, isUnified, filterAnalysis, recommendedViewType } = queryResult;
    
    const result = isUnified 
      ? await unifiedExecuteQuery(sql, params)
      : await executeQuery(sql, params);
    
    res.json({
      success: true,
      measure,
      viewType: isUnified && filterAnalysis?.isMixed ? 'custom' : (isAdvanced ? 'advanced' : 'traditional'),
      preview: result.rows,
      count: result.rows.length,
      message: `Preview of first 5 results (${result.rows.length} returned)`,
      metadata: {
        isUnified,
        queryType: isUnified ? 'unified' : (isAdvanced ? 'advanced' : 'traditional'),
        recommendedViewType,
        filterAnalysis
      }
    });
    
  } catch (error) {
    console.error('Preview generation error:', error);
    res.status(500).json({
      error: 'Preview generation failed',
      message: error.message
    });
  }
};

const getQueryInfo = async (req, res) => {
  try {
    const { measure, filters, viewType } = req.body;
    
    if (!measure || !['Players', 'Teams'].includes(measure)) {
      return res.status(400).json({
        error: 'Invalid measure',
        message: 'Must be "Players" or "Teams"'
      });
    }
    
    if (!filters || !Array.isArray(filters)) {
      return res.status(400).json({
        error: 'Invalid filters',
        message: 'Filters must be an array'
      });
    }
    
    const metadata = getQueryMetadata(measure, filters, viewType);
    
    res.json({
      success: true,
      ...metadata
    });
    
  } catch (error) {
    console.error('Query info error:', error);
    res.status(500).json({
      error: 'Failed to analyze query',
      message: error.message
    });
  }
};

module.exports = {
  generateReport,
  validateReport,
  previewReport,
  getQueryInfo
};