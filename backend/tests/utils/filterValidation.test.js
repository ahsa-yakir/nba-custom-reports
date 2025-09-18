/**
 * Unit tests for filterValidation.js utility
 * Tests filter validation, type checking, and organizer compatibility functions
 */

// Mock the organizerBuilder module
jest.mock('../../src/utils/organizerBuilder', () => ({
  validateOrganizer: jest.fn()
}));

const {
  validateFilters,
  validateReportConfiguration,
  hasAdvancedFilters,
  getAvailableFilterTypes,
  isValidOperator,
  isValidMeasure,
  getFilterRequirements,
  getFilterOrganizerCompatibility
} = require('../../src/utils/filterValidation');

const { validateOrganizer } = require('../../src/utils/organizerBuilder');

describe('filterValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for organizer validation
    validateOrganizer.mockReturnValue([]);
  });

  describe('validateFilters', () => {
    test('should return error for non-array filters', () => {
      const result = validateFilters('not-an-array', 'Players');
      expect(result).toEqual(['Filters must be an array']);
    });

    test('should return error for null filters', () => {
      const result = validateFilters(null, 'Players');
      expect(result).toEqual(['Filters must be an array']);
    });

    test('should validate filters with missing type', () => {
      const filters = [
        { operator: 'greater than', value: 20 }
      ];
      const result = validateFilters(filters, 'Players');
      expect(result).toContain('Filter 1: missing type');
    });

    test('should validate filters with missing operator', () => {
      const filters = [
        { type: 'PTS', value: 20 }
      ];
      const result = validateFilters(filters, 'Players');
      expect(result).toContain('Filter 1: missing operator');
    });

    test('should validate between operator with missing values', () => {
      const filters = [
        { type: 'PTS', operator: 'between', value: 20 },
        { type: 'REB', operator: 'between', value2: 10 },
        { type: 'AST', operator: 'between' }
      ];
      const result = validateFilters(filters, 'Players');
      
      expect(result).toContain("Filter 1: 'between' operator requires both value and value2");
      expect(result).toContain("Filter 2: 'between' operator requires both value and value2");
      expect(result).toContain("Filter 3: 'between' operator requires both value and value2");
    });

    test('should validate in operator with missing values', () => {
      const filters = [
        { type: 'Team', operator: 'in' },
        { type: 'Team', operator: 'in', values: [] }
      ];
      const result = validateFilters(filters, 'Players');
      
      expect(result).toContain("Filter 1: 'in' operator requires values array");
      expect(result).toContain("Filter 2: 'in' operator requires values array");
    });

    test('should validate comparison operators with missing value', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than' },
        { type: 'REB', operator: 'less than' },
        { type: 'AST', operator: 'equals' }
      ];
      const result = validateFilters(filters, 'Players');
      
      expect(result).toContain("Filter 1: 'greater than' operator requires value");
      expect(result).toContain("Filter 2: 'less than' operator requires value");
      expect(result).toContain("Filter 3: 'equals' operator requires value");
    });

    test('should validate filter types for measure', () => {
      const filters = [
        { type: 'INVALID_TYPE', operator: 'greater than', value: 20 }
      ];
      const result = validateFilters(filters, 'Players');
      
      expect(result).toContain("Filter 1: 'INVALID_TYPE' is not a valid filter type for Players");
    });

    test('should return empty array for valid filters', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 },
        { type: 'Team', operator: 'in', values: ['LAL', 'GSW'] },
        { type: 'REB', operator: 'between', value: 5, value2: 15 }
      ];
      const result = validateFilters(filters, 'Players');
      
      expect(result).toEqual([]);
    });

    test('should handle empty filters array', () => {
      const result = validateFilters([], 'Players');
      expect(result).toEqual([]);
    });

    test('should validate Teams measure filters', () => {
      const filters = [
        { type: 'Wins', operator: 'greater than', value: 30 },
        { type: 'Points', operator: 'less than', value: 110 }
      ];
      const result = validateFilters(filters, 'Teams');
      
      expect(result).toEqual([]);
    });

    test('should validate complex filter combinations', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 },
        { type: 'Age', operator: 'between', value: 25, value2: 30 },
        { type: 'Team', operator: 'in', values: ['LAL', 'GSW', 'BOS'] },
        { type: 'FG%', operator: 'greater than', value: 0.45 },
        { type: 'Usage %', operator: 'less than', value: 0.35 }
      ];
      const result = validateFilters(filters, 'Players');
      
      expect(result).toEqual([]);
    });
  });

  describe('validateReportConfiguration', () => {
    test('should validate complete report configuration', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 }
      ];
      const organizer = { type: 'all_games' };
      const sortConfig = { column: 'PTS', direction: 'desc' };
      
      const result = validateReportConfiguration('Players', filters, organizer, sortConfig);
      
      expect(result).toEqual([]);
      expect(validateOrganizer).toHaveBeenCalledWith(organizer);
    });

    test('should validate invalid measure', () => {
      const result = validateReportConfiguration('InvalidMeasure', [], { type: 'all_games' });
      
      expect(result).toContain('Invalid or missing measure. Must be "Players" or "Teams"');
    });

    test('should validate missing measure', () => {
      const result = validateReportConfiguration(null, [], { type: 'all_games' });
      
      expect(result).toContain('Invalid or missing measure. Must be "Players" or "Teams"');
    });

    test('should validate missing filters', () => {
      const result = validateReportConfiguration('Players', null, { type: 'all_games' });
      
      expect(result).toContain('Filters are required');
    });

    test('should use default organizer when not provided', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      
      const result = validateReportConfiguration('Players', filters, null);
      
      expect(validateOrganizer).toHaveBeenCalledWith({ type: 'all_games' });
      expect(result).toEqual([]);
    });

    test('should validate organizer errors', () => {
      validateOrganizer.mockReturnValue(['Invalid organizer type']);
      
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'invalid_type' };
      
      const result = validateReportConfiguration('Players', filters, organizer);
      
      expect(result).toContain('Organizer: Invalid organizer type');
    });

    test('should validate invalid sort config type', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'all_games' };
      const sortConfig = 'invalid-sort-config';
      
      const result = validateReportConfiguration('Players', filters, organizer, sortConfig);
      
      expect(result).toContain('Sort configuration must be an object');
    });

    test('should validate invalid sort column type', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'all_games' };
      const sortConfig = { column: 123, direction: 'desc' };
      
      const result = validateReportConfiguration('Players', filters, organizer, sortConfig);
      
      expect(result).toContain('Sort column must be a string');
    });

    test('should validate invalid sort direction', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'all_games' };
      const sortConfig = { column: 'PTS', direction: 'invalid' };
      
      const result = validateReportConfiguration('Players', filters, organizer, sortConfig);
      
      expect(result).toContain('Sort direction must be "asc" or "desc"');
    });

    test('should accumulate multiple validation errors', () => {
      validateOrganizer.mockReturnValue(['Organizer error 1', 'Organizer error 2']);
      
      const filters = [
        { type: 'INVALID_TYPE', operator: 'greater than', value: 20 }
      ];
      const organizer = { type: 'invalid_type' };
      const sortConfig = { column: 123, direction: 'invalid' };
      
      const result = validateReportConfiguration('InvalidMeasure', filters, organizer, sortConfig);
      
      expect(result).toContain('Invalid or missing measure. Must be "Players" or "Teams"');
      expect(result).toContain("Filter 1: 'INVALID_TYPE' is not a valid filter type for InvalidMeasure");
      expect(result).toContain('Organizer: Organizer error 1');
      expect(result).toContain('Organizer: Organizer error 2');
      expect(result).toContain('Sort column must be a string');
      expect(result).toContain('Sort direction must be "asc" or "desc"');
    });
  });

  describe('hasAdvancedFilters', () => {
    test('should return true for advanced filters', () => {
      const filters = [
        { type: 'Offensive Rating', operator: 'greater than', value: 110 }
      ];
      
      expect(hasAdvancedFilters(filters)).toBe(true);
    });

    test('should return true for mixed filters with advanced', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 },
        { type: 'Usage %', operator: 'greater than', value: 25 }
      ];
      
      expect(hasAdvancedFilters(filters)).toBe(true);
    });

    test('should return false for traditional filters only', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 },
        { type: 'REB', operator: 'greater than', value: 8 },
        { type: 'Team', operator: 'in', values: ['LAL'] }
      ];
      
      expect(hasAdvancedFilters(filters)).toBe(false);
    });

    test('should return false for empty filters', () => {
      expect(hasAdvancedFilters([])).toBe(false);
    });

    test('should handle all advanced filter types', () => {
      const advancedTypes = [
        'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %',
        'True Shooting %', 'Effective FG%', 'Assist %', 'Rebound %',
        'Turnover %', 'PIE', 'Pace', 'Assist Turnover Ratio',
        'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %'
      ];
      
      advancedTypes.forEach(type => {
        const filters = [{ type, operator: 'greater than', value: 10 }];
        expect(hasAdvancedFilters(filters)).toBe(true);
      });
    });
  });

  describe('getAvailableFilterTypes', () => {
    test('should return filter types for Players', () => {
      const result = getAvailableFilterTypes('Players');
      
      expect(result).toHaveProperty('traditional');
      expect(result).toHaveProperty('advanced');
      expect(result).toHaveProperty('all');
      
      expect(result.traditional).toContain('PTS');
      expect(result.traditional).toContain('REB');
      expect(result.traditional).toContain('AST');
      expect(result.traditional).toContain('Team');
      
      expect(result.advanced).toContain('Offensive Rating');
      expect(result.advanced).toContain('Usage %');
      expect(result.advanced).toContain('True Shooting %');
      
      expect(result.all).toEqual([...result.traditional, ...result.advanced]);
    });

    test('should return filter types for Teams', () => {
      const result = getAvailableFilterTypes('Teams');
      
      expect(result).toHaveProperty('traditional');
      expect(result).toHaveProperty('advanced');
      expect(result).toHaveProperty('all');
      
      expect(result.traditional).toContain('Wins');
      expect(result.traditional).toContain('Points');
      expect(result.traditional).toContain('FGM');
      
      expect(result.advanced).toContain('Offensive Rating');
      expect(result.advanced).toContain('Net Rating');
      expect(result.advanced).toContain('Pace');
      
      expect(result.all).toEqual([...result.traditional, ...result.advanced]);
    });

    test('should include player-specific traditional filters', () => {
      const result = getAvailableFilterTypes('Players');
      
      const expectedTraditional = [
        'Team', 'Age', 'Games Played', 'MINS', 'PTS', 'FGM', 'FGA', 'FG%',
        '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB',
        'AST', 'TOV', 'STL', 'BLK', 'PF', '+/-'
      ];
      
      expectedTraditional.forEach(filter => {
        expect(result.traditional).toContain(filter);
      });
    });

    test('should include team-specific traditional filters', () => {
      const result = getAvailableFilterTypes('Teams');
      
      const expectedTraditional = [
        'Wins', 'Games Played', 'Points', 'FGM', 'FGA', 'FG%', '3PM', 'FTM',
        'FTA', 'FT%', 'OREB', 'DREB', 'REB', 'AST', 'TOV', 'STL', 'BLK', '+/-'
      ];
      
      expectedTraditional.forEach(filter => {
        expect(result.traditional).toContain(filter);
      });
    });

    test('should include common advanced filters for both measures', () => {
      const playerResult = getAvailableFilterTypes('Players');
      const teamResult = getAvailableFilterTypes('Teams');
      
      const commonAdvanced = [
        'Offensive Rating', 'Defensive Rating', 'Net Rating',
        'True Shooting %', 'Effective FG%', 'Assist %',
        'Assist Turnover Ratio', 'PIE', 'Pace'
      ];
      
      commonAdvanced.forEach(filter => {
        expect(playerResult.advanced).toContain(filter);
        expect(teamResult.advanced).toContain(filter);
      });
    });
  });

  describe('isValidOperator', () => {
    test('should validate correct operators', () => {
      const validOperators = [
        'greater than', 'less than', 'equals', 'between', 'in'
      ];
      
      validOperators.forEach(operator => {
        expect(isValidOperator(operator)).toBe(true);
      });
    });

    test('should reject invalid operators', () => {
      const invalidOperators = [
        'greater_than', 'not_equal', 'contains', 'starts_with', null, undefined, ''
      ];
      
      invalidOperators.forEach(operator => {
        expect(isValidOperator(operator)).toBe(false);
      });
    });
  });

  describe('isValidMeasure', () => {
    test('should validate correct measures', () => {
      expect(isValidMeasure('Players')).toBe(true);
      expect(isValidMeasure('Teams')).toBe(true);
    });

    test('should reject invalid measures', () => {
      const invalidMeasures = [
        'players', 'teams', 'PLAYERS', 'TEAMS', 'Games', 'Stats', null, undefined, ''
      ];
      
      invalidMeasures.forEach(measure => {
        expect(isValidMeasure(measure)).toBe(false);
      });
    });
  });

  describe('getFilterRequirements', () => {
    test('should return requirements for comparison operators', () => {
      expect(getFilterRequirements('greater than')).toEqual({
        required: ['value'],
        optional: []
      });
      
      expect(getFilterRequirements('less than')).toEqual({
        required: ['value'],
        optional: []
      });
      
      expect(getFilterRequirements('equals')).toEqual({
        required: ['value'],
        optional: []
      });
    });

    test('should return requirements for between operator', () => {
      expect(getFilterRequirements('between')).toEqual({
        required: ['value', 'value2'],
        optional: []
      });
    });

    test('should return requirements for in operator', () => {
      expect(getFilterRequirements('in')).toEqual({
        required: ['values'],
        optional: []
      });
    });

    test('should return empty requirements for unknown operator', () => {
      expect(getFilterRequirements('unknown')).toEqual({
        required: [],
        optional: []
      });
      
      expect(getFilterRequirements(null)).toEqual({
        required: [],
        optional: []
      });
    });
  });

  describe('getFilterOrganizerCompatibility', () => {
    test('should return no issues for all_games organizer', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 }
      ];
      const organizer = { type: 'all_games' };
      
      const result = getFilterOrganizerCompatibility(filters, organizer);
      
      expect(result.warnings).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.compatible).toBe(true);
    });

    test('should return no issues for null organizer', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 }
      ];
      
      const result = getFilterOrganizerCompatibility(filters, null);
      
      expect(result.warnings).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.compatible).toBe(true);
    });

    test('should suggest team filter for home_away organizer', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 }
      ];
      const organizer = { type: 'home_away', gameType: 'home' };
      
      const result = getFilterOrganizerCompatibility(filters, organizer);
      
      expect(result.suggestions).toContain(
        'Consider adding a team filter when using home/away organizer for more focused analysis'
      );
    });

    test('should not suggest team filter when team filter already exists', () => {
      const filters = [
        { type: 'Team', operator: 'in', values: ['LAL'] },
        { type: 'PTS', operator: 'greater than', value: 20 }
      ];
      const organizer = { type: 'home_away', gameType: 'home' };
      
      const result = getFilterOrganizerCompatibility(filters, organizer);
      
      expect(result.suggestions).not.toContain(
        'Consider adding a team filter when using home/away organizer for more focused analysis'
      );
    });

    test('should warn about age filters with game range organizers', () => {
      const filters = [
        { type: 'Age', operator: 'greater than', value: 25 }
      ];
      const organizer = { type: 'last_games', value: 10 };
      
      const result = getFilterOrganizerCompatibility(filters, organizer);
      
      expect(result.warnings).toContain(
        'Age filters with game range organizers may produce unexpected results as age is season-level data'
      );
      expect(result.compatible).toBe(false);
    });

    test('should warn about age filters with game_range organizers', () => {
      const filters = [
        { type: 'Age', operator: 'between', value: 25, value2: 30 }
      ];
      const organizer = { type: 'game_range', from: 10, to: 20 };
      
      const result = getFilterOrganizerCompatibility(filters, organizer);
      
      expect(result.warnings).toContain(
        'Age filters with game range organizers may produce unexpected results as age is season-level data'
      );
    });

    test('should suggest performance filters for game organizers', () => {
      const filters = [
        { type: 'Team', operator: 'in', values: ['LAL'] }
      ];
      const organizer = { type: 'last_games', value: 5 };
      
      const result = getFilterOrganizerCompatibility(filters, organizer);
      
      expect(result.suggestions).toContain(
        'Game-based organizers work best with performance-based filters (PTS, REB, AST, etc.)'
      );
    });

    test('should warn about large last_games values', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 }
      ];
      const organizer = { type: 'last_games', value: 40 };
      
      const result = getFilterOrganizerCompatibility(filters, organizer);
      
      expect(result.warnings).toContain(
        'Large "last games" values may impact query performance'
      );
    });

    test('should warn about large game ranges', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 }
      ];
      const organizer = { type: 'game_range', from: 1, to: 50 };
      
      const result = getFilterOrganizerCompatibility(filters, organizer);
      
      expect(result.warnings).toContain(
        'Large game ranges may impact query performance'
      );
    });

    test('should not warn about reasonable game ranges', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 }
      ];
      const organizer = { type: 'game_range', from: 10, to: 20 };
      
      const result = getFilterOrganizerCompatibility(filters, organizer);
      
      expect(result.warnings).not.toContain(
        'Large game ranges may impact query performance'
      );
    });

    test('should handle complex compatibility scenarios', () => {
      const filters = [
        { type: 'Team', operator: 'in', values: ['LAL'] },
        { type: 'Age', operator: 'greater than', value: 30 },
        { type: 'PTS', operator: 'greater than', value: 25 }
      ];
      const organizer = { type: 'last_games', value: 35 };
      
      const result = getFilterOrganizerCompatibility(filters, organizer);
      
      expect(result.warnings).toContain(
        'Age filters with game range organizers may produce unexpected results as age is season-level data'
      );
      expect(result.warnings).toContain(
        'Large "last games" values may impact query performance'
      );
      expect(result.compatible).toBe(false);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle filters with null/undefined properties', () => {
      const filters = [
        { type: null, operator: 'greater than', value: 20 },
        { type: 'PTS', operator: null, value: 20 },
        { type: 'REB', operator: 'greater than', value: null }
      ];
      
      const result = validateFilters(filters, 'Players');
      
      expect(result).toContain('Filter 1: missing type');
      expect(result).toContain('Filter 2: missing operator');
      expect(result).toContain("Filter 3: 'greater than' operator requires value");
    });

    test('should handle undefined filter measure', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 }
      ];
      
      const result = validateFilters(filters, undefined);
      
      // Should handle gracefully since getAvailableFilterTypes should handle undefined measure
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle empty values array for in operator', () => {
      const filters = [
        { type: 'Team', operator: 'in', values: [] }
      ];
      
      const result = validateFilters(filters, 'Players');
      
      expect(result).toContain("Filter 1: 'in' operator requires values array");
    });

    test('should handle between operator with only one value', () => {
      const filters = [
        { type: 'PTS', operator: 'between', value: 20 }
      ];
      
      const result = validateFilters(filters, 'Players');
      
      expect(result).toContain("Filter 1: 'between' operator requires both value and value2");
    });

    test('should validate multiple filters with mixed validity', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 }, // valid
        { type: 'INVALID', operator: 'greater than', value: 10 }, // invalid type
        { operator: 'less than', value: 5 }, // missing type
        { type: 'REB', value: 8 }, // missing operator
        { type: 'AST', operator: 'between', value: 5 }, // missing value2
        { type: 'Team', operator: 'in', values: ['LAL', 'GSW'] } // valid
      ];
      
      const result = validateFilters(filters, 'Players');
      
      expect(result).toHaveLength(4); // 4 validation errors
      expect(result).toContain("Filter 2: 'INVALID' is not a valid filter type for Players");
      expect(result).toContain('Filter 3: missing type');
      expect(result).toContain('Filter 4: missing operator');
      expect(result).toContain("Filter 5: 'between' operator requires both value and value2");
    });
  });
});