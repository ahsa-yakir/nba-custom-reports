/**
 * Unit tests for queryBuilder.js
 * Tests query building logic, validation, and metadata functions
 */

// Mock the database module before importing queryBuilder
jest.mock('../../src/config/database', () => ({
  query: jest.fn()
}));

// Mock the unifiedQueryBuilder module
jest.mock('../../src/utils/unifiedQueryBuilder', () => ({
  buildUnifiedQuery: jest.fn(),
  executeQuery: jest.fn(),
  analyzeFilterTypes: jest.fn(),
  getRecommendedViewType: jest.fn(),
  getActiveColumns: jest.fn()
}));

const {
  buildReportQuery,
  buildCountQuery,
  getSampleData,
  testQueryPerformance,
  getQueryMetadata,
  validateFilters,
  hasAdvancedFilters,
  validateOrganizer,
  getOrganizerDescription
} = require('../../src/utils/queryBuilder');

const { query: mockQuery } = require('../../src/config/database');
const {
  analyzeFilterTypes,
  getRecommendedViewType,
  getActiveColumns
} = require('../../src/utils/unifiedQueryBuilder');

describe('queryBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    analyzeFilterTypes.mockReturnValue({
      hasTraditional: true,
      hasAdvanced: false,
      hasIdentity: true,
      isMixed: false,
      filterTypes: ['PTS', 'Team']
    });
    
    getRecommendedViewType.mockReturnValue('traditional');
    getActiveColumns.mockReturnValue(['Name', 'Team', 'PTS']);
  });

  describe('buildReportQuery', () => {
    test('should build query for Players with traditional filters', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 },
        { type: 'Team', operator: 'in', values: ['LAL', 'GSW'] }
      ];
      const organizer = { type: 'all_games' };
      
      const result = buildReportQuery('Players', filters, organizer, null, 100, 'traditional');
      
      expect(result).toHaveProperty('sql');
      expect(result).toHaveProperty('params');
      expect(result).toHaveProperty('isAdvanced');
      expect(result).toHaveProperty('normalizedSort');
      expect(result).toHaveProperty('organizerDescription');
      expect(result.isAdvanced).toBe(false);
      expect(result.organizerDescription).toBe('All Games');
      expect(typeof result.sql).toBe('string');
      expect(Array.isArray(result.params)).toBe(true);
    });

    test('should build query for Teams with advanced filters', () => {
      analyzeFilterTypes.mockReturnValue({
        hasTraditional: false,
        hasAdvanced: true,
        hasIdentity: false,
        isMixed: false,
        filterTypes: ['Offensive Rating']
      });
      
      const filters = [
        { type: 'Offensive Rating', operator: 'greater than', value: 110 }
      ];
      const organizer = { type: 'last_games', value: 10 };
      
      const result = buildReportQuery('Teams', filters, organizer, null, 50, 'advanced');
      
      expect(result.sql).toContain('team_advanced_stats tas');
      expect(result.isAdvanced).toBe(true);
      expect(result.organizerDescription).toBe('Last 10 Games (Per Player/Team)');
    });

    test('should use unified query for mixed filters', () => {
      analyzeFilterTypes.mockReturnValue({
        hasTraditional: true,
        hasAdvanced: true,
        hasIdentity: false,
        isMixed: true,
        filterTypes: ['PTS', 'Offensive Rating']
      });
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 },
        { type: 'Offensive Rating', operator: 'greater than', value: 110 }
      ];
      const organizer = { type: 'all_games' };
      
      const result = buildReportQuery('Players', filters, organizer, null, 100, 'unified');
      
      expect(result.isUnified).toBe(true);
    });

    test('should throw error for invalid measure', () => {
      expect(() => {
        buildReportQuery('InvalidMeasure', [], { type: 'all_games' });
      }).toThrow('Invalid measure. Must be "Players" or "Teams"');
    });

    test('should throw error for non-array filters', () => {
      expect(() => {
        buildReportQuery('Players', 'not-an-array', { type: 'all_games' });
      }).toThrow('Filters must be an array');
    });

    test('should use default organizer when not provided', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      
      const result = buildReportQuery('Players', filters, null);
      
      expect(result.organizerDescription).toBe('All Games');
    });

    test('should validate organizer and throw on invalid', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const invalidOrganizer = { type: 'invalid_type' };
      
      expect(() => {
        buildReportQuery('Players', filters, invalidOrganizer);
      }).toThrow('Organizer validation failed');
    });

    test('should include sort configuration in result', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'all_games' };
      const sortConfig = { column: 'PTS', direction: 'desc' };
      
      const result = buildReportQuery('Players', filters, organizer, sortConfig);
      
      expect(result.normalizedSort).toEqual({
        column: 'PTS',
        direction: 'desc'
      });
    });

    test('should apply limit to query', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'all_games' };
      
      const result = buildReportQuery('Players', filters, organizer, null, 50);
      
      expect(result.sql).toContain('LIMIT 50');
    });

    test('should cap limit at 1000', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'all_games' };
      
      const result = buildReportQuery('Players', filters, organizer, null, 5000);
      
      expect(result.sql).toContain('LIMIT 1000');
    });
  });

  describe('buildCountQuery', () => {
    test('should build count query for Players', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'all_games' };
      
      const result = buildCountQuery('Players', filters, organizer);
      
      expect(result).toHaveProperty('sql');
      expect(result).toHaveProperty('params');
      expect(result.sql).toContain('SELECT COUNT(*) as total_count');
      expect(result.sql).toContain('FROM (');
      expect(result.sql).toContain(') subquery');
    });

    test('should build count query for Teams with advanced filters', () => {
      analyzeFilterTypes.mockReturnValue({
        hasTraditional: false,
        hasAdvanced: true,
        hasIdentity: false,
        isMixed: false,
        filterTypes: ['Net Rating']
      });
      
      const filters = [{ type: 'Net Rating', operator: 'greater than', value: 5 }];
      const organizer = { type: 'home_away', gameType: 'home' };
      
      const result = buildCountQuery('Teams', filters, organizer, 'advanced');
      
      expect(result.sql).toContain('SELECT COUNT(*) as total_count');
      expect(result.sql).toContain('team_advanced_stats');
    });

    test('should handle unified count query for mixed filters', () => {
      analyzeFilterTypes.mockReturnValue({
        hasTraditional: true,
        hasAdvanced: true,
        hasIdentity: false,
        isMixed: true,
        filterTypes: ['PTS', 'Usage %']
      });
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 },
        { type: 'Usage %', operator: 'greater than', value: 25 }
      ];
      const organizer = { type: 'all_games' };
      
      const result = buildCountQuery('Players', filters, organizer, 'unified');
      
      expect(result.sql).toContain('SELECT COUNT(*) as total_count');
    });
  });

  describe('getSampleData', () => {
    beforeEach(() => {
      mockQuery.mockResolvedValue({
        rows: [
          { name: 'LeBron James', team: 'LAL', pts: 25.5 },
          { name: 'Stephen Curry', team: 'GSW', pts: 28.2 }
        ]
      });
    });

    test('should get sample data for Players', async () => {
      const organizer = { type: 'all_games' };
      
      const result = await getSampleData('Players', organizer, 5, 'traditional');
      
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toHaveProperty('name');
      expect(result.rows[0]).toHaveProperty('team');
      expect(result.rows[0]).toHaveProperty('pts');
    });

    test('should get sample data for Teams', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { team: 'LAL', wins: 45, pts: 112.5 },
          { team: 'GSW', wins: 42, pts: 115.8 }
        ]
      });
      
      const organizer = { type: 'last_games', value: 10 };
      
      const result = await getSampleData('Teams', organizer, 3, 'traditional');
      
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toHaveProperty('team');
      expect(result.rows[0]).toHaveProperty('wins');
    });

    test('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(getSampleData('Players', { type: 'all_games' }))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('testQueryPerformance', () => {
    beforeEach(() => {
      mockQuery.mockResolvedValue({ rows: [] });
    });

    test('should test query performance and return timing', async () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'all_games' };
      
      const result = await testQueryPerformance('Players', filters, organizer, null, 'traditional');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('queryType');
      expect(result).toHaveProperty('organizer');
      expect(result.success).toBe(true);
      expect(typeof result.duration).toBe('number');
      expect(result.queryType).toBe('restructured');
    });

    test('should handle performance test failures', async () => {
      mockQuery.mockRejectedValue(new Error('Query timeout'));
      
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'all_games' };
      
      const result = await testQueryPerformance('Players', filters, organizer, null, 'traditional');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Query timeout');
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('getQueryMetadata', () => {
    test('should return query metadata for traditional filters', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 },
        { type: 'REB', operator: 'greater than', value: 8 }
      ];
      const organizer = { type: 'all_games' };
      
      const result = getQueryMetadata('Players', filters, organizer, 'traditional');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('filterAnalysis');
      expect(result).toHaveProperty('recommendedViewType');
      expect(result).toHaveProperty('activeColumns');
      expect(result).toHaveProperty('queryType');
      expect(result).toHaveProperty('organizerDescription');
      expect(result).toHaveProperty('suggestions');
      expect(result.success).toBe(true);
      expect(result.organizerDescription).toBe('All Games');
    });

    test('should return query metadata for advanced filters', () => {
      analyzeFilterTypes.mockReturnValue({
        hasTraditional: false,
        hasAdvanced: true,
        hasIdentity: false,
        isMixed: false,
        filterTypes: ['Usage %']
      });
      getRecommendedViewType.mockReturnValue('advanced');
      
      const filters = [{ type: 'Usage %', operator: 'greater than', value: 25 }];
      const organizer = { type: 'last_games', value: 5 };
      
      const result = getQueryMetadata('Players', filters, organizer, 'traditional');
      
      expect(result.success).toBe(true);
      expect(result.recommendedViewType).toBe('advanced');
      expect(result.organizerDescription).toBe('Last 5 Games (Per Player/Team)');
    });

    test('should return metadata for unified queries', () => {
      analyzeFilterTypes.mockReturnValue({
        hasTraditional: true,
        hasAdvanced: true,
        hasIdentity: false,
        isMixed: true,
        filterTypes: ['PTS', 'Net Rating']
      });
      getRecommendedViewType.mockReturnValue('custom');
      
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 },
        { type: 'Net Rating', operator: 'greater than', value: 5 }
      ];
      const organizer = { type: 'home_away', gameType: 'home' };
      
      const result = getQueryMetadata('Players', filters, organizer, 'unified');
      
      expect(result.success).toBe(true);
      expect(result.recommendedViewType).toBe('custom');
      expect(result.organizerDescription).toBe('Home Games');
    });

    test('should handle errors in metadata generation', () => {
      analyzeFilterTypes.mockImplementation(() => {
        throw new Error('Filter analysis failed');
      });
      
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'all_games' };
      
      const result = getQueryMetadata('Players', filters, organizer, 'traditional');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Filter analysis failed');
    });
  });

  describe('integration with organizer types', () => {
    test('should handle last_games organizer correctly', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 25 }];
      const organizer = { type: 'last_games', value: 10 };
      
      const result = buildReportQuery('Players', filters, organizer);
      
      expect(result.organizerDescription).toBe('Last 10 Games (Per Player/Team)');
      expect(result.sql).toContain('WITH ranked_games AS');
      expect(result.sql).toContain('game_rank <= 10');
    });

    test('should handle game_range organizer correctly', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'game_range', from: 10, to: 20 };
      
      const result = buildReportQuery('Players', filters, organizer);
      
      expect(result.organizerDescription).toBe('Games 10 to 20');
      expect(result.sql).toContain('BETWEEN 10 AND 20');
    });

    test('should handle home_away organizer correctly', () => {
      const filters = [{ type: 'Wins', operator: 'greater than', value: 30 }];
      const organizer = { type: 'home_away', gameType: 'home' };
      
      const result = buildReportQuery('Teams', filters, organizer);
      
      expect(result.organizerDescription).toBe('Home Games');
      expect(result.sql).toContain('tgs.team_id = g.home_team_id');
    });

    test('should handle date_range organizer correctly', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = {
        type: 'date_range',
        fromDate: '2024-01-01',
        toDate: '2024-01-31'
      };
      
      const result = buildReportQuery('Players', filters, organizer);
      
      expect(result.organizerDescription).toBe('2024-01-01 to 2024-01-31');
      expect(result.sql).toContain("g.game_date >= '2024-01-01'");
      expect(result.sql).toContain("g.game_date <= '2024-01-31'");
    });

    test('should handle last_period organizer correctly', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'last_period', period: 'days', value: 7 };
      
      const result = buildReportQuery('Players', filters, organizer);
      
      expect(result.organizerDescription).toBe('Last 7 Days');
      expect(result.sql).toContain('latest_game_date');
      expect(result.sql).toContain("INTERVAL '7 days'");
    });
  });

  describe('re-exported function validation', () => {
    test('should re-export validateFilters function', () => {
      expect(typeof validateFilters).toBe('function');
    });

    test('should re-export hasAdvancedFilters function', () => {
      expect(typeof hasAdvancedFilters).toBe('function');
    });

    test('should re-export validateOrganizer function', () => {
      expect(typeof validateOrganizer).toBe('function');
    });

    test('should re-export getOrganizerDescription function', () => {
      expect(typeof getOrganizerDescription).toBe('function');
    });
  });

  describe('error handling', () => {
    test('should handle database connection errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database not connected'));
      
      await expect(getSampleData('Players', { type: 'all_games' }))
        .rejects.toThrow('Database not connected');
    });

    test('should validate filter parameters', () => {
      expect(() => {
        buildReportQuery('Players', [
          { type: 'PTS', operator: 'invalid_operator', value: 20 }
        ], { type: 'all_games' });
      }).not.toThrow(); // The query builder should handle this gracefully
    });

    test('should handle missing sort column gracefully', () => {
      const filters = [{ type: 'PTS', operator: 'greater than', value: 20 }];
      const organizer = { type: 'all_games' };
      const sortConfig = { column: 'INVALID_COLUMN', direction: 'desc' };
      
      const result = buildReportQuery('Players', filters, organizer, sortConfig);
      
      // Should fall back to default sorting
      expect(result.sql).toContain('ORDER BY');
    });
  });
});