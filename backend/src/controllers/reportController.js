/**
 * Updated report controller using restructured query builder
 * Now properly handles organizers -> aggregation -> filtering workflow
 */
const { 
  buildReportQuery, 
  validateFilters, 
  hasAdvancedFilters, 
  executeQuery,
  getQueryMetadata,
  analyzeFilterTypes,
  getRecommendedViewType,
  getActiveColumns,
  validateOrganizer,
  getOrganizerDescription
} = require('../utils/queryBuilder');

const generateReport = async (req, res) => {
  try {
    const { measure, filters, organizer, sortConfig, viewType } = req.body;
    
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

    // Always require organizer (default to all_games if not provided)
    const normalizedOrganizer = organizer || { type: 'all_games' };
    
    // Validate organizer
    const organizerErrors = validateOrganizer(normalizedOrganizer);
    if (organizerErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid organizer',
        message: organizerErrors.join(', ')
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
    
    console.log(`🔧 Generating ${measure} report with organizer: ${getOrganizerDescription(normalizedOrganizer)}`);
    console.log('📊 Filter analysis:', filterAnalysis);
    console.log('💡 Recommended view:', recommendedViewType);
    
    // Build query using restructured query builder with organizer-first approach
    const queryResult = buildReportQuery(measure, filters, normalizedOrganizer, sortConfig, 100, viewType);
    const { 
      sql, 
      params, 
      isAdvanced, 
      normalizedSort, 
      isUnified,
      filterAnalysis: analysisFromQuery,
      recommendedViewType: recommendedFromQuery,
      organizerDescription
    } = queryResult;
    
    console.log('🎯 Query type:', isUnified ? 'Unified' : (isAdvanced ? 'Advanced' : 'Traditional'));
    console.log('🎯 Organizer:', organizerDescription);
    console.log('🎯 Approach: Organizer -> Aggregate -> Filter');
    console.log('🔍 Executing SQL:', sql.substring(0, 200) + '...');
    
    // Execute query
    const result = await executeQuery(sql, params);
    
    console.log(`✅ Query completed: ${result.rows.length} results`);
    console.log('📈 Sample result:', result.rows[0] ? JSON.stringify(result.rows[0], null, 2) : 'No results');
    
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
      organizer: normalizedOrganizer,
      organizerDescription,
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
        hasTraditionalData: true,
        organizerApplied: normalizedOrganizer.type !== 'all_games',
        queryApproach: 'organizer_first', // New field to indicate the approach
        aggregationLevel: 'post_organizer' // Indicates that aggregation happens after organizer scoping
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
    console.error('❌ Report generation error:', error);
    
    // Enhanced error logging for debugging
    if (error.message.includes('column') || error.message.includes('relation')) {
      console.error('🔍 SQL Error Details:', {
        message: error.message,
        hint: 'This might be a column mapping or table structure issue'
      });
    }
    
    res.status(500).json({
      error: 'Report generation failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      queryApproach: 'organizer_first'
    });
  }
};

const validateReport = async (req, res) => {
  try {
    const { measure, filters, organizer, sortConfig, viewType } = req.body;
    
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
    
    // Validate organizer (always required now)
    const normalizedOrganizer = organizer || { type: 'all_games' };
    const organizerErrors = validateOrganizer(normalizedOrganizer);
    if (organizerErrors.length > 0) {
      issues.push(...organizerErrors.map(err => `Organizer: ${err}`));
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
        queryMetadata = getQueryMetadata(measure, filters, normalizedOrganizer, viewType);
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
      message: 'Report configuration analyzed with organizer-first approach',
      approach: 'organizer_first',
      workflow: 'Organizer defines scope → Calculate averages → Apply filters',
      suggestions: [],
      organizer: {
        current: getOrganizerDescription(normalizedOrganizer),
        suggestions: []
      }
    };
    
    if (queryMetadata && queryMetadata.success) {
      const { filterAnalysis, recommendedViewType, suggestions } = queryMetadata;
      
      recommendations.viewType = recommendedViewType;
      recommendations.autoSwitch = recommendedViewType !== viewType;
      
      if (filterAnalysis.isMixed) {
        recommendations.message = 'Mixed filter types detected. Custom view recommended with organizer-first approach.';
        recommendations.suggestions.push('Consider using custom view for mixed traditional and advanced filters');
      } else if (filterAnalysis.hasAdvanced && viewType !== 'advanced') {
        recommendations.message = 'Advanced filters detected. Consider switching to advanced view.';
        recommendations.suggestions.push('Switch to advanced view for optimal display of advanced statistics');
      } else if (!filterAnalysis.hasAdvanced && viewType === 'advanced') {
        recommendations.message = 'Only traditional filters detected. Traditional view may be sufficient.';
        recommendations.suggestions.push('Traditional view may be more appropriate for these filters');
      }
      
      // Organizer-specific recommendations
      if (normalizedOrganizer.type === 'all_games') {
        recommendations.organizer.suggestions.push('Consider using "Last X Games" for recent performance analysis');
        recommendations.organizer.suggestions.push('Use "Home/Away" to analyze venue-specific performance');
        recommendations.organizer.suggestions.push('Use "Game Range" to analyze specific periods of the season');
      } else {
        recommendations.organizer.suggestions.push('Results will show averages calculated over the specified game scope');
        recommendations.organizer.suggestions.push('Filters are applied to these calculated averages, not individual games');
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
    
    // Performance warnings with organizer considerations
    const warnings = [];
    if (filters && filters.length > 10) {
      warnings.push('Large number of filters may impact performance.');
    }
    
    if (queryMetadata && queryMetadata.queryType === 'unified') {
      warnings.push('Unified query may take longer but provides comprehensive data.');
    }
    
    if (normalizedOrganizer.type === 'last_games' && normalizedOrganizer.value > 20) {
      warnings.push('Large "Last Games" values may impact query performance.');
    }
    
    if (normalizedOrganizer.type === 'game_range' && (normalizedOrganizer.to - normalizedOrganizer.from) > 40) {
      warnings.push('Large game ranges may impact query performance.');
    }
    
    // Add organizer-specific warnings about data expectations
    if (normalizedOrganizer.type !== 'all_games') {
      warnings.push(`Results will show averages over ${getOrganizerDescription(normalizedOrganizer)}, not season totals.`);
    }
    
    res.json({
      success: true,
      valid: issues.length === 0 && queryValid,
      issues,
      warnings,
      recommendations,
      query: {
        valid: queryValid,
        error: queryError,
        approach: 'organizer_first'
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
    const { measure, filters, organizer, sortConfig, viewType } = req.body;
    
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
    
    const normalizedOrganizer = organizer || { type: 'all_games' };
    
    // Validate organizer
    const organizerErrors = validateOrganizer(normalizedOrganizer);
    if (organizerErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid organizer',
        message: organizerErrors.join(', ')
      });
    }
    
    // Generate a small preview (limit to 5 results)
    console.log(`🔍 Generating preview with organizer: ${getOrganizerDescription(normalizedOrganizer)}`);
    
    const queryResult = buildReportQuery(measure, filters, normalizedOrganizer, sortConfig, 5, viewType);
    const { sql, params, isAdvanced, isUnified, filterAnalysis, recommendedViewType, organizerDescription } = queryResult;
    
    const result = await executeQuery(sql, params);
    
    res.json({
      success: true,
      measure,
      organizer: normalizedOrganizer,
      organizerDescription,
      viewType: isUnified && filterAnalysis?.isMixed ? 'custom' : (isAdvanced ? 'advanced' : 'traditional'),
      preview: result.rows,
      count: result.rows.length,
      message: `Preview of first 5 results (${result.rows.length} returned)`,
      metadata: {
        isUnified,
        queryType: isUnified ? 'unified' : (isAdvanced ? 'advanced' : 'traditional'),
        recommendedViewType,
        filterAnalysis,
        organizerApplied: normalizedOrganizer.type !== 'all_games',
        queryApproach: 'organizer_first'
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
    const { measure, filters, organizer, viewType } = req.body;
    
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
    
    const normalizedOrganizer = organizer || { type: 'all_games' };
    const metadata = getQueryMetadata(measure, filters, normalizedOrganizer, viewType);
    
    res.json({
      success: true,
      organizer: normalizedOrganizer,
      organizerDescription: getOrganizerDescription(normalizedOrganizer),
      queryApproach: 'organizer_first',
      workflow: 'Organizer defines scope → Calculate averages → Apply filters',
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