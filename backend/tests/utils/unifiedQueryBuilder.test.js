/**
 * Unit tests for unifiedQueryBuilder.js utility
 * Tests unified query building for NBA statistics that combines traditional and advanced stats
 */

// Mock the database module
jest.mock('../../src/config/database', () => ({
  query: jest.fn()
}));

// Mock other dependencies
jest.mock('../../src/utils/whereClauseBuilder', () => ({
  buildWhereClause: jest.fn()
}));

jest.mock('../../src/utils/sortingUtils', () => ({
  buildOrderByClause: jest.fn(),
  normalizeSortConfig: jest.fn()
}));

jest.mock('../../src/utils/filterValidation', () => ({
  hasAdvancedFilters: jest.fn(),
  validateFilters: jest.fn()
}));

jest.mock('../../src/utils/metadata', () => ({
  PLAYER_COLUMNS: {
    'PTS': { category: 'traditional' },
    'REB': { category: 'traditional' },
    'AST': { category: 'traditional' },
    'Name': { category: 'identity' },
    'Team': { category: 'identity' },
    'Offensive Rating': { category: 'advanced' },
    'Usage %': { category: 'advanced' },
    'True Shooting %': { category: 'advanced' }
  },
  TEAM_COLUMNS: {
    'Points': { category: 'traditional' },
    'Wins': { category: 'traditional' },
    'Team': { category: 'identity' },
    'Offensive Rating': { category: 'advanced' },
    'Net Rating': { category: 'advanced' }
  }
}));

const {
  executeQuery,
  buildUnifiedQuery,
  getPlayerUnifiedQuery,
  getTeamUnifiedQuery,
  getUnifiedGroupByClause,
  analyzeFilterTypes,
  getRecommendedViewType,
  getActiveColumns
} = require('../../src/utils/unifiedQueryBuilder');

const { query: mockQuery } = require('../../src/config/database');
const { buildWhereClause } = require('../../src/utils/whereClauseBuilder');
const { buildOrderByClause, normalizeSortConfig } = require('../../src/utils/sortingUtils');
const { hasAdvancedFilters } = require('../../src/utils/filterValidation');

describe('unifiedQueryBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    buildWhereClause.mockReturnValue({
      whereClause: ' AND pgs.points > 20',
      params: [20]
    });
    
    buildOrderByClause.mockReturnValue('ORDER BY pts DESC');
    normalizeSortConfig.mockReturnValue({ column: 'PTS', direction: 'desc' });
    hasAdvancedFilters.mockReturnValue(false);
    
    mockQuery.mockResolvedValue({
      rows: [
        { name: 'LeBron James', team: 'LAL', pts: 25.5, offensive_rating: 118.2 },
        { name: 'Stephen Curry', team: 'GSW', pts: 28.1, offensive_rating: 120.5 }
      ]
    });
  });

  describe('executeQuery', () => {
    test('should execute query successfully and log timing', async () => {
      const sql = 'SELECT * FROM players';
      const params = [25];
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await executeQuery(sql, params);
      
      expect(mockQuery).toHaveBeenCalledWith(sql, params);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toHaveProperty('name', 'LeBron James');
      
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Executing unified query:', expect.stringContaining('SELECT * FROM players'));
      expect(consoleSpy).toHaveBeenCalledWith('🎯 Parameters:', [25]);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/✅ Unified query completed in \d+ms, 2 rows returned/));
      
      consoleSpy.mockRestore();
    });

    test('should handle query execution errors', async () => {
      const sql = 'INVALID SQL';
      const params = [];
      const error = new Error('SQL syntax error');
      
      mockQuery.mockRejectedValue(error);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await expect(executeQuery(sql, params)).rejects.toThrow('SQL syntax error');
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ Unified query execution failed:', error);
      
      consoleSpy.mockRestore();
    });

    test('should handle empty parameters array', async () => {
      const sql = 'SELECT COUNT(*) FROM players';
      
      const result = await executeQuery(sql);
      
      expect(mockQuery).toHaveBeenCalledWith(sql, []);
      expect(result.rows).toHaveLength(2);
    });

    test('should log truncated SQL for very long queries', async () => {
      const longSql = 'SELECT ' + 'very_long_column_name, '.repeat(100) + 'FROM players';
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await executeQuery(longSql, []);
      
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Executing unified query:', expect.stringMatching(/SELECT.*\.\.\./));
      
      consoleSpy.mockRestore();
    });
  });

  describe('getPlayerUnifiedQuery', () => {
    test('should return player unified query with all stats', () => {
      const query = getPlayerUnifiedQuery();
      
      expect(query).toContain('SELECT');
      expect(query).toContain('p.id as player_id');
      expect(query).toContain('p.name');
      expect(query).toContain('t.team_code as team');
      expect(query).toContain('p.age');
      expect(query).toContain('COUNT(DISTINCT pgs.game_id) as games_played');
      
      // Traditional stats
      expect(query).toContain('ROUND(AVG(pgs.minutes_played), 1) as mins');
      expect(query).toContain('ROUND(AVG(pgs.points), 1) as pts');
      expect(query).toContain('ROUND(AVG(pgs.field_goals_made), 1) as fgm');
      expect(query).toContain('ROUND(AVG(pgs.total_rebounds), 1) as reb');
      expect(query).toContain('ROUND(AVG(pgs.assists), 1) as ast');
      
      // Advanced stats
      expect(query).toContain('ROUND(AVG(pas.offensive_rating), 1) as offensive_rating');
      expect(query).toContain('ROUND(AVG(pas.defensive_rating), 1) as defensive_rating');
      expect(query).toContain('ROUND(AVG(pas.net_rating), 1) as net_rating');
      expect(query).toContain('ROUND(AVG(pas.usage_percentage * 100), 1) as usage_percentage');
      expect(query).toContain('ROUND(AVG(pas.true_shooting_percentage * 100), 1) as true_shooting_percentage');
      
      // Metadata
      expect(query).toContain('COUNT(DISTINCT CASE WHEN pas.game_id IS NOT NULL THEN pas.game_id END) as advanced_games_available');
      
      // Table joins
      expect(query).toContain('FROM players p');
      expect(query).toContain('JOIN teams t ON p.team_id = t.id');
      expect(query).toContain('JOIN player_game_stats pgs ON p.id = pgs.player_id');
      expect(query).toContain('JOIN games g ON pgs.game_id = g.id');
      expect(query).toContain('LEFT JOIN player_advanced_stats pas ON p.id = pas.player_id AND pgs.game_id = pas.game_id');
      expect(query).toContain('WHERE 1=1');
    });

    test('should include all required player statistical categories', () => {
      const query = getPlayerUnifiedQuery();
      
      // Shooting percentages
      expect(query).toContain('ROUND(AVG(pgs.field_goal_percentage * 100), 1) as fg_pct');
      expect(query).toContain('ROUND(AVG(pgs.three_point_percentage * 100), 1) as tp_pct');
      expect(query).toContain('ROUND(AVG(pgs.free_throw_percentage * 100), 1) as ft_pct');
      
      // Rebounding stats
      expect(query).toContain('ROUND(AVG(pgs.offensive_rebounds), 1) as oreb');
      expect(query).toContain('ROUND(AVG(pgs.defensive_rebounds), 1) as dreb');
      
      // Other traditional stats
      expect(query).toContain('ROUND(AVG(pgs.turnovers), 1) as tov');
      expect(query).toContain('ROUND(AVG(pgs.steals), 1) as stl');
      expect(query).toContain('ROUND(AVG(pgs.blocks), 1) as blk');
      expect(query).toContain('ROUND(AVG(pgs.personal_fouls), 1) as pf');
      expect(query).toContain('ROUND(AVG(pgs.plus_minus), 1) as plus_minus');
      
      // Advanced percentages
      expect(query).toContain('ROUND(AVG(pas.effective_field_goal_percentage * 100), 1) as effective_field_goal_percentage');
      expect(query).toContain('ROUND(AVG(pas.assist_percentage * 100), 1) as assist_percentage');
      expect(query).toContain('ROUND(AVG(pas.rebound_percentage * 100), 1) as rebound_percentage');
      expect(query).toContain('ROUND(AVG(pas.turnover_percentage * 100), 1) as turnover_percentage');
    });
  });

  describe('getTeamUnifiedQuery', () => {
    test('should return team unified query with all stats', () => {
      const query = getTeamUnifiedQuery();
      
      expect(query).toContain('SELECT');
      expect(query).toContain('t.team_code as team');
      expect(query).toContain('COUNT(DISTINCT tgs.game_id) as games_played');
      
      // Traditional stats
      expect(query).toContain('SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) as wins');
      expect(query).toContain('SUM(CASE WHEN tgs.win = FALSE THEN 1 ELSE 0 END) as losses');
      expect(query).toContain('ROUND(SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as win_pct');
      expect(query).toContain('ROUND(AVG(tgs.points), 1) as pts');
      expect(query).toContain('ROUND(AVG(tgs.field_goals_made), 1) as fgm');
      expect(query).toContain('ROUND(AVG(tgs.assists), 1) as ast');
      
      // Advanced stats
      expect(query).toContain('ROUND(AVG(tas.offensive_rating), 1) as offensive_rating');
      expect(query).toContain('ROUND(AVG(tas.defensive_rating), 1) as defensive_rating');
      expect(query).toContain('ROUND(AVG(tas.net_rating), 1) as net_rating');
      expect(query).toContain('ROUND(AVG(tas.pace), 1) as pace');
      
      // Metadata
      expect(query).toContain('COUNT(DISTINCT CASE WHEN tas.game_id IS NOT NULL THEN tas.game_id END) as advanced_games_available');
      
      // Table joins
      expect(query).toContain('FROM teams t');
      expect(query).toContain('JOIN team_game_stats tgs ON t.id = tgs.team_id');
      expect(query).toContain('JOIN games g ON tgs.game_id = g.id');
      expect(query).toContain('LEFT JOIN team_advanced_stats tas ON t.id = tas.team_id AND tgs.game_id = tas.game_id');
      expect(query).toContain('WHERE 1=1');
    });
  });

  describe('getUnifiedGroupByClause', () => {
    test('should return correct GROUP BY clause for Players', () => {
      const result = getUnifiedGroupByClause('Players');
      
      expect(result).toBe(' GROUP BY p.id, p.name, t.team_code, p.age');
    });

    test('should return correct GROUP BY clause for Teams', () => {
      const result = getUnifiedGroupByClause('Teams');
      
      expect(result).toBe(' GROUP BY t.id, t.team_code');
    });
  });

  describe('buildUnifiedQuery', () => {
    test('should build complete unified query for Players', () => {
      const filters = [
        { type: 'PTS', operator: 'greater than', value: 20 }
      ];
      const sortConfig = { column: 'PTS', direction: 'desc' };
      
      const result = buildUnifiedQuery('Players', filters, sortConfig, 50);
      
      expect(result).toHaveProperty('sql');
      expect(result).toHaveProperty('params');
      expect(result).toHaveProperty('normalizedSort');
      expect(result).toHaveProperty('hasAdvancedFilters');
      expect(result).toHaveProperty('isUnified');
      
      expect(result.isUnified).toBe(true);
      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('FROM players p');
      expect(result.sql).toContain('GROUP BY p.id, p.name, t.team_code, p.age');
      expect(result.sql).toContain('ORDER BY pts DESC');
      expect(result.sql).toContain('LIMIT 50');
      expect(result.params).toEqual([20]);
    });

    test('should validate inputs and throw errors', () => {
      expect(() => {
        buildUnifiedQuery('InvalidMeasure', [], null, 100);
      }).toThrow('Invalid measure. Must be "Players" or "Teams"');
      
      expect(() => {
        buildUnifiedQuery('Players', 'not-an-array', null, 100);
      }).toThrow('Filters must be an array');
    });

    test('should cap limit at 1000', () => {
      const result = buildUnifiedQuery('Players', [], null, 5000);
      
      expect(result.sql).toContain('LIMIT 1000');
    });
  });

  describe('analyzeFilterTypes', () => {
    test('should analyze traditional filters only', () => {
      const filters = [
        { type: 'PTS' },
        { type: 'REB' },
        { type: 'AST' }
      ];
      
      const result = analyzeFilterTypes(filters);
      
      expect(result).toEqual({
        hasTraditional: true,
        hasAdvanced: false,
        hasIdentity: false,
        isMixed: false,
        filterTypes: ['PTS', 'REB', 'AST']
      });
    });

    test('should analyze advanced filters only', () => {
      const filters = [
        { type: 'Offensive Rating' },
        { type: 'Usage %' }
      ];
      
      const result = analyzeFilterTypes(filters);
      
      expect(result).toEqual({
        hasTraditional: false,
        hasAdvanced: true,
        hasIdentity: false,
        isMixed: false,
        filterTypes: ['Offensive Rating', 'Usage %']
      });
    });

    test('should analyze mixed filter types', () => {
      const filters = [
        { type: 'PTS' },
        { type: 'Offensive Rating' },
        { type: 'Team' }
      ];
      
      const result = analyzeFilterTypes(filters);
      
      expect(result).toEqual({
        hasTraditional: true,
        hasAdvanced: true,
        hasIdentity: true,
        isMixed: true,
        filterTypes: ['PTS', 'Offensive Rating', 'Team']
      });
    });

    test('should handle empty filters', () => {
      const result = analyzeFilterTypes([]);
      
      expect(result).toEqual({
        hasTraditional: false,
        hasAdvanced: false,
        hasIdentity: false,
        isMixed: false,
        filterTypes: []
      });
    });
  });

  describe('getRecommendedViewType', () => {
    test('should recommend custom for mixed filters', () => {
      const filters = [
        { type: 'PTS' },
        { type: 'Offensive Rating' }
      ];
      
      const result = getRecommendedViewType(filters);
      
      expect(result).toBe('custom');
    });

    test('should recommend advanced for advanced-only filters', () => {
      const filters = [
        { type: 'Offensive Rating' },
        { type: 'Usage %' }
      ];
      
      const result = getRecommendedViewType(filters);
      
      expect(result).toBe('advanced');
    });

    test('should recommend traditional for traditional-only filters', () => {
      const filters = [
        { type: 'PTS' },
        { type: 'REB' }
      ];
      
      const result = getRecommendedViewType(filters);
      
      expect(result).toBe('traditional');
    });
  });

  describe('getActiveColumns', () => {
    test('should return base columns for Players with no filters', () => {
      const result = getActiveColumns([], 'Players');
      
      expect(result).toEqual(['Name', 'TEAM', 'AGE', 'Games Played']);
    });

    test('should return base columns for Teams with no filters', () => {
      const result = getActiveColumns([], 'Teams');
      
      expect(result).toEqual(['Team', 'Games Played']);
    });

    test('should include filter columns for Players', () => {
      const filters = [
        { type: 'PTS' },
        { type: 'REB' },
        { type: 'Offensive Rating' }
      ];
      
      const result = getActiveColumns(filters, 'Players');
      
      expect(result).toEqual(['Name', 'TEAM', 'AGE', 'Games Played', 'PTS', 'REB', 'Offensive Rating']);
    });

    test('should remove duplicate columns', () => {
      const filters = [
        { type: 'Team' },
        { type: 'PTS' },
        { type: 'PTS' },
        { type: 'REB' }
      ];
      
      const result = getActiveColumns(filters, 'Players');
      
      expect(result).toEqual(['Name', 'TEAM', 'AGE', 'Games Played', 'PTS', 'REB']);
    });
  });

  describe('error handling and edge cases', () => {
    test('should handle database connection issues', async () => {
      const error = new Error('Database not connected');
      mockQuery.mockRejectedValue(error);
      
      await expect(executeQuery('SELECT 1', [])).rejects.toThrow('Database not connected');
    });

    test('should handle very large limits', () => {
      const result = buildUnifiedQuery('Players', [], null, 999999);
      
      expect(result.sql).toContain('LIMIT 1000');
    });

    test('should handle negative limits', () => {
      const result = buildUnifiedQuery('Players', [], null, -5);
      
      expect(result.sql).not.toContain('LIMIT');
    });

    test('should handle unknown filter types in analysis', () => {
      const filters = [
        { type: 'PTS' },
        { type: 'UNKNOWN_TYPE' }
      ];
      
      const result = analyzeFilterTypes(filters);
      
      expect(result.hasTraditional).toBe(true);
      expect(result.hasAdvanced).toBe(false);
      expect(result.filterTypes).toEqual(['PTS', 'UNKNOWN_TYPE']);
    });
  });
});