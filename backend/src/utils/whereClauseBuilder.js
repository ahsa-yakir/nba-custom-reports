/**
 * Builds WHERE clauses from filter arrays - updated to support organizer parameter offsets
 */
const { getColumnName } = require('./metadata');
const { ValueConverter } = require('./valueConverter');

const buildSingleCondition = (filter, measure, paramIndex, isAdvanced = false) => {
  const columnName = getColumnName(filter.type, measure, isAdvanced);
  if (!columnName) {
    console.warn(`Unknown filter type: ${filter.type} for measure: ${measure}`);
    return { condition: null, filterParams: [] };
  }
  
  // Build condition based on operator using ValueConverter
  switch (filter.operator) {
    case 'greater than':
      const gtValue = ValueConverter.convertFilterValue(filter.value, filter.type);
      return {
        condition: `${columnName} > $${paramIndex}`,
        filterParams: [gtValue]
      };
      
    case 'less than':
      const ltValue = ValueConverter.convertFilterValue(filter.value, filter.type);
      return {
        condition: `${columnName} < $${paramIndex}`,
        filterParams: [ltValue]
      };
      
    case 'equals':
      const eqValue = ValueConverter.convertFilterValue(filter.value, filter.type);
      return {
        condition: `${columnName} = $${paramIndex}`,
        filterParams: [eqValue]
      };
      
    case 'between':
      const minValue = ValueConverter.convertFilterValue(filter.value, filter.type);
      const maxValue = ValueConverter.convertFilterValue(filter.value2, filter.type);
      return {
        condition: `${columnName} BETWEEN $${paramIndex} AND $${paramIndex + 1}`,
        filterParams: [minValue, maxValue]
      };
      
    case 'in':
      if (!filter.values || filter.values.length === 0) {
        return { condition: null, filterParams: [] };
      }
      const inValues = ValueConverter.convertFilterValues(filter.values, filter.type);
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

const buildWhereClause = (filters, measure, isAdvanced = false, startParamIndex = 1) => {
  if (!filters || filters.length === 0) {
    return { whereClause: '', params: [] };
  }
  
  const conditions = [];
  const params = [];
  let paramIndex = startParamIndex;
  
  filters.forEach(filter => {
    try {
      // Validate the filter value before building condition
      const validation = ValueConverter.validateValue(filter.value, filter.type);
      if (!validation.valid) {
        console.warn(`Invalid filter value for ${filter.type}: ${validation.message}`);
        return; // Skip this filter
      }
      
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

// Enhanced function to validate all filters before building query
const validateFiltersWithConverter = (filters, measure) => {
  const errors = [];
  
  if (!Array.isArray(filters)) {
    errors.push('Filters must be an array');
    return errors;
  }
  
  filters.forEach((filter, index) => {
    const filterNum = index + 1;
    
    // Check required properties
    if (!filter.type) {
      errors.push(`Filter ${filterNum}: type is required`);
      return;
    }
    
    if (!filter.operator) {
      errors.push(`Filter ${filterNum}: operator is required`);
      return;
    }
    
    // Check if column exists
    const columnName = getColumnName(filter.type, measure, false);
    if (!columnName) {
      errors.push(`Filter ${filterNum}: unknown column type "${filter.type}"`);
      return;
    }
    
    // Validate values using ValueConverter
    switch (filter.operator) {
      case 'greater than':
      case 'less than':
      case 'equals':
        if (filter.value === null || filter.value === undefined) {
          errors.push(`Filter ${filterNum}: value is required for ${filter.operator} operator`);
        } else {
          const validation = ValueConverter.validateValue(filter.value, filter.type);
          if (!validation.valid) {
            errors.push(`Filter ${filterNum}: ${validation.message}`);
          }
        }
        break;
        
      case 'between':
        if (filter.value === null || filter.value === undefined) {
          errors.push(`Filter ${filterNum}: value is required for between operator`);
        } else {
          const validation = ValueConverter.validateValue(filter.value, filter.type);
          if (!validation.valid) {
            errors.push(`Filter ${filterNum}: ${validation.message} (first value)`);
          }
        }
        
        if (filter.value2 === null || filter.value2 === undefined) {
          errors.push(`Filter ${filterNum}: value2 is required for between operator`);
        } else {
          const validation = ValueConverter.validateValue(filter.value2, filter.type);
          if (!validation.valid) {
            errors.push(`Filter ${filterNum}: ${validation.message} (second value)`);
          }
        }
        break;
        
      case 'in':
        if (!filter.values || !Array.isArray(filter.values) || filter.values.length === 0) {
          errors.push(`Filter ${filterNum}: values array is required for in operator`);
        } else {
          const validation = ValueConverter.validateValues(filter.values, filter.type);
          if (!validation.valid) {
            errors.push(`Filter ${filterNum}: ${validation.message}`);
          }
        }
        break;
        
      default:
        errors.push(`Filter ${filterNum}: unknown operator "${filter.operator}"`);
        break;
    }
  });
  
  return errors;
};

module.exports = {
  buildWhereClause,
  buildSingleCondition,
  validateFiltersWithConverter
};