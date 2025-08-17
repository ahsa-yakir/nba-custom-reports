/**
 * Dynamic column management for different view types
 */

export const getColumnsForView = (viewType, measure, apiResponse, filters) => {
  switch (viewType) {
    case 'traditional':
      return getTraditionalColumns(measure);
    case 'advanced':
      return getAdvancedColumns(measure);
    case 'custom':
      return getCustomColumns(measure, filters, apiResponse);
    default:
      return getTraditionalColumns(measure);
  }
};

export const getTraditionalColumns = (measure) => {
  if (measure === 'Players') {
    return [
      'Name', 'TEAM', 'AGE', 'Games Played', 'MINS', 'PTS', 'FGM', 'FGA', 'FG%', 
      '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB', 
      'AST', 'TOV', 'STL', 'BLK', 'PF', '+/-'
    ];
  } else {
    return [
      'Team', 'Games Played', 'Wins', 'Losses', 'Win %', 'PTS', 'FGM', 'FGA', 'FG%', 
      '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB', 
      'AST', 'TOV', 'STL', 'BLK', '+/-'
    ];
  }
};

export const getAdvancedColumns = (measure) => {
  if (measure === 'Players') {
    return [
      'Name', 'TEAM', 'AGE', 'Games Played', 'Offensive Rating', 'Defensive Rating', 
      'Net Rating', 'Usage %', 'True Shooting %', 'Effective FG%', 'Assist %', 
      'Assist Turnover Ratio', 'Assist Ratio', 'Offensive Rebound %', 
      'Defensive Rebound %', 'Rebound %', 'Turnover %', 'PIE', 'Pace'
    ];
  } else {
    return [
      'Team', 'Games Played', 'Offensive Rating', 'Defensive Rating', 'Net Rating', 
      'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio', 
      'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %', 'Turnover %', 
      'PIE', 'Pace'
    ];
  }
};

export const getCustomColumns = (measure, filters, apiResponse) => {
  // Use active columns from API response if available
  if (apiResponse?.queryMetadata?.activeColumns) {
    return apiResponse.queryMetadata.activeColumns;
  }

  // Calculate custom columns based on filters
  const baseColumns = measure === 'Players' 
    ? ['Name', 'TEAM', 'AGE', 'Games Played']
    : ['Team', 'Games Played'];
  
  // Get unique filter types as additional columns
  const filterColumns = [...new Set(filters.map(f => f.type))];
  
  // Combine and deduplicate
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

export const getColumnMetadata = (columns) => {
  return columns.map(column => {
    // Determine column type for better rendering and sorting
    let type = 'numeric';
    let format = 'number';
    
    if (['Name', 'Team', 'TEAM'].includes(column)) {
      type = 'string';
      format = 'text';
    } else if (column.includes('%')) {
      type = 'percentage';
      format = 'percentage';
    } else if (column.includes('Rating')) {
      type = 'rating';
      format = 'decimal';
    }

    return {
      key: column,
      label: column,
      type,
      format,
      sortable: true,
      defaultDirection: type === 'string' ? 'asc' : 'desc'
    };
  });
};

export const isColumnAvailable = (column, viewType, apiResponse) => {
  // Check if a specific column is available in the current data
  if (!apiResponse?.results || apiResponse.results.length === 0) {
    return false;
  }

  // For unified queries, check if the column has data
  const firstRow = apiResponse.results[0];
  const columnKey = getColumnKey(column);
  
  if (!(columnKey in firstRow)) {
    return false;
  }

  // For advanced columns, check if they have non-null values
  if (isAdvancedColumn(column)) {
    return apiResponse.results.some(row => 
      row[columnKey] !== null && 
      row[columnKey] !== undefined && 
      row[columnKey] !== 0
    );
  }

  return true;
};

export const getColumnKey = (column) => {
  // Map display column names to data keys
  const columnMap = {
    'Team': 'team', 'Name': 'name', 'TEAM': 'team', 'AGE': 'age',
    'Games Played': 'games_played', 'Wins': 'wins', 'Losses': 'losses', 'Win %': 'win_pct',
    'PTS': 'pts', 'MINS': 'mins', 'FGM': 'fgm', 'FGA': 'fga', 'FG%': 'fg_pct',
    '3PM': 'tpm', '3PA': 'tpa', '3P%': 'tp_pct',
    'FTM': 'ftm', 'FTA': 'fta', 'FT%': 'ft_pct',
    'OREB': 'oreb', 'DREB': 'dreb', 'REB': 'reb',
    'AST': 'ast', 'TOV': 'tov', 'STL': 'stl', 'BLK': 'blk', 'PF': 'pf', '+/-': 'plus_minus',
    
    // Advanced columns
    'Offensive Rating': 'offensive_rating',
    'Defensive Rating': 'defensive_rating',
    'Net Rating': 'net_rating',
    'Usage %': 'usage_percentage',
    'True Shooting %': 'true_shooting_percentage',
    'Effective FG%': 'effective_field_goal_percentage',
    'Assist %': 'assist_percentage',
    'Assist Turnover Ratio': 'assist_turnover_ratio',
    'Assist Ratio': 'assist_ratio',
    'Offensive Rebound %': 'offensive_rebound_percentage',
    'Defensive Rebound %': 'defensive_rebound_percentage',
    'Rebound %': 'rebound_percentage',
    'Turnover %': 'turnover_percentage',
    'PIE': 'pie',
    'Pace': 'pace'
  };
  
  return columnMap[column] || column.toLowerCase().replace(/\s+/g, '_');
};

export const isAdvancedColumn = (column) => {
  const advancedColumns = [
    'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %',
    'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio',
    'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %',
    'Turnover %', 'PIE', 'Pace'
  ];
  return advancedColumns.includes(column);
};

export const filterAvailableColumns = (columns, apiResponse) => {
  return columns.filter(column => isColumnAvailable(column, null, apiResponse));
};

export const getColumnTooltip = (column) => {
  const tooltips = {
    'Offensive Rating': 'Points produced per 100 possessions',
    'Defensive Rating': 'Points allowed per 100 possessions',
    'Net Rating': 'Point differential per 100 possessions',
    'Usage %': 'Percentage of team possessions used while on court',
    'True Shooting %': 'Shooting efficiency including 2pt, 3pt, and free throws',
    'Effective FG%': 'Field goal percentage adjusted for 3-point shots',
    'PIE': 'Player Impact Estimate - overall contribution metric',
    'Pace': 'Possessions per 48 minutes'
  };
  
  return tooltips[column] || '';
};