/**
 * Filter validation and type checking utilities
 */

const validateFilters = (filters, measure) => {
  const errors = [];
  
  if (!Array.isArray(filters)) {
    errors.push('Filters must be an array');
    return errors;
  }
  
  filters.forEach((filter, index) => {
    if (!filter.type) {
      errors.push(`Filter ${index + 1}: missing type`);
    }
    
    if (!filter.operator) {
      errors.push(`Filter ${index + 1}: missing operator`);
    }
    
    if (filter.operator === 'between' && (!filter.value || !filter.value2)) {
      errors.push(`Filter ${index + 1}: 'between' operator requires both value and value2`);
    }
    
    if (filter.operator === 'in' && (!filter.values || filter.values.length === 0)) {
      errors.push(`Filter ${index + 1}: 'in' operator requires values array`);
    }
    
    if (['greater than', 'less than', 'equals'].includes(filter.operator) && !filter.value) {
      errors.push(`Filter ${index + 1}: '${filter.operator}' operator requires value`);
    }
    
    // Validate filter type for measure
    const availableTypes = getAvailableFilterTypes(measure);
    if (filter.type && !availableTypes.all.includes(filter.type)) {
      errors.push(`Filter ${index + 1}: '${filter.type}' is not a valid filter type for ${measure}`);
    }
  });
  
  return errors;
};

const hasAdvancedFilters = (filters) => {
  const advancedFilterTypes = [
    'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %', 
    'True Shooting %', 'Effective FG%', 'Assist %', 'Rebound %', 
    'Turnover %', 'PIE', 'Pace', 'Assist Turnover Ratio', 
    'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %'
  ];
  
  return filters.some(filter => advancedFilterTypes.includes(filter.type));
};

const getAvailableFilterTypes = (measure) => {
  const traditionalPlayerFilters = [
    'Team', 'Age', 'Games Played', 'MINS', 'PTS', 'FGM', 'FGA', 'FG%',
    '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB',
    'AST', 'TOV', 'STL', 'BLK', 'PF', '+/-'
  ];
  
  const advancedPlayerFilters = [
    'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %',
    'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio',
    'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %',
    'Turnover %', 'PIE', 'Pace'
  ];
  
  const traditionalTeamFilters = [
    'Wins', 'Games Played', 'Points', 'FGM', 'FGA', 'FG%', '3PM', 'FTM',
    'FTA', 'FT%', 'OREB', 'DREB', 'REB', 'AST', 'TOV', 'STL', 'BLK', '+/-'
  ];
  
  const advancedTeamFilters = [
    'Offensive Rating', 'Defensive Rating', 'Net Rating', 'True Shooting %',
    'Effective FG%', 'Assist %', 'Assist Turnover Ratio', 'Offensive Rebound %',
    'Defensive Rebound %', 'Rebound %', 'Turnover %', 'PIE', 'Pace'
  ];
  
  if (measure === 'Players') {
    return {
      traditional: traditionalPlayerFilters,
      advanced: advancedPlayerFilters,
      all: [...traditionalPlayerFilters, ...advancedPlayerFilters]
    };
  } else {
    return {
      traditional: traditionalTeamFilters,
      advanced: advancedTeamFilters,
      all: [...traditionalTeamFilters, ...advancedTeamFilters]
    };
  }
};

const isValidOperator = (operator) => {
  const validOperators = [
    'greater than', 'less than', 'equals', 'between', 'in'
  ];
  return validOperators.includes(operator);
};

const isValidMeasure = (measure) => {
  return ['Players', 'Teams'].includes(measure);
};

const getFilterRequirements = (operator) => {
  switch (operator) {
    case 'greater than':
    case 'less than':
    case 'equals':
      return { required: ['value'], optional: [] };
    case 'between':
      return { required: ['value', 'value2'], optional: [] };
    case 'in':
      return { required: ['values'], optional: [] };
    default:
      return { required: [], optional: [] };
  }
};

module.exports = {
  validateFilters,
  hasAdvancedFilters,
  getAvailableFilterTypes,
  isValidOperator,
  isValidMeasure,
  getFilterRequirements
};