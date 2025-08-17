/**
 * Enhanced sorting utilities supporting unified queries
 */
const { getSortColumnMapping } = require('./columnMappings');

const buildOrderByClause = (sortConfig, measure, isAdvanced = false, isUnified = false) => {
  if (!sortConfig || !sortConfig.column) {
    // Default sorting based on query type
    if (isUnified) {
      // For unified queries, use smart defaults based on available data
      if (measure === 'Players') {
        return 'ORDER BY pts DESC'; // Default to points for unified player queries
      } else {
        return 'ORDER BY wins DESC'; // Default to wins for unified team queries
      }
    }
    
    // Legacy default sorting
    if (measure === 'Players') {
      return isAdvanced ? 'ORDER BY offensive_rating DESC' : 'ORDER BY pts DESC';
    } else {
      return isAdvanced ? 'ORDER BY net_rating DESC' : 'ORDER BY wins DESC';
    }
  }
  
  const sortColumns = getSortColumnMapping(measure, isAdvanced, isUnified);
  const sortColumn = sortColumns[sortConfig.column];
  
  if (!sortColumn) {
    console.warn(`Unknown sort column: ${sortConfig.column}, falling back to default`);
    
    // Fallback to default sorting
    if (isUnified) {
      if (measure === 'Players') {
        return 'ORDER BY pts DESC';
      } else {
        return 'ORDER BY wins DESC';
      }
    }
    
    if (measure === 'Players') {
      return isAdvanced ? 'ORDER BY offensive_rating DESC' : 'ORDER BY pts DESC';
    } else {
      return isAdvanced ? 'ORDER BY net_rating DESC' : 'ORDER BY wins DESC';
    }
  }
  
  const direction = sortConfig.direction === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${sortColumn} ${direction}`;
};

const getDefaultSort = (measure, isAdvanced = false, isUnified = false) => {
  if (isUnified) {
    // Smart defaults for unified queries
    if (measure === 'Players') {
      return { column: 'PTS', direction: 'desc' };
    } else {
      return { column: 'Wins', direction: 'desc' };
    }
  }
  
  // Legacy defaults
  if (measure === 'Players') {
    return {
      column: isAdvanced ? 'Offensive Rating' : 'PTS',
      direction: 'desc'
    };
  } else {
    return {
      column: isAdvanced ? 'Net Rating' : 'Wins',
      direction: 'desc'
    };
  }
};

const getSmartDefaultSort = (measure, filters) => {
  // Determine the best default sort based on active filters
  if (!filters || filters.length === 0) {
    return getDefaultSort(measure, false, false);
  }
  
  // If we have filters, use the first numeric filter as the sort column
  const numericFilters = filters.filter(f => 
    !['Team', 'Age'].includes(f.type) && 
    ['greater than', 'less than', 'between'].includes(f.operator)
  );
  
  if (numericFilters.length > 0) {
    return {
      column: numericFilters[0].type,
      direction: 'desc'
    };
  }
  
  // Fall back to defaults
  return getDefaultSort(measure, false, true);
};

const isValidSortColumn = (column, measure, isAdvanced = false, isUnified = false) => {
  const sortColumns = getSortColumnMapping(measure, isAdvanced, isUnified);
  return Object.keys(sortColumns).includes(column);
};

const isValidSortDirection = (direction) => {
  return ['asc', 'desc'].includes(direction?.toLowerCase());
};

const normalizeSortConfig = (sortConfig, measure, isAdvanced = false, isUnified = false) => {
  if (!sortConfig) {
    return getDefaultSort(measure, isAdvanced, isUnified);
  }
  
  const normalizedConfig = {
    column: sortConfig.column,
    direction: (sortConfig.direction || 'desc').toLowerCase()
  };
  
  // Validate column
  if (!isValidSortColumn(normalizedConfig.column, measure, isAdvanced, isUnified)) {
    console.warn(`Invalid sort column: ${normalizedConfig.column}, using default`);
    return getDefaultSort(measure, isAdvanced, isUnified);
  }
  
  // Validate direction
  if (!isValidSortDirection(normalizedConfig.direction)) {
    console.warn(`Invalid sort direction: ${normalizedConfig.direction}, using desc`);
    normalizedConfig.direction = 'desc';
  }
  
  return normalizedConfig;
};

const buildMultiColumnSort = (sortConfigs, measure, isAdvanced = false, isUnified = false) => {
  if (!Array.isArray(sortConfigs) || sortConfigs.length === 0) {
    return buildOrderByClause(null, measure, isAdvanced, isUnified);
  }
  
  const sortColumns = getSortColumnMapping(measure, isAdvanced, isUnified);
  const validSorts = [];
  
  sortConfigs.forEach(config => {
    const normalizedConfig = normalizeSortConfig(config, measure, isAdvanced, isUnified);
    const sortColumn = sortColumns[normalizedConfig.column];
    
    if (sortColumn) {
      const direction = normalizedConfig.direction === 'asc' ? 'ASC' : 'DESC';
      validSorts.push(`${sortColumn} ${direction}`);
    }
  });
  
  if (validSorts.length === 0) {
    return buildOrderByClause(null, measure, isAdvanced, isUnified);
  }
  
  return `ORDER BY ${validSorts.join(', ')}`;
};

const getAvailableSortColumns = (measure, isAdvanced = false, isUnified = false) => {
  const sortColumns = getSortColumnMapping(measure, isAdvanced, isUnified);
  return Object.keys(sortColumns);
};

const getSortColumnInfo = (measure, isAdvanced = false, isUnified = false) => {
  const sortColumns = getSortColumnMapping(measure, isAdvanced, isUnified);
  
  return Object.keys(sortColumns).map(column => {
    // Determine column type for better UI handling
    let type = 'numeric';
    if (['Name', 'Team', 'TEAM'].includes(column)) {
      type = 'string';
    } else if (column.includes('%') || column.includes('Rating')) {
      type = 'percentage';
    }
    
    return {
      column,
      type,
      dbColumn: sortColumns[column],
      defaultDirection: type === 'string' ? 'asc' : 'desc'
    };
  });
};

const optimizeSortForQuery = (sortConfig, measure, isUnified = false) => {
  // For unified queries, we might want to adjust sorting strategy
  if (!isUnified) {
    return sortConfig;
  }
  
  // For unified queries, ensure we're not sorting by columns that might be NULL
  const safeColumns = measure === 'Players' 
    ? ['Name', 'TEAM', 'AGE', 'Games Played', 'PTS', 'REB', 'AST']
    : ['Team', 'Games Played', 'Wins', 'PTS', 'REB', 'AST'];
  
  if (sortConfig && !safeColumns.includes(sortConfig.column)) {
    console.warn(`Sort column ${sortConfig.column} may contain NULLs in unified query, consider alternatives`);
  }
  
  return sortConfig;
};

module.exports = {
  buildOrderByClause,
  getDefaultSort,
  getSmartDefaultSort,
  isValidSortColumn,
  isValidSortDirection,
  normalizeSortConfig,
  buildMultiColumnSort,
  getAvailableSortColumns,
  getSortColumnInfo,
  optimizeSortForQuery
};