/**
 * Filter validation and type checking utilities - updated with organizer support
 */

const { validateOrganizer } = require('./organizerBuilder');

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

// Enhanced validation function that includes organizer validation
const validateReportConfiguration = (measure, filters, organizer, sortConfig) => {
  const errors = [];
  
  // Validate measure
  if (!measure || !['Players', 'Teams'].includes(measure)) {
    errors.push('Invalid or missing measure. Must be "Players" or "Teams"');
  }
  
  // Validate filters
  if (filters) {
    const filterErrors = validateFilters(filters, measure);
    errors.push(...filterErrors);
  } else {
    errors.push('Filters are required');
  }
  
  // Validate organizer (now always required)
  const normalizedOrganizer = organizer || { type: 'all_games' };
  const organizerErrors = validateOrganizer(normalizedOrganizer);
  if (organizerErrors.length > 0) {
    errors.push(...organizerErrors.map(err => `Organizer: ${err}`));
  }
  
  // Validate sort config
  if (sortConfig) {
    if (typeof sortConfig !== 'object') {
      errors.push('Sort configuration must be an object');
    } else {
      if (sortConfig.column && typeof sortConfig.column !== 'string') {
        errors.push('Sort column must be a string');
      }
      if (sortConfig.direction && !['asc', 'desc'].includes(sortConfig.direction.toLowerCase())) {
        errors.push('Sort direction must be "asc" or "desc"');
      }
    }
  }
  
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

// New function to get filter and organizer compatibility
const getFilterOrganizerCompatibility = (filters, organizer) => {
  const warnings = [];
  const suggestions = [];
  
  if (!organizer || organizer.type === 'all_games') {
    return { warnings, suggestions, compatible: true };
  }
  
  // Check for filters that might not make sense with certain organizers
  const hasTeamFilter = filters.some(f => f.type === 'Team');
  const hasAgeFilter = filters.some(f => f.type === 'Age');
  
  // Team-specific organizers
  if (organizer.type === 'home_away') {
    if (!hasTeamFilter) {
      suggestions.push('Consider adding a team filter when using home/away organizer for more focused analysis');
    }
  }
  
  // Game range organizers
  if (organizer.type === 'last_games' || organizer.type === 'game_range') {
    if (hasAgeFilter) {
      warnings.push('Age filters with game range organizers may produce unexpected results as age is season-level data');
    }
    
    const hasSeasonLevelFilters = filters.some(f => ['Team', 'Age'].includes(f.type));
    if (hasSeasonLevelFilters) {
      suggestions.push('Game-based organizers work best with performance-based filters (PTS, REB, AST, etc.)');
    }
  }
  
  // Performance considerations
  if (organizer.type === 'last_games' && organizer.value > 30) {
    warnings.push('Large "last games" values may impact query performance');
  }
  
  if (organizer.type === 'game_range' && (organizer.to - organizer.from) > 40) {
    warnings.push('Large game ranges may impact query performance');
  }
  
  return {
    warnings,
    suggestions,
    compatible: warnings.length === 0
  };
};

module.exports = {
  validateFilters,
  validateReportConfiguration, // New comprehensive validation function
  hasAdvancedFilters,
  getAvailableFilterTypes,
  isValidOperator,
  isValidMeasure,
  getFilterRequirements,
  getFilterOrganizerCompatibility // New compatibility check function
};