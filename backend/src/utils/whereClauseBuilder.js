/**
 * Builds WHERE clauses from filter arrays - simplified version
 */
const { getColumnName } = require('./metadata');

const buildSingleCondition = (filter, measure, paramIndex, isAdvanced = false) => {
  const columnName = getColumnName(filter.type, measure, isAdvanced);
  if (!columnName) {
    console.warn(`Unknown filter type: ${filter.type} for measure: ${measure}`);
    return { condition: null, filterParams: [] };
  }
  
  // Check if this is a percentage column that needs value conversion
  const isPercentageColumn = filter.type.includes('%') || filter.type.includes('Rating');
  
  // Build condition based on operator
  switch (filter.operator) {
    case 'greater than':
      const gtValue = isPercentageColumn ? parseFloat(filter.value) / 100 : parseFloat(filter.value);
      return {
        condition: `${columnName} > $${paramIndex}`,
        filterParams: [gtValue]
      };
      
    case 'less than':
      const ltValue = isPercentageColumn ? parseFloat(filter.value) / 100 : parseFloat(filter.value);
      return {
        condition: `${columnName} < $${paramIndex}`,
        filterParams: [ltValue]
      };
      
    case 'equals':
      // Handle string vs numeric comparisons
      let eqValue = isNaN(filter.value) ? filter.value : parseFloat(filter.value);
      if (isPercentageColumn && !isNaN(eqValue)) {
        eqValue = eqValue / 100;
      }
      return {
        condition: `${columnName} = $${paramIndex}`,
        filterParams: [eqValue]
      };
      
    case 'between':
      const minValue = isPercentageColumn ? parseFloat(filter.value) / 100 : parseFloat(filter.value);
      const maxValue = isPercentageColumn ? parseFloat(filter.value2) / 100 : parseFloat(filter.value2);
      return {
        condition: `${columnName} BETWEEN $${paramIndex} AND $${paramIndex + 1}`,
        filterParams: [minValue, maxValue]
      };
      
    case 'in':
      if (!filter.values || filter.values.length === 0) {
        return { condition: null, filterParams: [] };
      }
      const inValues = isPercentageColumn 
        ? filter.values.map(v => parseFloat(v) / 100)
        : filter.values;
      const placeholders = inValues.map((_, i) => `$${paramIndex + i}`).join(', ');
      return {
        condition: `${columnName} IN (${placeholders})`,
        filterParams: inValues
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

module.exports = {
  buildWhereClause,
  buildSingleCondition
};