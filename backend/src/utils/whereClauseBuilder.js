/**
 * Fixed WHERE clause builder that works with aggregated data
 * Key change: Uses aggregated column names that match the SELECT aliases
 */
const { ValueConverter } = require('./valueConverter');

// Mapping from filter types to aggregated column names (these must match SELECT aliases)
const getAggregatedColumnName = (filterType, measure) => {
  // Player aggregated column mappings
  const playerAggregatedColumns = {
    // Identity columns
    'Name': 'p.name',
    'Team': 't.team_code', 
    'TEAM': 't.team_code',
    'Age': 'p.age',
    'AGE': 'p.age',
    'Games Played': 'COUNT(DISTINCT scoped_games.game_id)',

    // Traditional stats (these are now aggregated averages)
    'MINS': 'AVG(pgs.minutes_played)',
    'PTS': 'AVG(pgs.points)',
    'FGM': 'AVG(pgs.field_goals_made)',
    'FGA': 'AVG(pgs.field_goals_attempted)', 
    'FG%': 'AVG(pgs.field_goal_percentage)',
    '3PM': 'AVG(pgs.three_pointers_made)',
    '3PA': 'AVG(pgs.three_pointers_attempted)',
    '3P%': 'AVG(pgs.three_point_percentage)',
    'FTM': 'AVG(pgs.free_throws_made)',
    'FTA': 'AVG(pgs.free_throws_attempted)',
    'FT%': 'AVG(pgs.free_throw_percentage)',
    'OREB': 'AVG(pgs.offensive_rebounds)',
    'DREB': 'AVG(pgs.defensive_rebounds)',
    'REB': 'AVG(pgs.total_rebounds)',
    'AST': 'AVG(pgs.assists)',
    'TOV': 'AVG(pgs.turnovers)',
    'STL': 'AVG(pgs.steals)',
    'BLK': 'AVG(pgs.blocks)',
    'PF': 'AVG(pgs.personal_fouls)',
    '+/-': 'AVG(pgs.plus_minus)',

    // Advanced stats (aggregated averages)
    'Offensive Rating': 'AVG(pas.offensive_rating)',
    'Defensive Rating': 'AVG(pas.defensive_rating)',
    'Net Rating': 'AVG(pas.net_rating)',
    'Usage %': 'AVG(pas.usage_percentage)',
    'True Shooting %': 'AVG(pas.true_shooting_percentage)',
    'Effective FG%': 'AVG(pas.effective_field_goal_percentage)',
    'Assist %': 'AVG(pas.assist_percentage)',
    'Assist Turnover Ratio': 'AVG(pas.assist_turnover_ratio)',
    'Assist Ratio': 'AVG(pas.assist_ratio)',
    'Offensive Rebound %': 'AVG(pas.offensive_rebound_percentage)',
    'Defensive Rebound %': 'AVG(pas.defensive_rebound_percentage)',
    'Rebound %': 'AVG(pas.rebound_percentage)',
    'Turnover %': 'AVG(pas.turnover_percentage)',
    'PIE': 'AVG(pas.pie)',
    'Pace': 'AVG(pas.pace)'
  };

  // Team aggregated column mappings
  const teamAggregatedColumns = {
    // Identity columns
    'Team': 't.team_code',
    'Games Played': 'COUNT(DISTINCT scoped_games.game_id)',

    // Traditional stats
    'Points': 'AVG(tgs.points)',
    'Wins': 'SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END)',
    'Losses': 'SUM(CASE WHEN tgs.win = FALSE THEN 1 ELSE 0 END)',
    'Win %': '(SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*))',
    'FGM': 'AVG(tgs.field_goals_made)',
    'FGA': 'AVG(tgs.field_goals_attempted)',
    'FG%': 'AVG(tgs.field_goal_percentage)',
    '3PM': 'AVG(tgs.three_pointers_made)',
    '3PA': 'AVG(tgs.three_pointers_attempted)',
    '3P%': 'AVG(tgs.three_point_percentage)',
    'FTM': 'AVG(tgs.free_throws_made)',
    'FTA': 'AVG(tgs.free_throws_attempted)',
    'FT%': 'AVG(tgs.free_throw_percentage)',
    'OREB': 'AVG(tgs.offensive_rebounds)',
    'DREB': 'AVG(tgs.defensive_rebounds)',
    'REB': 'AVG(tgs.total_rebounds)',
    'AST': 'AVG(tgs.assists)',
    'TOV': 'AVG(tgs.turnovers)',
    'STL': 'AVG(tgs.steals)',
    'BLK': 'AVG(tgs.blocks)',
    '+/-': 'AVG(tgs.plus_minus)',

    // Advanced stats
    'Offensive Rating': 'AVG(tas.offensive_rating)',
    'Defensive Rating': 'AVG(tas.defensive_rating)',
    'Net Rating': 'AVG(tas.net_rating)',
    'True Shooting %': 'AVG(tas.true_shooting_percentage)',
    'Effective FG%': 'AVG(tas.effective_field_goal_percentage)',
    'Assist %': 'AVG(tas.assist_percentage)',
    'Assist Turnover Ratio': 'AVG(tas.assist_turnover_ratio)',
    'Offensive Rebound %': 'AVG(tas.offensive_rebound_percentage)',
    'Defensive Rebound %': 'AVG(tas.defensive_rebound_percentage)',
    'Rebound %': 'AVG(tas.rebound_percentage)',
    'Turnover %': 'AVG(tas.turnover_percentage)',
    'PIE': 'AVG(tas.pie)',
    'Pace': 'AVG(tas.pace)'
  };

  const columns = measure === 'Players' ? playerAggregatedColumns : teamAggregatedColumns;
  return columns[filterType] || null;
};

const buildSingleCondition = (filter, measure, paramIndex) => {
  const columnName = getAggregatedColumnName(filter.type, measure);
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
      
      const { condition, filterParams } = buildSingleCondition(filter, measure, paramIndex);
      if (condition) {
        conditions.push(condition);
        params.push(...filterParams);
        paramIndex += filterParams.length;
      }
    } catch (error) {
      console.warn(`Error building condition for filter ${filter.type}:`, error.message);
    }
  });
  
  // For aggregated data, we use AND to append to HAVING clause
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
    const columnName = getAggregatedColumnName(filter.type, measure);
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
  validateFiltersWithConverter,
  getAggregatedColumnName
};