/**
 * Unit tests for whereClauseBuilder.js utility
 * Tests WHERE clause building for aggregated NBA statistics queries
 */

// Mock the ValueConverter module
jest.mock('../../src/utils/valueConverter', () => ({
  ValueConverter: {
    convertFilterValue: jest.fn(),
    convertFilterValues: jest.fn(),
    validateValue: jest.fn()
  }
}));

const {
  buildWhereClause,
  buildSingleCondition,
  validateFiltersWithConverter,
  getAggregatedColumnName
} = require('../../src/utils/whereClauseBuilder');

const { ValueConverter } = require('../../src/utils/valueConverter');

describe('whereClauseBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    ValueConverter.convertFilterValue.mockImplementation((value, type) => {
      // Mock percentage conversion
      if (type === 'FG%' || type === '3P%' || type === 'FT%' || type.includes('%')) {
        return typeof value === 'number' ? value / 100 : value;
      }
      return value;
    });
    
    ValueConverter.convertFilterValues.mockImplementation((values, type) => {
      if (Array.isArray(values)) {
        return values.map(value => ValueConverter.convertFilterValue(value, type));
      }
      return values;
    });
    
    ValueConverter.validateValue.mockReturnValue({ valid: true, message: '' });
  });

  describe('getAggregatedColumnName', () => {
    describe('Player columns', () => {
      test('should return correct identity columns for Players', () => {
        expect(getAggregatedColumnName('Name', 'Players')).toBe('p.name');
        expect(getAggregatedColumnName('Team', 'Players')).toBe('t.team_code');
        expect(getAggregatedColumnName('TEAM', 'Players')).toBe('t.team_code');
        expect(getAggregatedColumnName('Age', 'Players')).toBe('p.age');
        expect(getAggregatedColumnName('AGE', 'Players')).toBe('p.age');
        expect(getAggregatedColumnName('Games Played', 'Players')).toBe('COUNT(DISTINCT scoped_games.game_id)');
      });

      test('should return correct traditional stat columns for Players', () => {
        expect(getAggregatedColumnName('MINS', 'Players')).toBe('AVG(pgs.minutes_played)');
        expect(getAggregatedColumnName('PTS', 'Players')).toBe('AVG(pgs.points)');
        expect(getAggregatedColumnName('FGM', 'Players')).toBe('AVG(pgs.field_goals_made)');
        expect(getAggregatedColumnName('FGA', 'Players')).toBe('AVG(pgs.field_goals_attempted)');
        expect(getAggregatedColumnName('FG%', 'Players')).toBe('AVG(pgs.field_goal_percentage)');
        expect(getAggregatedColumnName('3PM', 'Players')).toBe('AVG(pgs.three_pointers_made)');
        expect(getAggregatedColumnName('3PA', 'Players')).toBe('AVG(pgs.three_pointers_attempted)');
        expect(getAggregatedColumnName('3P%', 'Players')).toBe('AVG(pgs.three_point_percentage)');
        expect(getAggregatedColumnName('FTM', 'Players')).toBe('AVG(pgs.free_throws_made)');
        expect(getAggregatedColumnName('FTA', 'Players')).toBe('AVG(pgs.free_throws_attempted)');
        expect(getAggregatedColumnName('FT%', 'Players')).toBe('AVG(pgs.free_throw_percentage)');
        expect(getAggregatedColumnName('OREB', 'Players')).toBe('AVG(pgs.offensive_rebounds)');
        expect(getAggregatedColumnName('DREB', 'Players')).toBe('AVG(pgs.defensive_rebounds)');
        expect(getAggregatedColumnName('REB', 'Players')).toBe('AVG(pgs.total_rebounds)');
        expect(getAggregatedColumnName('AST', 'Players')).toBe('AVG(pgs.assists)');
        expect(getAggregatedColumnName('TOV', 'Players')).toBe('AVG(pgs.turnovers)');
        expect(getAggregatedColumnName('STL', 'Players')).toBe('AVG(pgs.steals)');
        expect(getAggregatedColumnName('BLK', 'Players')).toBe('AVG(pgs.blocks)');
        expect(getAggregatedColumnName('PF', 'Players')).toBe('AVG(pgs.personal_fouls)');
        expect(getAggregatedColumnName('+/-', 'Players')).toBe('AVG(pgs.plus_minus)');
      });

      test('should return correct advanced stat columns for Players', () => {
        expect(getAggregatedColumnName('Offensive Rating', 'Players')).toBe('AVG(pas.offensive_rating)');
        expect(getAggregatedColumnName('Defensive Rating', 'Players')).toBe('AVG(pas.defensive_rating)');
        expect(getAggregatedColumnName('Net Rating', 'Players')).toBe('AVG(pas.net_rating)');
        expect(getAggregatedColumnName('Usage %', 'Players')).toBe('AVG(pas.usage_percentage)');
        expect(getAggregatedColumnName('True Shooting %', 'Players')).toBe('AVG(pas.true_shooting_percentage)');
        expect(getAggregatedColumnName('Effective FG%', 'Players')).toBe('AVG(pas.effective_field_goal_percentage)');
        expect(getAggregatedColumnName('Assist %', 'Players')).toBe('AVG(pas.assist_percentage)');
        expect(getAggregatedColumnName('Assist Turnover Ratio', 'Players')).toBe('AVG(pas.assist_turnover_ratio)');
        expect(getAggregatedColumnName('Assist Ratio', 'Players')).toBe('AVG(pas.assist_ratio)');
        expect(getAggregatedColumnName('Offensive Rebound %', 'Players')).toBe('AVG(pas.offensive_rebound_percentage)');
        expect(getAggregatedColumnName('Defensive Rebound %', 'Players')).toBe('AVG(pas.defensive_rebound_percentage)');
        expect(getAggregatedColumnName('Rebound %', 'Players')).toBe('AVG(pas.rebound_percentage)');
        expect(getAggregatedColumnName('Turnover %', 'Players')).toBe('AVG(pas.turnover_percentage)');
        expect(getAggregatedColumnName('PIE', 'Players')).toBe('AVG(pas.pie)');
        expect(getAggregatedColumnName('Pace', 'Players')).toBe('AVG(pas.pace)');
      });
    });

    describe('Team columns', () => {
      test('should return correct identity columns for Teams', () => {
        expect(getAggregatedColumnName('Team', 'Teams')).toBe('t.team_code');
        expect(getAggregatedColumnName('Games Played', 'Teams')).toBe('COUNT(DISTINCT scoped_games.game_id)');
      });

      test('should return correct traditional stat columns for Teams', () => {
        expect(getAggregatedColumnName('Points', 'Teams')).toBe('AVG(tgs.points)');
        expect(getAggregatedColumnName('Wins', 'Teams')).toBe('SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END)');
        expect(getAggregatedColumnName('Losses', 'Teams')).toBe('SUM(CASE WHEN tgs.win = FALSE THEN 1 ELSE 0 END)');
        expect(getAggregatedColumnName('Win %', 'Teams')).toBe('(SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*))');
        expect(getAggregatedColumnName('FGM', 'Teams')).toBe('AVG(tgs.field_goals_made)');
        expect(getAggregatedColumnName('FGA', 'Teams')).toBe('AVG(tgs.field_goals_attempted)');
        expect(getAggregatedColumnName('FG%', 'Teams')).toBe('AVG(tgs.field_goal_percentage)');
        expect(getAggregatedColumnName('3PM', 'Teams')).toBe('AVG(tgs.three_pointers_made)');
        expect(getAggregatedColumnName('3PA', 'Teams')).toBe('AVG(tgs.three_pointers_attempted)');
        expect(getAggregatedColumnName('3P%', 'Teams')).toBe('AVG(tgs.three_point_percentage)');
        expect(getAggregatedColumnName('FTM', 'Teams')).toBe('AVG(tgs.free_throws_made)');
        expect(getAggregatedColumnName('FTA', 'Teams')).toBe('AVG(tgs.free_throws_attempted)');
        expect(getAggregatedColumnName('FT%', 'Teams')).toBe('AVG(tgs.free_throw_percentage)');
        expect(getAggregatedColumnName('OREB', 'Teams')).toBe('AVG(tgs.offensive_rebounds)');
        expect(getAggregatedColumnName('DREB', 'Teams')).toBe('AVG(tgs.defensive_rebounds)');
        expect(getAggregatedColumnName('REB', 'Teams')).toBe('AVG(tgs.total_rebounds)');
        expect(getAggregatedColumnName('AST', 'Teams')).toBe('AVG(tgs.assists)');
        expect(getAggregatedColumnName('TOV', 'Teams')).toBe('AVG(tgs.turnovers)');
        expect(getAggregatedColumnName('STL', 'Teams')).toBe('AVG(tgs.steals)');
        expect(getAggregatedColumnName('BLK', 'Teams')).toBe('AVG(tgs.blocks)');
        expect(getAggregatedColumnName('+/-', 'Teams')).toBe('AVG(tgs.plus_minus)');
      });

      test('should return correct advanced stat columns for Teams', () => {
        expect(getAggregatedColumnName('Offensive Rating', 'Teams')).toBe('AVG(tas.offensive_rating)');
        expect(getAggregatedColumnName('Defensive Rating', 'Teams')).toBe('AVG(tas.defensive_rating)');
        expect(getAggregatedColumnName('Net Rating', 'Teams')).toBe('AVG(tas.net_rating)');
        expect(getAggregatedColumnName('True Shooting %', 'Teams')).toBe('AVG(tas.true_shooting_percentage)');
        expect(getAggregatedColumnName('Effective FG%', 'Teams')).toBe('AVG(tas.effective_field_goal_percentage)');
        expect(getAggregatedColumnName('Assist %', 'Teams')).toBe('AVG(tas.assist_percentage)');
        expect(getAggregatedColumnName('Assist Turnover Ratio', 'Teams')).toBe('AVG(tas.assist_turnover_ratio)');
        expect(getAggregatedColumnName('Offensive Rebound %', 'Teams')).toBe('AVG(tas.offensive_rebound_percentage)');
        expect(getAggregatedColumnName('Defensive Rebound %', 'Teams')).toBe('AVG(tas.defensive_rebound_percentage)');
        expect(getAggregatedColumnName('Rebound %', 'Teams')).toBe('AVG(tas.rebound_percentage)');
        expect(getAggregatedColumnName('Turnover %', 'Teams')).toBe('AVG(tas.turnover_percentage)');
        expect(getAggregatedColumnName('PIE', 'Teams')).toBe('AVG(tas.pie)');
        expect(getAggregatedColumnName('Pace', 'Teams')).toBe('AVG(tas.pace)');
      });
    });

    test('should return null for unknown filter types', () => {
      expect(getAggregatedColumnName('UNKNOWN_COLUMN', 'Players')).toBe(null);
      expect(getAggregatedColumnName('INVALID_STAT', 'Teams')).toBe(null);
      expect(getAggregatedColumnName('', 'Players')).toBe(null);
      expect(getAggregatedColumnName(null, 'Teams')).toBe(null);
      expect(getAggregatedColumnName(undefined, 'Players')).toBe(null);
    });
  });

  describe('buildSingleCondition', () => {
    test('should build greater than condition', () => {
      ValueConverter.convertFilterValue.mockReturnValue(25);
      
      const filter = { type: 'PTS', operator: 'greater than', value: 25 };
      const result = buildSingleCondition(filter, 'Players', 1);
      
      expect(result.condition).toBe('AVG(pgs.points) > $1');
      expect(result.filterParams).toEqual([25]);
      expect(ValueConverter.convertFilterValue).toHaveBeenCalledWith(25, 'PTS');
    });

    test('should build less than condition', () => {
      ValueConverter.convertFilterValue.mockReturnValue(30);
      
      const filter = { type: 'Age', operator: 'less than', value: 30 };
      const result = buildSingleCondition(filter, 'Players', 2);
      
      expect(result.condition).toBe('p.age < $2');
      expect(result.filterParams).toEqual([30]);
    });

    test('should build equals condition', () => {
      ValueConverter.convertFilterValue.mockReturnValue('LAL');
      
      const filter = { type: 'Team', operator: 'equals', value: 'LAL' };
      const result = buildSingleCondition(filter, 'Players', 3);
      
      expect(result.condition).toBe('t.team_code = $3');
      expect(result.filterParams).toEqual(['LAL']);
    });

    test('should build between condition', () => {
      ValueConverter.convertFilterValue.mockReturnValueOnce(20).mockReturnValueOnce(30);
      
      const filter = { type: 'PTS', operator: 'between', value: 20, value2: 30 };
      const result = buildSingleCondition(filter, 'Players', 1);
      
      expect(result.condition).toBe('AVG(pgs.points) BETWEEN $1 AND $2');
      expect(result.filterParams).toEqual([20, 30]);
      expect(ValueConverter.convertFilterValue).toHaveBeenCalledWith(20, 'PTS');
      expect(ValueConverter.convertFilterValue).toHaveBeenCalledWith(30, 'PTS');
    });

    test('should build in condition', () => {
      ValueConverter.convertFilterValues.mockReturnValue(['LAL', 'GSW', 'BOS']);
      
      const filter = { type: 'Team', operator: 'in', values: ['LAL', 'GSW', 'BOS'] };
      const result = buildSingleCondition(filter, 'Players', 1);
      
      expect(result.condition).toBe('t.team_code IN ($1, $2, $3)');
      expect(result.filterParams).toEqual(['LAL', 'GSW', 'BOS']);
      expect(ValueConverter.convertFilterValues).toHaveBeenCalledWith(['LAL', 'GSW', 'BOS'], 'Team');
    });

    test('should handle in condition with empty values', () => {
      const filter = { type: 'Team', operator: 'in', values: [] };
      const result = buildSingleCondition(filter, 'Players', 1);
      
      expect(result.condition).toBe(null);
      expect(result.filterParams).toEqual([]);
    });

    test('should handle in condition with no values property', () => {
      const filter = { type: 'Team', operator: 'in' };
      const result = buildSingleCondition(filter, 'Players', 1);
      
      expect(result.condition).toBe(null);
      expect(result.filterParams).toEqual([]);
    });

    test('should handle unknown filter type', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const filter = { type: 'UNKNOWN_TYPE', operator: 'greater than', value: 20 };
      const result = buildSingleCondition(filter, 'Players', 1);
      
      expect(result.condition).toBe(null);
      expect(result.filterParams).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Unknown filter type: UNKNOWN_TYPE for measure: Players');
      
      consoleSpy.mockRestore();
    });

    test('should handle unknown operator', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const filter = { type: 'PTS', operator: 'unknown_operator', value: 20 };
      const result = buildSingleCondition(filter, 'Players', 1);
      
      expect(result.condition).toBe(null);
      expect(result.filterParams).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Unknown operator: unknown_operator');
      
      consoleSpy.mockRestore();
    });

    test('should handle percentage conversion for percentage columns', () => {
      ValueConverter.convertFilterValue.mockReturnValue(0.455); // 45.5% converted to 0.455
      
      const filter = { type: 'FG%', operator: 'greater than', value: 45.5 };
      const result = buildSingleCondition(filter, 'Players', 1);
      
      expect(result.condition).toBe('AVG(pgs.field_goal_percentage) > $1');
      expect(result.filterParams).toEqual([0.455]);
      expect(ValueConverter.convertFilterValue).toHaveBeenCalledWith(45.5, 'FG%');
    });

    test('should handle Teams measure columns correctly', () => {
      ValueConverter.convertFilterValue.mockReturnValue(40);
      
      const filter = { type: 'Wins', operator: 'greater than', value: 40 };
      const result = buildSingleCondition(filter, 'Teams', 1);
      
      expect(result.condition).toBe('SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) > $1');
      expect(result.filterParams).toEqual([40]);
    });
  });

  describe('buildWhereClause', () => {
    test('should return empty clause for empty filters', () => {
      const result = buildWhereClause([], 'Players', false, 1);
      
      expect(result.whereClause).toBe('');
      expect(result.params).toEqual([]);
    });

    test('should return empty clause for null filters', () => {
      const result = buildWhereClause(null, 'Players', false, 1);
      
      expect(result.whereClause).toBe('');
      expect(result.params).toEqual([]);
    });

    test('should return empty clause for undefined filters', () => {
      const result = buildWhereClause(undefined, 'Players', false, 1);
      
      expect(result.whereClause).toBe('');
      expect(result.params).toEqual([]);
    });

    test('should build single filter condition', () => {
      ValueConverter.convertFilterValue.mockReturnValue(25);
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 25 }
      ];
      
      const result = buildWhereClause(filters, 'Players', false, 1);
      
      expect(result.whereClause).toBe('AND AVG(pgs.points) > $1');
      expect(result.params).toEqual([25]);
    });

    test('should build multiple filter conditions', () => {
      ValueConverter.convertFilterValue.mockReturnValueOnce(25).mockReturnValueOnce(8);
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 25 },
        { type: 'REB', operator: 'greater than', value: 8 }
      ];
      
      const result = buildWhereClause(filters, 'Players', false, 1);
      
      expect(result.whereClause).toBe('AND AVG(pgs.points) > $1 AND AVG(pgs.total_rebounds) > $2');
      expect(result.params).toEqual([25, 8]);
    });

    test('should handle mixed filter types and operators', () => {
      ValueConverter.convertFilterValue.mockReturnValueOnce(25).mockReturnValueOnce(30).mockReturnValueOnce(5).mockReturnValueOnce(15);
      ValueConverter.convertFilterValues.mockReturnValue(['LAL', 'GSW']);
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 25 },
        { type: 'Age', operator: 'between', value: 25, value2: 30 },
        { type: 'REB', operator: 'between', value: 5, value2: 15 },
        { type: 'Team', operator: 'in', values: ['LAL', 'GSW'] }
      ];
      
      const result = buildWhereClause(filters, 'Players', false, 1);
      
      expect(result.whereClause).toBe('AND AVG(pgs.points) > $1 AND p.age BETWEEN $2 AND $3 AND AVG(pgs.total_rebounds) BETWEEN $4 AND $5 AND t.team_code IN ($6, $7)');
      expect(result.params).toEqual([25, 25, 30, 5, 15, 'LAL', 'GSW']);
    });

    test('should handle parameter index offset', () => {
      ValueConverter.convertFilterValue.mockReturnValue(25);
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 25 }
      ];
      
      const result = buildWhereClause(filters, 'Players', false, 5);
      
      expect(result.whereClause).toBe('AND AVG(pgs.points) > $5');
      expect(result.params).toEqual([25]);
    });

    test('should skip invalid filters', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      ValueConverter.validateValue.mockReturnValueOnce({ valid: false, message: 'Invalid value' })
                                   .mockReturnValueOnce({ valid: true, message: '' });
      ValueConverter.convertFilterValue.mockReturnValue(8);
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 'invalid' },
        { type: 'REB', operator: 'greater than', value: 8 }
      ];
      
      const result = buildWhereClause(filters, 'Players', false, 1);
      
      expect(result.whereClause).toBe('AND AVG(pgs.total_rebounds) > $1');
      expect(result.params).toEqual([8]);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid filter value for PTS: Invalid value');
      
      consoleSpy.mockRestore();
    });

    test('should handle filter condition building errors', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      ValueConverter.validateValue.mockReturnValue({ valid: true, message: '' });
      
      const filters = [
        { type: 'UNKNOWN_TYPE', operator: 'greater than', value: 20 },
        { type: 'PTS', operator: 'greater than', value: 25 }
      ];
      
      ValueConverter.convertFilterValue.mockReturnValue(25);
      
      const result = buildWhereClause(filters, 'Players', false, 1);
      
      expect(result.whereClause).toBe('AND AVG(pgs.points) > $1');
      expect(result.params).toEqual([25]);
      expect(consoleSpy).toHaveBeenCalledWith('Unknown filter type: UNKNOWN_TYPE for measure: Players');
      
      consoleSpy.mockRestore();
    });

    test('should handle Teams measure correctly', () => {
      ValueConverter.convertFilterValue.mockReturnValue(40);
      
      const filters = [
        { type: 'Wins', operator: 'greater than', value: 40 }
      ];
      
      const result = buildWhereClause(filters, 'Teams', false, 1);
      
      expect(result.whereClause).toBe('AND SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) > $1');
      expect(result.params).toEqual([40]);
    });
  });

  describe('validateFiltersWithConverter', () => {
    test('should return error for non-array filters', () => {
      const result = validateFiltersWithConverter('not-an-array', 'Players');
      expect(result).toEqual(['Filters must be an array']);
    });

    test('should validate required properties', () => {
      const filters = [
        { operator: 'greater than', value: 20 }, // missing type
        { type: 'PTS', value: 20 }, // missing operator
        { type: 'REB', operator: 'greater than' } // missing value
      ];
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toContain('Filter 1: type is required');
      expect(result).toContain('Filter 2: operator is required');
      expect(result).toContain('Filter 3: value is required for greater than operator');
    });

    test('should validate unknown column types', () => {
      const filters = [
        { type: 'UNKNOWN_COLUMN', operator: 'greater than', value: 20 }
      ];
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toContain('Filter 1: unknown column type "UNKNOWN_COLUMN"');
    });

    test('should validate values using ValueConverter', () => {
      ValueConverter.validateValue.mockReturnValueOnce({ valid: false, message: 'Value too high' })
                                   .mockReturnValueOnce({ valid: true, message: '' });
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 1000 },
        { type: 'REB', operator: 'greater than', value: 10 }
      ];
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toContain('Filter 1: Value too high');
      expect(ValueConverter.validateValue).toHaveBeenCalledWith(1000, 'PTS');
      expect(ValueConverter.validateValue).toHaveBeenCalledWith(10, 'REB');
    });

    test('should validate between operator requirements', () => {
      ValueConverter.validateValue.mockReturnValue({ valid: true, message: '' });
      
      const filters = [
        { type: 'PTS', operator: 'between', value: null, value2: 30 },
        { type: 'REB', operator: 'between', value: 5, value2: null },
        { type: 'AST', operator: 'between', value: 3, value2: 8 }
      ];
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toContain('Filter 1: value is required for between operator');
      expect(result).toContain('Filter 2: value2 is required for between operator');
      expect(result).not.toContain('Filter 3:'); // Filter 3 should be valid
    });

    test('should validate between operator value validation', () => {
      ValueConverter.validateValue.mockReturnValueOnce({ valid: false, message: 'First value invalid' })
                                   .mockReturnValueOnce({ valid: false, message: 'Second value invalid' });
      
      const filters = [
        { type: 'PTS', operator: 'between', value: -5, value2: 200 }
      ];
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toContain('Filter 1: First value invalid (first value)');
      expect(result).toContain('Filter 1: Second value invalid (second value)');
    });

    test('should validate in operator requirements', () => {
      const filters = [
        { type: 'Team', operator: 'in' }, // no values
        { type: 'Team', operator: 'in', values: [] }, // empty values
        { type: 'Team', operator: 'in', values: ['LAL', 'GSW'] } // valid
      ];
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toContain('Filter 1: values array is required for in operator');
      expect(result).toContain('Filter 2: values array is required for in operator');
      expect(result).not.toContain('Filter 3:'); // Filter 3 should be valid
    });

    test('should validate in operator values using ValueConverter', () => {
      ValueConverter.validateValues.mockReturnValue({
        valid: false,
        message: '2 invalid values found'
      });
      
      const filters = [
        { type: 'Team', operator: 'in', values: ['LAL', 'INVALID', 'GSW'] }
      ];
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toContain('Filter 1: 2 invalid values found');
      expect(ValueConverter.validateValues).toHaveBeenCalledWith(['LAL', 'INVALID', 'GSW'], 'Team');
    });

    test('should validate unknown operators', () => {
      const filters = [
        { type: 'PTS', operator: 'unknown_operator', value: 20 }
      ];
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toContain('Filter 1: unknown operator "unknown_operator"');
    });

    test('should return empty array for valid filters', () => {
      ValueConverter.validateValue.mockReturnValue({ valid: true, message: '' });
      ValueConverter.validateValues.mockReturnValue({ valid: true, message: '', invalidValues: [] });
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 },
        { type: 'Age', operator: 'between', value: 25, value2: 30 },
        { type: 'Team', operator: 'in', values: ['LAL', 'GSW'] }
      ];
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toEqual([]);
    });

    test('should handle early return for missing type', () => {
      const filters = [
        { operator: 'greater than', value: 20 },
        { type: 'PTS', operator: 'greater than', value: 25 }
      ];
      
      ValueConverter.validateValue.mockReturnValue({ valid: true, message: '' });
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toContain('Filter 1: type is required');
      expect(result).not.toContain('Filter 1: unknown column type'); // Should not reach column validation
    });

    test('should handle early return for missing operator', () => {
      const filters = [
        { type: 'PTS', value: 20 },
        { type: 'REB', operator: 'greater than', value: 8 }
      ];
      
      ValueConverter.validateValue.mockReturnValue({ valid: true, message: '' });
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toContain('Filter 1: operator is required');
      expect(result).not.toContain('Filter 1: value is required'); // Should not reach value validation
    });

    test('should accumulate multiple validation errors per filter', () => {
      ValueConverter.validateValue.mockReturnValue({ valid: false, message: 'Invalid value format' });
      
      const filters = [
        { type: 'PTS', operator: 'between', value: 'invalid', value2: 'also_invalid' }
      ];
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toContain('Filter 1: Invalid value format (first value)');
      expect(result).toContain('Filter 1: Invalid value format (second value)');
    });

    test('should handle Teams measure validation', () => {
      ValueConverter.validateValue.mockReturnValue({ valid: true, message: '' });
      
      const filters = [
        { type: 'Wins', operator: 'greater than', value: 40 },
        { type: 'UNKNOWN_TEAM_STAT', operator: 'greater than', value: 10 }
      ];
      
      const result = validateFiltersWithConverter(filters, 'Teams');
      
      expect(result).toContain('Filter 2: unknown column type "UNKNOWN_TEAM_STAT"');
      expect(result).not.toContain('Filter 1:'); // Filter 1 should be valid
    });
  });

  describe('error handling and edge cases', () => {
    test('should handle ValueConverter throwing errors', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      ValueConverter.validateValue.mockReturnValue({ valid: true, message: '' });
      ValueConverter.convertFilterValue.mockImplementation(() => {
        throw new Error('Conversion failed');
      });
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 }
      ];
      
      const result = buildWhereClause(filters, 'Players', false, 1);
      
      expect(result.whereClause).toBe('');
      expect(result.params).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error building condition for filter PTS:', 'Conversion failed');
      
      consoleSpy.mockRestore();
    });

    test('should handle null filter values gracefully', () => {
      ValueConverter.validateValue.mockReturnValue({ valid: true, message: '' });
      ValueConverter.convertFilterValue.mockReturnValue(null);
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: null }
      ];
      
      const result = buildWhereClause(filters, 'Players', false, 1);
      
      expect(result.whereClause).toBe('AND AVG(pgs.points) > $1');
      expect(result.params).toEqual([null]);
    });

    test('should handle undefined filter properties', () => {
      const filters = [
        { type: undefined, operator: 'greater than', value: 20 },
        { type: 'PTS', operator: undefined, value: 20 },
        { type: 'REB', operator: 'greater than', value: undefined }
      ];
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toContain('Filter 1: type is required');
      expect(result).toContain('Filter 2: operator is required');
      expect(result).toContain('Filter 3: value is required for greater than operator');
    });

    test('should handle complex parameter indexing', () => {
      ValueConverter.convertFilterValue.mockReturnValueOnce(20).mockReturnValueOnce(25).mockReturnValueOnce(30);
      ValueConverter.convertFilterValues.mockReturnValue(['LAL', 'GSW', 'BOS', 'MIA']);
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 },
        { type: 'Age', operator: 'between', value: 25, value2: 30 },
        { type: 'Team', operator: 'in', values: ['LAL', 'GSW', 'BOS', 'MIA'] }
      ];
      
      const result = buildWhereClause(filters, 'Players', false, 5);
      
      expect(result.whereClause).toBe('AND AVG(pgs.points) > $5 AND p.age BETWEEN $6 AND $7 AND t.team_code IN ($8, $9, $10, $11)');
      expect(result.params).toEqual([20, 25, 30, 'LAL', 'GSW', 'BOS', 'MIA']);
    });

    test('should handle empty string filter type', () => {
      const filters = [
        { type: '', operator: 'greater than', value: 20 }
      ];
      
      const result = validateFiltersWithConverter(filters, 'Players');
      
      expect(result).toContain('Filter 1: unknown column type ""');
    });

    test('should handle filters with extra properties', () => {
      ValueConverter.validateValue.mockReturnValue({ valid: true, message: '' });
      ValueConverter.convertFilterValue.mockReturnValue(25);
      
      const filters = [
        { 
          type: 'PTS', 
          operator: 'greater than', 
          value: 25,
          extraProperty: 'should be ignored',
          anotherExtra: 123 
        }
      ];
      
      const result = buildWhereClause(filters, 'Players', false, 1);
      
      expect(result.whereClause).toBe('AND AVG(pgs.points) > $1');
      expect(result.params).toEqual([25]);
    });

    test('should handle mixed valid and invalid filters', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      ValueConverter.validateValue.mockReturnValueOnce({ valid: false, message: 'Invalid' })
                                   .mockReturnValueOnce({ valid: true, message: '' })
                                   .mockReturnValueOnce({ valid: true, message: '' });
      ValueConverter.convertFilterValue.mockReturnValueOnce(8).mockReturnValueOnce(5);
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 'invalid' },
        { type: 'REB', operator: 'greater than', value: 8 },
        { type: 'UNKNOWN_TYPE', operator: 'greater than', value: 5 }
      ];
      
      const result = buildWhereClause(filters, 'Players', false, 1);
      
      expect(result.whereClause).toBe('AND AVG(pgs.total_rebounds) > $1');
      expect(result.params).toEqual([8]);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid filter value for PTS: Invalid');
      expect(consoleSpy).toHaveBeenCalledWith('Unknown filter type: UNKNOWN_TYPE for measure: Players');
      
      consoleSpy.mockRestore();
    });

    test('should handle case sensitivity for measure parameter', () => {
      ValueConverter.convertFilterValue.mockReturnValue(25);
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 25 }
      ];
      
      // Test with different case - should still work for Players
      const result1 = buildWhereClause(filters, 'Players', false, 1);
      expect(result1.whereClause).toBe('AND AVG(pgs.points) > $1');
      
      // Test with Teams
      const teamFilters = [
        { type: 'Wins', operator: 'greater than', value: 40 }
      ];
      ValueConverter.convertFilterValue.mockReturnValue(40);
      
      const result2 = buildWhereClause(teamFilters, 'Teams', false, 1);
      expect(result2.whereClause).toBe('AND SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) > $1');
    });
  });

  describe('integration with ValueConverter', () => {
    test('should properly integrate with ValueConverter for percentage values', () => {
      // Mock percentage conversion (45.5% -> 0.455)
      ValueConverter.convertFilterValue.mockReturnValue(0.455);
      ValueConverter.validateValue.mockReturnValue({ valid: true, message: '' });
      
      const filters = [
        { type: 'FG%', operator: 'greater than', value: 45.5 }
      ];
      
      const result = buildWhereClause(filters, 'Players', false, 1);
      
      expect(result.whereClause).toBe('AND AVG(pgs.field_goal_percentage) > $1');
      expect(result.params).toEqual([0.455]);
      expect(ValueConverter.convertFilterValue).toHaveBeenCalledWith(45.5, 'FG%');
    });

    test('should properly integrate with ValueConverter for array values', () => {
      ValueConverter.convertFilterValues.mockReturnValue(['LAL', 'GSW', 'BOS']);
      ValueConverter.validateValues.mockReturnValue({ valid: true, message: '', invalidValues: [] });
      
      const filters = [
        { type: 'Team', operator: 'in', values: ['LAL', 'GSW', 'BOS'] }
      ];
      
      const result = buildWhereClause(filters, 'Players', false, 1);
      
      expect(result.whereClause).toBe('AND t.team_code IN ($1, $2, $3)');
      expect(result.params).toEqual(['LAL', 'GSW', 'BOS']);
      expect(ValueConverter.convertFilterValues).toHaveBeenCalledWith(['LAL', 'GSW', 'BOS'], 'Team');
    });

    test('should handle ValueConverter validation failures gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      ValueConverter.validateValue.mockReturnValue({ 
        valid: false, 
        message: 'Value must be between 0 and 100' 
      });
      
      const filters = [
        { type: 'FG%', operator: 'greater than', value: 150 }
      ];
      
      const result = buildWhereClause(filters, 'Players', false, 1);
      
      expect(result.whereClause).toBe('');
      expect(result.params).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid filter value for FG%: Value must be between 0 and 100');
      
      consoleSpy.mockRestore();
    });
  });
});