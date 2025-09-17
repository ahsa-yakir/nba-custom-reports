/**
 * Unit tests for sortingUtils.js
 * Tests sorting functionality for NBA statistics queries
 */

// Mock the metadata module
jest.mock('../../src/utils/metadata', () => ({
  getSortColumnMapping: jest.fn()
}));

const {
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
} = require('../../src/utils/sortingUtils');

const { getSortColumnMapping } = require('../../src/utils/metadata');

describe('sortingUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for sort column mapping
    getSortColumnMapping.mockReturnValue({
      'PTS': 'pts',
      'REB': 'reb',
      'AST': 'ast',
      'Name': 'p.name',
      'Team': 't.team_code',
      'Offensive Rating': 'offensive_rating',
      'Usage %': 'usage_percentage',
      'Wins': 'wins'
    });
  });

  describe('buildOrderByClause', () => {
    test('should build ORDER BY clause with valid sort config', () => {
      const sortConfig = { column: 'PTS', direction: 'desc' };
      
      const result = buildOrderByClause(sortConfig, 'Players', false, false);
      
      expect(result).toBe('ORDER BY pts DESC');
    });

    test('should build ORDER BY clause with ascending direction', () => {
      const sortConfig = { column: 'Name', direction: 'asc' };
      
      const result = buildOrderByClause(sortConfig, 'Players', false, false);
      
      expect(result).toBe('ORDER BY p.name ASC');
    });

    test('should use default sorting when no sort config provided', () => {
      const result = buildOrderByClause(null, 'Players', false, false);
      
      expect(result).toBe('ORDER BY pts DESC');
    });

    test('should use advanced default sorting for advanced queries', () => {
      const result = buildOrderByClause(null, 'Players', true, false);
      
      expect(result).toBe('ORDER BY offensive_rating DESC');
    });

    test('should use unified default sorting for unified queries', () => {
      const result = buildOrderByClause(null, 'Players', false, true);
      
      expect(result).toBe('ORDER BY pts DESC');
    });

    test('should use team defaults for Teams measure', () => {
      const result = buildOrderByClause(null, 'Teams', false, false);
      
      expect(result).toBe('ORDER BY wins DESC');
    });

    test('should use team advanced defaults for Teams advanced queries', () => {
      const result = buildOrderByClause(null, 'Teams', true, false);
      
      expect(result).toBe('ORDER BY net_rating DESC');
    });

    test('should use team unified defaults for Teams unified queries', () => {
      const result = buildOrderByClause(null, 'Teams', false, true);
      
      expect(result).toBe('ORDER BY wins DESC');
    });

    test('should fall back to default when unknown sort column', () => {
      const sortConfig = { column: 'UNKNOWN_COLUMN', direction: 'desc' };
      
      // Mock console.warn to avoid cluttering test output
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = buildOrderByClause(sortConfig, 'Players', false, false);
      
      expect(result).toBe('ORDER BY pts DESC');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unknown sort column: UNKNOWN_COLUMN, falling back to default'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getDefaultSort', () => {
    test('should return default sort for Players traditional', () => {
      const result = getDefaultSort('Players', false, false);
      
      expect(result).toEqual({
        column: 'PTS',
        direction: 'desc'
      });
    });

    test('should return default sort for Players advanced', () => {
      const result = getDefaultSort('Players', true, false);
      
      expect(result).toEqual({
        column: 'Offensive Rating',
        direction: 'desc'
      });
    });

    test('should return default sort for Players unified', () => {
      const result = getDefaultSort('Players', false, true);
      
      expect(result).toEqual({
        column: 'PTS',
        direction: 'desc'
      });
    });

    test('should return default sort for Teams traditional', () => {
      const result = getDefaultSort('Teams', false, false);
      
      expect(result).toEqual({
        column: 'Wins',
        direction: 'desc'
      });
    });

    test('should return default sort for Teams advanced', () => {
      const result = getDefaultSort('Teams', true, false);
      
      expect(result).toEqual({
        column: 'Net Rating',
        direction: 'desc'
      });
    });

    test('should return default sort for Teams unified', () => {
      const result = getDefaultSort('Teams', false, true);
      
      expect(result).toEqual({
        column: 'Wins',
        direction: 'desc'
      });
    });
  });

  describe('getSmartDefaultSort', () => {
    test('should return default when no filters provided', () => {
      const result = getSmartDefaultSort('Players', []);
      
      expect(result).toEqual({
        column: 'PTS',
        direction: 'desc'
      });
    });

    test('should return default when null filters provided', () => {
      const result = getSmartDefaultSort('Players', null);
      
      expect(result).toEqual({
        column: 'PTS',
        direction: 'desc'
      });
    });

    test('should use first numeric filter as sort column', () => {
      const filters = [
        { type: 'Team', operator: 'in', values: ['LAL'] },
        { type: 'REB', operator: 'greater than', value: 10 },
        { type: 'AST', operator: 'greater than', value: 5 }
      ];
      
      const result = getSmartDefaultSort('Players', filters);
      
      expect(result).toEqual({
        column: 'REB',
        direction: 'desc'
      });
    });

    test('should ignore non-numeric filters', () => {
      const filters = [
        { type: 'Team', operator: 'in', values: ['LAL'] },
        { type: 'Age', operator: 'between', value: 25, value2: 30 }
      ];
      
      const result = getSmartDefaultSort('Players', filters);
      
      expect(result).toEqual({
        column: 'PTS',
        direction: 'desc'
      });
    });

    test('should ignore filters with non-numeric operators', () => {
      const filters = [
        { type: 'PTS', operator: 'in', values: [20, 25, 30] }
      ];
      
      const result = getSmartDefaultSort('Players', filters);
      
      expect(result).toEqual({
        column: 'PTS',
        direction: 'desc'
      });
    });
  });

  describe('isValidSortColumn', () => {
    test('should return true for valid sort columns', () => {
      expect(isValidSortColumn('PTS', 'Players', false, false)).toBe(true);
      expect(isValidSortColumn('REB', 'Players', false, false)).toBe(true);
      expect(isValidSortColumn('Name', 'Players', false, false)).toBe(true);
    });

    test('should return false for invalid sort columns', () => {
      expect(isValidSortColumn('INVALID_COLUMN', 'Players', false, false)).toBe(false);
      expect(isValidSortColumn('', 'Players', false, false)).toBe(false);
      expect(isValidSortColumn(null, 'Players', false, false)).toBe(false);
    });

    test('should check against advanced columns for advanced queries', () => {
      expect(isValidSortColumn('Offensive Rating', 'Players', true, false)).toBe(true);
    });

    test('should check against unified columns for unified queries', () => {
      expect(isValidSortColumn('Usage %', 'Players', false, true)).toBe(true);
    });
  });

  describe('isValidSortDirection', () => {
    test('should return true for valid directions', () => {
      expect(isValidSortDirection('asc')).toBe(true);
      expect(isValidSortDirection('desc')).toBe(true);
      expect(isValidSortDirection('ASC')).toBe(true);
      expect(isValidSortDirection('DESC')).toBe(true);
    });

    test('should return false for invalid directions', () => {
      expect(isValidSortDirection('invalid')).toBe(false);
      expect(isValidSortDirection('')).toBe(false);
      expect(isValidSortDirection(null)).toBe(false);
      expect(isValidSortDirection(undefined)).toBe(false);
    });
  });

  describe('normalizeSortConfig', () => {
    test('should normalize valid sort config', () => {
      const sortConfig = { column: 'PTS', direction: 'DESC' };
      
      const result = normalizeSortConfig(sortConfig, 'Players', false, false);
      
      expect(result).toEqual({
        column: 'PTS',
        direction: 'desc'
      });
    });

    test('should return default when no sort config provided', () => {
      const result = normalizeSortConfig(null, 'Players', false, false);
      
      expect(result).toEqual({
        column: 'PTS',
        direction: 'desc'
      });
    });

    test('should use default direction when invalid direction provided', () => {
      const sortConfig = { column: 'PTS', direction: 'invalid' };
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = normalizeSortConfig(sortConfig, 'Players', false, false);
      
      expect(result.direction).toBe('desc');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid sort direction: invalid, using desc'
      );
      
      consoleSpy.mockRestore();
    });

    test('should use default when invalid column provided', () => {
      const sortConfig = { column: 'INVALID_COLUMN', direction: 'asc' };
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = normalizeSortConfig(sortConfig, 'Players', false, false);
      
      expect(result).toEqual({
        column: 'PTS',
        direction: 'desc'
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid sort column: INVALID_COLUMN, using default'
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle missing direction', () => {
      const sortConfig = { column: 'PTS' };
      
      const result = normalizeSortConfig(sortConfig, 'Players', false, false);
      
      expect(result).toEqual({
        column: 'PTS',
        direction: 'desc'
      });
    });
  });

  describe('buildMultiColumnSort', () => {
    test('should build multi-column ORDER BY clause', () => {
      const sortConfigs = [
        { column: 'PTS', direction: 'desc' },
        { column: 'REB', direction: 'asc' }
      ];
      
      const result = buildMultiColumnSort(sortConfigs, 'Players', false, false);
      
      expect(result).toBe('ORDER BY pts DESC, reb ASC');
    });

    test('should handle single column sort', () => {
      const sortConfigs = [
        { column: 'AST', direction: 'desc' }
      ];
      
      const result = buildMultiColumnSort(sortConfigs, 'Players', false, false);
      
      expect(result).toBe('ORDER BY ast DESC');
    });

    test('should filter out invalid columns', () => {
      const sortConfigs = [
        { column: 'PTS', direction: 'desc' },
        { column: 'INVALID_COLUMN', direction: 'asc' },
        { column: 'REB', direction: 'asc' }
      ];
      
      const result = buildMultiColumnSort(sortConfigs, 'Players', false, false);
      
      expect(result).toBe('ORDER BY pts DESC, pts DESC, reb ASC');
    });

    test('should use default when no valid sorts', () => {
      const sortConfigs = [
        { column: 'INVALID_COLUMN', direction: 'desc' }
      ];
      
      const result = buildMultiColumnSort(sortConfigs, 'Players', false, false);
      
      expect(result).toBe('ORDER BY pts DESC');
    });

    test('should use default when empty array provided', () => {
      const result = buildMultiColumnSort([], 'Players', false, false);
      
      expect(result).toBe('ORDER BY pts DESC');
    });

    test('should use default when null provided', () => {
      const result = buildMultiColumnSort(null, 'Players', false, false);
      
      expect(result).toBe('ORDER BY pts DESC');
    });
  });

  describe('getAvailableSortColumns', () => {
    test('should return available sort columns for Players', () => {
      const result = getAvailableSortColumns('Players', false, false);
      
      expect(result).toEqual(['PTS', 'REB', 'AST', 'Name', 'Team', 'Offensive Rating', 'Usage %', 'Wins']);
    });

    test('should return available sort columns for Teams', () => {
      const result = getAvailableSortColumns('Teams', false, false);
      
      expect(result).toEqual(['PTS', 'REB', 'AST', 'Name', 'Team', 'Offensive Rating', 'Usage %', 'Wins']);
    });

    test('should call getSortColumnMapping with correct parameters', () => {
      getAvailableSortColumns('Players', true, true);
      
      expect(getSortColumnMapping).toHaveBeenCalledWith('Players', true, true);
    });
  });

  describe('getSortColumnInfo', () => {
    test('should return sort column information', () => {
      const result = getSortColumnInfo('Players', false, false);
      
      expect(result).toEqual([
        {
          column: 'PTS',
          type: 'numeric',
          dbColumn: 'pts',
          defaultDirection: 'desc'
        },
        {
          column: 'REB',
          type: 'numeric',
          dbColumn: 'reb',
          defaultDirection: 'desc'
        },
        {
          column: 'AST',
          type: 'numeric',
          dbColumn: 'ast',
          defaultDirection: 'desc'
        },
        {
          column: 'Name',
          type: 'string',
          dbColumn: 'p.name',
          defaultDirection: 'asc'
        },
        {
          column: 'Team',
          type: 'string',
          dbColumn: 't.team_code',
          defaultDirection: 'asc'
        },
        {
          column: 'Offensive Rating',
          type: 'percentage',
          dbColumn: 'offensive_rating',
          defaultDirection: 'desc'
        },
        {
          column: 'Usage %',
          type: 'percentage',
          dbColumn: 'usage_percentage',
          defaultDirection: 'desc'
        },
        {
          column: 'Wins',
          type: 'numeric',
          dbColumn: 'wins',
          defaultDirection: 'desc'
        }
      ]);
    });

    test('should identify string columns correctly', () => {
      const result = getSortColumnInfo('Players', false, false);
      const stringColumns = result.filter(col => col.type === 'string');
      
      expect(stringColumns).toEqual([
        {
          column: 'Name',
          type: 'string',
          dbColumn: 'p.name',
          defaultDirection: 'asc'
        },
        {
          column: 'Team',
          type: 'string',
          dbColumn: 't.team_code',
          defaultDirection: 'asc'
        }
      ]);
    });

    test('should identify percentage columns correctly', () => {
      const result = getSortColumnInfo('Players', false, false);
      const percentageColumns = result.filter(col => col.type === 'percentage');
      
      expect(percentageColumns).toEqual([
        {
          column: 'Offensive Rating',
          type: 'percentage',
          dbColumn: 'offensive_rating',
          defaultDirection: 'desc'
        },
        {
          column: 'Usage %',
          type: 'percentage',
          dbColumn: 'usage_percentage',
          defaultDirection: 'desc'
        }
      ]);
    });
  });

  describe('optimizeSortForQuery', () => {
    test('should return sort config unchanged for non-unified queries', () => {
      const sortConfig = { column: 'Offensive Rating', direction: 'desc' };
      
      const result = optimizeSortForQuery(sortConfig, 'Players', false);
      
      expect(result).toEqual(sortConfig);
    });

    test('should return sort config for unified queries with safe columns', () => {
      const sortConfig = { column: 'PTS', direction: 'desc' };
      
      const result = optimizeSortForQuery(sortConfig, 'Players', true);
      
      expect(result).toEqual(sortConfig);
    });

    test('should warn about potentially NULL columns in unified queries', () => {
      const sortConfig = { column: 'Offensive Rating', direction: 'desc' };
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = optimizeSortForQuery(sortConfig, 'Players', true);
      
      expect(result).toEqual(sortConfig);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Sort column Offensive Rating may contain NULLs in unified query, consider alternatives'
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle null sort config', () => {
      const result = optimizeSortForQuery(null, 'Players', true);
      
      expect(result).toBeNull();
    });

    test('should handle Teams measure unified queries', () => {
      const sortConfig = { column: 'Wins', direction: 'desc' };
      
      const result = optimizeSortForQuery(sortConfig, 'Teams', true);
      
      expect(result).toEqual(sortConfig);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle getSortColumnMapping returning empty object', () => {
      getSortColumnMapping.mockReturnValue({});
      
      const result = buildOrderByClause({ column: 'PTS', direction: 'desc' }, 'Players', false, false);
      
      expect(result).toBe('ORDER BY pts DESC'); // Should fall back to default
    });

    test('should handle case-insensitive direction normalization', () => {
      const sortConfig = { column: 'PTS', direction: 'AsC' };
      
      const result = normalizeSortConfig(sortConfig, 'Players', false, false);
      
      expect(result.direction).toBe('asc');
    });

    test('should handle undefined direction in normalization', () => {
      const sortConfig = { column: 'PTS', direction: undefined };
      
      const result = normalizeSortConfig(sortConfig, 'Players', false, false);
      
      expect(result.direction).toBe('desc');
    });
  });
});