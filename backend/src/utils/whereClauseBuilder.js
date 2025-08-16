/**
 * Builds WHERE clauses from filter arrays
 */
const { getColumnName } = require('./columnMappings');

const buildSingleCondition = (filter, measure, paramIndex, isAdvanced = false) => {
  const columnName = getColumnName(filter.type, measure, isAdvanced);
  if (!columnName) {
    console.warn(`Unknown filter type: ${filter.type} for measure: ${measure}`);
    return { condition: null, filterParams: [] };
  }
  
  // Build condition based on operator
  switch (filter.operator) {
    case 'greater than':
      return {
        condition: `${columnName} > $${paramIndex}`,
        filterParams: [parseFloat(filter.value)]
      };
      
    case 'less than':
      return {
        condition: `${columnName} < $${paramIndex}`,
        filterParams: [parseFloat(filter.value)]
      };
      
    case 'equals':
      // Handle string vs numeric comparisons
      const value = isNaN(filter.value) ? filter.value : parseFloat(filter.value);
      return {
        condition: `${columnName} = $${paramIndex}`,
        filterParams: [value]
      };
      
    case 'between':
      return {
        condition: `${columnName} BETWEEN $${paramIndex} AND $${paramIndex + 1}`,
        filterParams: [parseFloat(filter.value), parseFloat(filter.value2)]
      };
      
    case 'in':
      if (!filter.values || filter.values.length === 0) {
        return { condition: null, filterParams: [] };
      }
      const placeholders = filter.values.map((_, i) => `$${paramIndex + i}`).join(', ');
      return {
        condition: `${columnName} IN (${placeholders})`,
        filterParams: filter.values
      };
      
    default:
      console.warn(`Unknown operator: ${filter.operator}`);
      return { condition: null, filterParams: [] };
  }
};

const buildWhereClause = (filters, measure, isAdvanced = false) => {
  if (!filters || filters.length === 0) {
    return { whereClause: '', params: [] };
  }
  
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  filters.forEach(filter => {
    try {
      const { condition, filterParams } = buildSingleCondition(filter, measure, paramIndex, isAdvanced);
      if (condition) {
        conditions.push(condition);
        params.push(...filterParams);
        paramIndex += filterParams.length;
      }
    } catch (error) {
      console.warn(`Error building condition for filter ${filter.type}:`, error.message);
    }
  });
  
  const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
  
  return { whereClause, params };
};

const buildHavingClause = (filters, measure, isAdvanced = false) => {
  // For aggregated columns that need HAVING instead of WHERE
  const havingFilters = filters.filter(filter => {
    const aggregatedTypes = [
      'Games Played', 'PTS', 'MINS', 'FGM', 'FGA', 'FG%', 
      '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%',
      'OREB', 'DREB', 'REB', 'AST', 'TOV', 'STL', 'BLK', '+/-',
      'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %',
      'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio',
      'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %', 
      'Rebound %', 'Turnover %', 'PIE', 'Pace'
    ];
    return aggregatedTypes.includes(filter.type);
  });
  
  if (havingFilters.length === 0) {
    return { havingClause: '', params: [] };
  }
  
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  havingFilters.forEach(filter => {
    const { condition, filterParams } = buildSingleCondition(filter, measure, paramIndex, isAdvanced);
    if (condition) {
      conditions.push(condition);
      params.push(...filterParams);
      paramIndex += filterParams.length;
    }
  });
  
  const havingClause = conditions.length > 0 ? `HAVING ${conditions.join(' AND ')}` : '';
  
  return { havingClause, params };
};

const combineWhereAndHaving = (filters, measure, isAdvanced = false) => {
  // Separate filters into WHERE and HAVING categories
  const whereFilters = filters.filter(filter => {
    const nonAggregatedTypes = ['Team', 'Age'];
    return nonAggregatedTypes.includes(filter.type);
  });
  
  const havingFilters = filters.filter(filter => {
    const nonAggregatedTypes = ['Team', 'Age'];
    return !nonAggregatedTypes.includes(filter.type);
  });
  
  const { whereClause, params: whereParams } = buildWhereClause(whereFilters, measure, isAdvanced);
  const { havingClause, params: havingParams } = buildHavingClause(havingFilters, measure, isAdvanced);
  
  return {
    whereClause,
    havingClause,
    params: [...whereParams, ...havingParams]
  };
};

const sanitizeFilterValue = (value, operator) => {
  if (operator === 'in') {
    return Array.isArray(value) ? value : [value];
  }
  
  if (operator === 'between') {
    return {
      min: parseFloat(value.min || value),
      max: parseFloat(value.max || value)
    };
  }
  
  // For string comparisons, don't convert to number
  if (typeof value === 'string' && isNaN(value)) {
    return value.trim();
  }
  
  return parseFloat(value);
};

module.exports = {
  buildWhereClause,
  buildSingleCondition,
  buildHavingClause,
  combineWhereAndHaving,
  sanitizeFilterValue
};