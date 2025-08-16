/**
 * Handles ORDER BY clause generation
 */
const { getSortColumnMapping } = require('./columnMappings');

const buildOrderByClause = (sortConfig, measure, isAdvanced = false) => {
  if (!sortConfig || !sortConfig.column) {
    // Default sorting
    if (measure === 'Players') {
      return isAdvanced ? 'ORDER BY offensive_rating DESC' : 'ORDER BY pts DESC';
    } else {
      return isAdvanced ? 'ORDER BY net_rating DESC' : 'ORDER BY wins DESC';
    }
  }
  
  const sortColumns = getSortColumnMapping(measure, isAdvanced);
  const sortColumn = sortColumns[sortConfig.column];
  
  if (!sortColumn) {
    console.warn(`Unknown sort column: ${sortConfig.column}`);
    // Fallback to default sorting
    if (measure === 'Players') {
      return isAdvanced ? 'ORDER BY offensive_rating DESC' : 'ORDER BY pts DESC';
    } else {
      return isAdvanced ? 'ORDER BY net_rating DESC' : 'ORDER BY wins DESC';
    }
  }
  
  const direction = sortConfig.direction === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${sortColumn} ${direction}`;
};

const getDefaultSort = (measure, isAdvanced = false) => {
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

const isValidSortColumn = (column, measure, isAdvanced = false) => {
  const sortColumns = getSortColumnMapping(measure, isAdvanced);
  return Object.keys(sortColumns).includes(column);
};

const isValidSortDirection = (direction) => {
  return ['asc', 'desc'].includes(direction?.toLowerCase());
};

const normalizeSortConfig = (sortConfig, measure, isAdvanced = false) => {
  if (!sortConfig) {
    return getDefaultSort(measure, isAdvanced);
  }
  
  const normalizedConfig = {
    column: sortConfig.column,
    direction: (sortConfig.direction || 'desc').toLowerCase()
  };
  
  // Validate column
  if (!isValidSortColumn(normalizedConfig.column, measure, isAdvanced)) {
    console.warn(`Invalid sort column: ${normalizedConfig.column}, using default`);
    return getDefaultSort(measure, isAdvanced);
  }
  
  // Validate direction
  if (!isValidSortDirection(normalizedConfig.direction)) {
    console.warn(`Invalid sort direction: ${normalizedConfig.direction}, using desc`);
    normalizedConfig.direction = 'desc';
  }
  
  return normalizedConfig;
};

const buildMultiColumnSort = (sortConfigs, measure, isAdvanced = false) => {
  if (!Array.isArray(sortConfigs) || sortConfigs.length === 0) {
    return buildOrderByClause(null, measure, isAdvanced);
  }
  
  const sortColumns = getSortColumnMapping(measure, isAdvanced);
  const validSorts = [];
  
  sortConfigs.forEach(config => {
    const normalizedConfig = normalizeSortConfig(config, measure, isAdvanced);
    const sortColumn = sortColumns[normalizedConfig.column];
    
    if (sortColumn) {
      const direction = normalizedConfig.direction === 'asc' ? 'ASC' : 'DESC';
      validSorts.push(`${sortColumn} ${direction}`);
    }
  });
  
  if (validSorts.length === 0) {
    return buildOrderByClause(null, measure, isAdvanced);
  }
  
  return `ORDER BY ${validSorts.join(', ')}`;
};

module.exports = {
  buildOrderByClause,
  getDefaultSort,
  isValidSortColumn,
  isValidSortDirection,
  normalizeSortConfig,
  buildMultiColumnSort
};