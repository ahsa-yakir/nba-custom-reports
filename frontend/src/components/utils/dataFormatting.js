/**
 * Enhanced data formatting with unified data support and smart view detection
 */
import { getColumnKey, isAdvancedColumn } from './columnManager';

export const formatApiResults = (results, apiResponse) => {
  if (!results || results.length === 0) {
    return [];
  }

  return results.map(item => {
    const baseData = {
      // Always available fields
      name: item.name,
      team: item.team || item.team_code,
      age: parseInt(item.age) || 0,
      games_played: parseInt(item.games_played) || 0,

      // Traditional stats (always populated)
      mins: parseFloat(item.mins) || 0,
      wins: parseInt(item.wins) || 0,
      losses: parseInt(item.losses) || 0,
      win_pct: parseFloat(item.win_pct) || 0,
      pts: parseFloat(item.pts) || 0,
      fgm: parseFloat(item.fgm) || 0,
      fga: parseFloat(item.fga) || 0,
      fg_pct: parseFloat(item.fg_pct) || 0,
      tpm: parseFloat(item.tpm) || 0,
      tpa: parseFloat(item.tpa) || 0,
      tp_pct: parseFloat(item.tp_pct) || 0,
      ftm: parseFloat(item.ftm) || 0,
      fta: parseFloat(item.fta) || 0,
      ft_pct: parseFloat(item.ft_pct) || 0,
      oreb: parseFloat(item.oreb) || 0,
      dreb: parseFloat(item.dreb) || 0,
      reb: parseFloat(item.reb) || 0,
      ast: parseFloat(item.ast) || 0,
      tov: parseFloat(item.tov) || 0,
      stl: parseFloat(item.stl) || 0,
      blk: parseFloat(item.blk) || 0,
      pf: parseFloat(item.pf) || 0,
      plus_minus: parseFloat(item.plus_minus) || 0
    };

    // Advanced stats (may be null/undefined for non-unified queries)
    baseData.offensive_rating = item.offensive_rating !== null ? parseFloat(item.offensive_rating) : null;
    baseData.defensive_rating = item.defensive_rating !== null ? parseFloat(item.defensive_rating) : null;
    baseData.net_rating = item.net_rating !== null ? parseFloat(item.net_rating) : null;
    baseData.usage_percentage = item.usage_percentage !== null ? parseFloat(item.usage_percentage) : null;
    baseData.true_shooting_percentage = item.true_shooting_percentage !== null ? parseFloat(item.true_shooting_percentage) : null;
    baseData.effective_field_goal_percentage = item.effective_field_goal_percentage !== null ? parseFloat(item.effective_field_goal_percentage) : null;
    baseData.assist_percentage = item.assist_percentage !== null ? parseFloat(item.assist_percentage) : null;
    baseData.assist_turnover_ratio = item.assist_turnover_ratio !== null ? parseFloat(item.assist_turnover_ratio) : null;
    baseData.assist_ratio = item.assist_ratio !== null ? parseFloat(item.assist_ratio) : null;
    baseData.offensive_rebound_percentage = item.offensive_rebound_percentage !== null ? parseFloat(item.offensive_rebound_percentage) : null;
    baseData.defensive_rebound_percentage = item.defensive_rebound_percentage !== null ? parseFloat(item.defensive_rebound_percentage) : null;
    baseData.rebound_percentage = item.rebound_percentage !== null ? parseFloat(item.rebound_percentage) : null;
    baseData.turnover_percentage = item.turnover_percentage !== null ? parseFloat(item.turnover_percentage) : null;
    baseData.pie = item.pie !== null ? parseFloat(item.pie) : null;
    baseData.pace = item.pace !== null ? parseFloat(item.pace) : null;

    // Metadata for unified queries
    baseData._advanced_games_available = parseInt(item.advanced_games_available) || 0;
    baseData._has_advanced_data = baseData._advanced_games_available > 0;

    return baseData;
  });
};

export const formatUnifiedResults = (results, viewType, apiResponse) => {
  // Enhanced formatting for unified data that can switch between views
  const formattedData = formatApiResults(results, apiResponse);
  
  // Add view-specific formatting
  return formattedData.map(item => ({
    ...item,
    _viewType: viewType,
    _canShowAdvanced: item._has_advanced_data,
    _dataSource: apiResponse?.queryMetadata?.isUnified ? 'unified' : 'legacy'
  }));
};

export const getTableColumns = (viewType, measure, apiResponse, filters) => {
  // Import the column manager here to avoid circular dependency
  const { getColumnsForView } = require('./columnManager');
  return getColumnsForView(viewType, measure, apiResponse, filters);
};

export const formatTableValue = (value, column, format = 'auto') => {
  if (value === null || value === undefined) {
    return '-';
  }

  // Handle different formatting based on column type
  if (format === 'auto') {
    if (column.includes('%') || column.includes('Rating') || column === 'PIE' || column === 'Pace') {
      format = 'decimal';
    } else if (['Name', 'Team', 'TEAM'].includes(column)) {
      format = 'text';
    } else {
      format = 'number';
    }
  }

  switch (format) {
    case 'text':
      return value.toString();
    case 'decimal':
      return typeof value === 'number' ? value.toFixed(1) : value;
    case 'percentage':
      return typeof value === 'number' ? `${value.toFixed(1)}%` : value;
    case 'number':
    default:
      return typeof value === 'number' ? value.toFixed(1) : value;
  }
};

export const getValueForColumn = (item, column) => {
  const columnKey = getColumnKey(column);
  return item[columnKey];
};

export const sortData = (data, sortConfig) => {
  if (!sortConfig.column || !data.length) {
    return data;
  }

  return [...data].sort((a, b) => {
    const aValue = getValueForColumn(a, sortConfig.column);
    const bValue = getValueForColumn(b, sortConfig.column);

    // Handle null/undefined values (advanced stats might be null)
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else {
      comparison = (parseFloat(aValue) || 0) - (parseFloat(bValue) || 0);
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });
};

export const filterDataByView = (data, viewType, measure) => {
  // Filter out rows that don't have required data for the view
  if (viewType === 'advanced') {
    return data.filter(item => item._has_advanced_data);
  }
  
  // For traditional and custom views, all data is valid
  return data;
};

export const detectViewType = (filters, apiResponse) => {
  // Determine the best view type based on filters and API response
  if (apiResponse?.queryMetadata?.recommendedViewType) {
    return apiResponse.queryMetadata.recommendedViewType;
  }

  if (!filters || filters.length === 0) {
    return 'traditional';
  }

  const advancedFilterTypes = [
    'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %',
    'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio',
    'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %',
    'Turnover %', 'PIE', 'Pace'
  ];

  const traditionalFilterTypes = [
    'Team', 'Age', 'Games Played', 'MINS', 'PTS', 'FGM', 'FGA', 'FG%',
    '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB',
    'AST', 'TOV', 'STL', 'BLK', 'PF', '+/-', 'Wins', 'Losses', 'Win %', 'Points'
  ];

  const hasAdvanced = filters.some(f => advancedFilterTypes.includes(f.type));
  const hasTraditional = filters.some(f => traditionalFilterTypes.includes(f.type));

  if (hasAdvanced && hasTraditional) {
    return 'custom';
  } else if (hasAdvanced) {
    return 'advanced';
  } else {
    return 'traditional';
  }
};

export const getDataSummary = (data, viewType, measure) => {
  if (!data || data.length === 0) {
    return null;
  }

  const summary = {
    totalRows: data.length,
    viewType,
    measure,
    hasAdvancedData: data.some(item => item._has_advanced_data),
    advancedDataCoverage: 0
  };

  // Calculate advanced data coverage
  if (summary.hasAdvancedData) {
    const itemsWithAdvancedData = data.filter(item => item._has_advanced_data).length;
    summary.advancedDataCoverage = Math.round((itemsWithAdvancedData / data.length) * 100);
  }

  return summary;
};

export const validateDataForView = (data, viewType) => {
  const issues = [];

  if (!data || data.length === 0) {
    issues.push('No data available');
    return issues;
  }

  if (viewType === 'advanced') {
    const advancedDataCount = data.filter(item => item._has_advanced_data).length;
    if (advancedDataCount === 0) {
      issues.push('No advanced statistics available for this data');
    } else if (advancedDataCount < data.length) {
      issues.push(`Advanced statistics only available for ${advancedDataCount} of ${data.length} entries`);
    }
  }

  return issues;
};