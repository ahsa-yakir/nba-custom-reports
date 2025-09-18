/**
 * Smart view type detection based on filters and data availability
 */

export const detectViewType = (filters, apiResponse) => {
  if (!filters || filters.length === 0) {
    return 'traditional';
  }

  const filterAnalysis = analyzeFilterTypes(filters);
  
  // Check API response for recommendations if available
  if (apiResponse?.queryMetadata?.recommendedViewType) {
    return apiResponse.queryMetadata.recommendedViewType;
  }

  // Determine based on filter analysis
  if (filterAnalysis.isMixed) {
    return 'custom';
  } else if (filterAnalysis.hasAdvanced) {
    return 'advanced';
  } else {
    return 'traditional';
  }
};

export const analyzeFilterTypes = (filters) => {
  const traditionalFilterTypes = [
    'Team', 'Age', 'Games Played', 'MINS', 'PTS', 'FGM', 'FGA', 'FG%',
    '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB',
    'AST', 'TOV', 'STL', 'BLK', 'PF', '+/-', 'Wins', 'Losses', 'Win %', 'Points'
  ];
  
  const advancedFilterTypes = [
    'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %',
    'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio',
    'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %',
    'Turnover %', 'PIE', 'Pace'
  ];
  
  const hasTraditional = filters.some(filter => traditionalFilterTypes.includes(filter.type));
  const hasAdvanced = filters.some(filter => advancedFilterTypes.includes(filter.type));
  
  return {
    hasTraditional,
    hasAdvanced,
    isMixed: hasTraditional && hasAdvanced,
    filterTypes: filters.map(f => f.type)
  };
};

export const getActiveColumns = (filters, measure) => {
  const baseColumns = measure === 'Players' 
    ? ['Name', 'TEAM', 'AGE', 'Games Played']
    : ['Team', 'Games Played'];
  
  // Get unique filter types (these become active columns)
  const filterColumns = [...new Set(filters.map(f => f.type))];
  
  // Combine base columns with filter columns, removing duplicates
  const allColumns = [...baseColumns];
  filterColumns.forEach(col => {
    // Map some filter types to their display names
    const columnMapping = {
      'Team': 'TEAM',
      'Age': 'AGE',
      'Points': 'PTS'
    };
    
    const displayColumn = columnMapping[col] || col;
    if (!allColumns.includes(displayColumn)) {
      allColumns.push(displayColumn);
    }
  });
  
  return allColumns;
};

export const getViewOptions = (apiResponse, filters) => {
  const options = [
    { value: 'traditional', label: 'Traditional Stats', available: true }
  ];

  // Check if advanced stats are available
  if (apiResponse?.availableViews?.advanced || apiResponse?.queryMetadata?.hasAdvancedData) {
    options.push({ value: 'advanced', label: 'Advanced Stats', available: true });
  }

  // Check if custom view is recommended
  if (apiResponse?.availableViews?.custom || apiResponse?.queryMetadata?.filterAnalysis?.isMixed) {
    const activeColumns = getActiveColumns(filters, apiResponse?.measure);
    options.push({ 
      value: 'custom', 
      label: `Custom View (${activeColumns.length} columns)`, 
      available: true,
      columns: activeColumns
    });
  }

  return options;
};

export const shouldAutoSwitchView = (lastViewType, recommendedView, filters) => {
  // Don't auto-switch if user has manually selected any view
  if (lastViewType) {
    return false;
  }

  const filterAnalysis = analyzeFilterTypes(filters);
  
  // Only auto-switch on initial load when no view has been selected
  // Auto-switch to custom for mixed filters
  if (filterAnalysis.isMixed && recommendedView === 'custom') {
    return true;
  }

  // Auto-switch to advanced for advanced-only filters
  if (filterAnalysis.hasAdvanced && !filterAnalysis.hasTraditional && recommendedView === 'advanced') {
    return true;
  }

  return false;
};

export const getViewDisplayInfo = (viewType, apiResponse, filters) => {
  const baseInfo = {
    traditional: {
      title: 'Traditional Stats',
      description: 'Standard basketball statistics',
      icon: '📊'
    },
    advanced: {
      title: 'Advanced Stats',
      description: 'Advanced analytics and efficiency metrics',
      icon: '🔬'
    },
    custom: {
      title: 'Custom View',
      description: 'Tailored columns based on your filters',
      icon: '🎯'
    }
  };

  const info = baseInfo[viewType] || baseInfo.traditional;

  // Add dynamic information
  if (viewType === 'custom' && filters) {
    const activeColumns = getActiveColumns(filters, apiResponse?.measure);
    info.description = `Showing ${activeColumns.length} relevant columns: ${activeColumns.slice(0, 3).join(', ')}${activeColumns.length > 3 ? '...' : ''}`;
  }

  return info;
};