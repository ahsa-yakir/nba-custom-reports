/**
 * Unit tests for metadata.js utility
 * Tests column metadata definitions, mappings, and helper functions
 */

const {
  PLAYER_COLUMNS,
  TEAM_COLUMNS,
  getColumnName,
  getPlayerColumnMapping,
  getTeamColumnMapping,
  getSortColumnMapping,
  isTraditionalColumn,
  isAdvancedColumn,
  getColumnsByCategory
} = require('../../src/utils/metadata');

describe('metadata', () => {
  describe('PLAYER_COLUMNS', () => {
    test('should contain all required player identity columns', () => {
      const identityColumns = ['Name', 'Team', 'TEAM', 'Age', 'AGE', 'Games Played'];
      
      identityColumns.forEach(column => {
        expect(PLAYER_COLUMNS).toHaveProperty(column);
        expect(PLAYER_COLUMNS[column]).toHaveProperty('category', 'identity');
      });
    });

    test('should contain all required player traditional columns', () => {
      const traditionalColumns = [
        'MINS', 'PTS', 'FGM', 'FGA', 'FG%', '3PM', '3PA', '3P%',
        'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB', 'AST', 'TOV',
        'STL', 'BLK', 'PF', '+/-'
      ];
      
      traditionalColumns.forEach(column => {
        expect(PLAYER_COLUMNS).toHaveProperty(column);
        expect(PLAYER_COLUMNS[column]).toHaveProperty('category', 'traditional');
      });
    });

    test('should contain all required player advanced columns', () => {
      const advancedColumns = [
        'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %',
        'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio',
        'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %',
        'Turnover %', 'PIE', 'Pace'
      ];
      
      advancedColumns.forEach(column => {
        expect(PLAYER_COLUMNS).toHaveProperty(column);
        expect(PLAYER_COLUMNS[column]).toHaveProperty('category', 'advanced');
      });
    });

    test('should have proper structure for each column', () => {
      Object.entries(PLAYER_COLUMNS).forEach(([columnName, columnDef]) => {
        expect(columnDef).toHaveProperty('sort');
        expect(columnDef).toHaveProperty('select');
        expect(columnDef).toHaveProperty('type');
        expect(columnDef).toHaveProperty('category');
        
        // where can be null for non-filterable columns
        expect(columnDef).toHaveProperty('where');
        
        // Validate types
        expect(['string', 'numeric', 'percentage']).toContain(columnDef.type);
        expect(['identity', 'traditional', 'advanced']).toContain(columnDef.category);
      });
    });

    test('should have consistent Team and TEAM aliases', () => {
      expect(PLAYER_COLUMNS['Team']).toBeDefined();
      expect(PLAYER_COLUMNS['TEAM']).toBeDefined();
      expect(PLAYER_COLUMNS['Team'].where).toBe(PLAYER_COLUMNS['TEAM'].where);
      expect(PLAYER_COLUMNS['Team'].sort).toBe(PLAYER_COLUMNS['TEAM'].sort);
    });

    test('should have consistent Age and AGE aliases', () => {
      expect(PLAYER_COLUMNS['Age']).toBeDefined();
      expect(PLAYER_COLUMNS['AGE']).toBeDefined();
      expect(PLAYER_COLUMNS['Age'].where).toBe(PLAYER_COLUMNS['AGE'].where);
      expect(PLAYER_COLUMNS['Age'].sort).toBe(PLAYER_COLUMNS['AGE'].sort);
    });

    test('should have null where clause for non-filterable columns', () => {
      expect(PLAYER_COLUMNS['Name'].where).toBeNull();
      expect(PLAYER_COLUMNS['Games Played'].where).toBeNull();
    });

    test('should use proper table aliases in SQL', () => {
      // Check that player columns use 'p.', 't.', 'pgs.', 'pas.' prefixes appropriately
      expect(PLAYER_COLUMNS['Name'].select).toContain('p.name');
      expect(PLAYER_COLUMNS['Team'].where).toContain('t.team_code');
      expect(PLAYER_COLUMNS['PTS'].select).toContain('pgs.points');
      expect(PLAYER_COLUMNS['Offensive Rating'].select).toContain('pas.offensive_rating');
    });
  });

  describe('TEAM_COLUMNS', () => {
    test('should contain all required team identity columns', () => {
      const identityColumns = ['Team', 'Games Played'];
      
      identityColumns.forEach(column => {
        expect(TEAM_COLUMNS).toHaveProperty(column);
        expect(TEAM_COLUMNS[column]).toHaveProperty('category', 'identity');
      });
    });

    test('should contain all required team traditional columns', () => {
      const traditionalColumns = [
        'Points', 'Wins', 'Losses', 'Win %', 'FGM', 'FGA', 'FG%',
        '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB',
        'REB', 'AST', 'TOV', 'STL', 'BLK', '+/-'
      ];
      
      traditionalColumns.forEach(column => {
        expect(TEAM_COLUMNS).toHaveProperty(column);
        expect(TEAM_COLUMNS[column]).toHaveProperty('category', 'traditional');
      });
    });

    test('should contain all required team advanced columns', () => {
      const advancedColumns = [
        'Offensive Rating', 'Defensive Rating', 'Net Rating',
        'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio',
        'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %',
        'Turnover %', 'PIE', 'Pace'
      ];
      
      advancedColumns.forEach(column => {
        expect(TEAM_COLUMNS).toHaveProperty(column);
        expect(TEAM_COLUMNS[column]).toHaveProperty('category', 'advanced');
      });
    });

    test('should have proper structure for each column', () => {
      Object.entries(TEAM_COLUMNS).forEach(([columnName, columnDef]) => {
        expect(columnDef).toHaveProperty('sort');
        expect(columnDef).toHaveProperty('select');
        expect(columnDef).toHaveProperty('type');
        expect(columnDef).toHaveProperty('category');
        expect(columnDef).toHaveProperty('where');
        
        // Validate types
        expect(['string', 'numeric', 'percentage']).toContain(columnDef.type);
        expect(['identity', 'traditional', 'advanced']).toContain(columnDef.category);
      });
    });

    test('should have null where clause for computed columns', () => {
      expect(TEAM_COLUMNS['Games Played'].where).toBeNull();
      expect(TEAM_COLUMNS['Win %'].where).toBeNull();
    });

    test('should use proper table aliases in SQL', () => {
      // Check that team columns use 't.', 'tgs.', 'tas.' prefixes appropriately
      expect(TEAM_COLUMNS['Team'].select).toContain('t.team_code');
      expect(TEAM_COLUMNS['Points'].select).toContain('tgs.points');
      expect(TEAM_COLUMNS['Offensive Rating'].select).toContain('tas.offensive_rating');
    });
  });

  describe('getColumnName', () => {
    test('should return correct column name for player traditional filters', () => {
      expect(getColumnName('PTS', 'Players', false)).toBe('pgs.points');
      expect(getColumnName('REB', 'Players', false)).toBe('pgs.total_rebounds');
      expect(getColumnName('AST', 'Players', false)).toBe('pgs.assists');
      expect(getColumnName('Team', 'Players', false)).toBe('t.team_code');
    });

    test('should return correct column name for player advanced filters', () => {
      expect(getColumnName('Offensive Rating', 'Players', true)).toBe('pas.offensive_rating');
      expect(getColumnName('Usage %', 'Players', true)).toBe('pas.usage_percentage');
      expect(getColumnName('True Shooting %', 'Players', true)).toBe('pas.true_shooting_percentage');
    });

    test('should return correct column name for team traditional filters', () => {
      expect(getColumnName('Points', 'Teams', false)).toBe('tgs.points');
      expect(getColumnName('Wins', 'Teams', false)).toBe('CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END');
      expect(getColumnName('FG%', 'Teams', false)).toBe('tgs.field_goal_percentage');
    });

    test('should return correct column name for team advanced filters', () => {
      expect(getColumnName('Offensive Rating', 'Teams', true)).toBe('tas.offensive_rating');
      expect(getColumnName('Net Rating', 'Teams', true)).toBe('tas.net_rating');
      expect(getColumnName('Pace', 'Teams', true)).toBe('tas.pace');
    });

    test('should return null for unknown filter types', () => {
      expect(getColumnName('UNKNOWN_FILTER', 'Players', false)).toBeNull();
      expect(getColumnName('INVALID_STAT', 'Teams', true)).toBeNull();
    });

    test('should return null for non-filterable columns', () => {
      expect(getColumnName('Name', 'Players', false)).toBeNull();
      expect(getColumnName('Games Played', 'Players', false)).toBeNull();
      expect(getColumnName('Games Played', 'Teams', false)).toBeNull();
    });

    test('should handle unified queries', () => {
      expect(getColumnName('PTS', 'Players', false, true)).toBe('pgs.points');
      expect(getColumnName('Offensive Rating', 'Players', true, true)).toBe('pas.offensive_rating');
    });
  });

  describe('getPlayerColumnMapping', () => {
    test('should return traditional columns by default', () => {
      const mapping = getPlayerColumnMapping();
      
      expect(mapping).toHaveProperty('PTS', 'pgs.points');
      expect(mapping).toHaveProperty('REB', 'pgs.total_rebounds');
      expect(mapping).toHaveProperty('Team', 't.team_code');
      expect(mapping).not.toHaveProperty('Offensive Rating');
    });

    test('should return traditional and advanced columns when isAdvanced=true', () => {
      const mapping = getPlayerColumnMapping(true);
      
      expect(mapping).toHaveProperty('PTS', 'pgs.points');
      expect(mapping).toHaveProperty('REB', 'pgs.total_rebounds');
      expect(mapping).toHaveProperty('Offensive Rating', 'pas.offensive_rating');
      expect(mapping).toHaveProperty('Usage %', 'pas.usage_percentage');
    });

    test('should return all columns when isUnified=true', () => {
      const mapping = getPlayerColumnMapping(false, true);
      
      expect(mapping).toHaveProperty('PTS', 'pgs.points');
      expect(mapping).toHaveProperty('REB', 'pgs.total_rebounds');
      expect(mapping).toHaveProperty('Offensive Rating', 'pas.offensive_rating');
      expect(mapping).toHaveProperty('Usage %', 'pas.usage_percentage');
    });

    test('should include identity columns in all modes', () => {
      const traditional = getPlayerColumnMapping(false);
      const advanced = getPlayerColumnMapping(true);
      const unified = getPlayerColumnMapping(false, true);
      
      [traditional, advanced, unified].forEach(mapping => {
        expect(mapping).toHaveProperty('Team', 't.team_code');
        expect(mapping).toHaveProperty('Age', 'p.age');
      });
    });

    test('should only return filterable columns', () => {
      const mapping = getPlayerColumnMapping();
      
      expect(mapping).not.toHaveProperty('Name');
      expect(mapping).not.toHaveProperty('Games Played');
    });

    test('should handle both Team and TEAM aliases', () => {
      const mapping = getPlayerColumnMapping();
      
      expect(mapping).toHaveProperty('Team', 't.team_code');
      expect(mapping).toHaveProperty('TEAM', 't.team_code');
    });
  });

  describe('getTeamColumnMapping', () => {
    test('should return traditional columns by default', () => {
      const mapping = getTeamColumnMapping();
      
      expect(mapping).toHaveProperty('Points', 'tgs.points');
      expect(mapping).toHaveProperty('Wins', 'CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END');
      expect(mapping).toHaveProperty('FG%', 'tgs.field_goal_percentage');
      expect(mapping).not.toHaveProperty('Offensive Rating');
    });

    test('should return traditional and advanced columns when isAdvanced=true', () => {
      const mapping = getTeamColumnMapping(true);
      
      expect(mapping).toHaveProperty('Points', 'tgs.points');
      expect(mapping).toHaveProperty('Wins', 'CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END');
      expect(mapping).toHaveProperty('Offensive Rating', 'tas.offensive_rating');
      expect(mapping).toHaveProperty('Net Rating', 'tas.net_rating');
    });

    test('should return all columns when isUnified=true', () => {
      const mapping = getTeamColumnMapping(false, true);
      
      expect(mapping).toHaveProperty('Points', 'tgs.points');
      expect(mapping).toHaveProperty('Wins', 'CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END');
      expect(mapping).toHaveProperty('Offensive Rating', 'tas.offensive_rating');
      expect(mapping).toHaveProperty('Net Rating', 'tas.net_rating');
    });

    test('should include identity columns in all modes', () => {
      const traditional = getTeamColumnMapping(false);
      const advanced = getTeamColumnMapping(true);
      const unified = getTeamColumnMapping(false, true);
      
      [traditional, advanced, unified].forEach(mapping => {
        expect(mapping).toHaveProperty('Team', 't.team_code');
      });
    });

    test('should only return filterable columns', () => {
      const mapping = getTeamColumnMapping();
      
      expect(mapping).not.toHaveProperty('Games Played');
      expect(mapping).not.toHaveProperty('Win %');
    });
  });

  describe('getSortColumnMapping', () => {
    test('should return player sort columns for traditional view', () => {
      const mapping = getSortColumnMapping('Players', false);
      
      expect(mapping).toHaveProperty('Name', 'p.name');
      expect(mapping).toHaveProperty('PTS', 'pts');
      expect(mapping).toHaveProperty('REB', 'reb');
      expect(mapping).toHaveProperty('Team', 't.team_code');
      expect(mapping).not.toHaveProperty('Offensive Rating');
    });

    test('should return player sort columns for advanced view', () => {
      const mapping = getSortColumnMapping('Players', true);
      
      expect(mapping).toHaveProperty('Name', 'p.name');
      expect(mapping).toHaveProperty('PTS', 'pts');
      expect(mapping).toHaveProperty('Offensive Rating', 'offensive_rating');
      expect(mapping).toHaveProperty('Usage %', 'usage_percentage');
    });

    test('should return player sort columns for unified view', () => {
      const mapping = getSortColumnMapping('Players', false, true);
      
      expect(mapping).toHaveProperty('Name', 'p.name');
      expect(mapping).toHaveProperty('PTS', 'pts');
      expect(mapping).toHaveProperty('Offensive Rating', 'offensive_rating');
      expect(mapping).toHaveProperty('Usage %', 'usage_percentage');
    });

    test('should return team sort columns for traditional view', () => {
      const mapping = getSortColumnMapping('Teams', false);
      
      expect(mapping).toHaveProperty('Team', 't.team_code');
      expect(mapping).toHaveProperty('Points', 'pts');
      expect(mapping).toHaveProperty('Wins', 'wins');
      expect(mapping).not.toHaveProperty('Offensive Rating');
    });

    test('should return team sort columns for advanced view', () => {
      const mapping = getSortColumnMapping('Teams', true);
      
      expect(mapping).toHaveProperty('Team', 't.team_code');
      expect(mapping).toHaveProperty('Points', 'pts');
      expect(mapping).toHaveProperty('Offensive Rating', 'offensive_rating');
      expect(mapping).toHaveProperty('Net Rating', 'net_rating');
    });

    test('should include all columns in unified view', () => {
      const playerMapping = getSortColumnMapping('Players', false, true);
      const teamMapping = getSortColumnMapping('Teams', false, true);
      
      // Should include both traditional and advanced columns
      expect(playerMapping).toHaveProperty('PTS', 'pts');
      expect(playerMapping).toHaveProperty('Offensive Rating', 'offensive_rating');
      
      expect(teamMapping).toHaveProperty('Wins', 'wins');
      expect(teamMapping).toHaveProperty('Net Rating', 'net_rating');
    });

    test('should include identity columns for sorting', () => {
      const playerMapping = getSortColumnMapping('Players');
      const teamMapping = getSortColumnMapping('Teams');
      
      expect(playerMapping).toHaveProperty('Name', 'p.name');
      expect(playerMapping).toHaveProperty('Age', 'p.age');
      expect(playerMapping).toHaveProperty('Games Played', 'games_played');
      
      expect(teamMapping).toHaveProperty('Team', 't.team_code');
      expect(teamMapping).toHaveProperty('Games Played', 'games_played');
    });
  });

  describe('isTraditionalColumn', () => {
    test('should return true for traditional player columns', () => {
      const traditionalColumns = ['PTS', 'REB', 'AST', 'FG%', 'Team', 'Age'];
      
      traditionalColumns.forEach(column => {
        expect(isTraditionalColumn(column)).toBe(true);
      });
    });

    test('should return true for traditional team columns', () => {
      const traditionalColumns = ['Points', 'Wins', 'FGM', 'Team'];
      
      traditionalColumns.forEach(column => {
        expect(isTraditionalColumn(column)).toBe(true);
      });
    });

    test('should return false for advanced columns', () => {
      const advancedColumns = ['Offensive Rating', 'Usage %', 'Net Rating', 'PIE'];
      
      advancedColumns.forEach(column => {
        expect(isTraditionalColumn(column)).toBe(false);
      });
    });

    test('should return false for unknown columns', () => {
      expect(isTraditionalColumn('UNKNOWN_COLUMN')).toBe(false);
      expect(isTraditionalColumn('')).toBe(false);
      expect(isTraditionalColumn(null)).toBe(false);
    });

    test('should return true for identity columns', () => {
      expect(isTraditionalColumn('Name')).toBe(true);
      expect(isTraditionalColumn('Team')).toBe(true);
      expect(isTraditionalColumn('Age')).toBe(true);
      expect(isTraditionalColumn('Games Played')).toBe(true);
    });
  });

  describe('isAdvancedColumn', () => {
    test('should return true for advanced player columns', () => {
      const advancedColumns = [
        'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %',
        'True Shooting %', 'PIE', 'Pace'
      ];
      
      advancedColumns.forEach(column => {
        expect(isAdvancedColumn(column)).toBe(true);
      });
    });

    test('should return true for advanced team columns', () => {
      const advancedColumns = [
        'Offensive Rating', 'Defensive Rating', 'Net Rating',
        'True Shooting %', 'PIE', 'Pace'
      ];
      
      advancedColumns.forEach(column => {
        expect(isAdvancedColumn(column)).toBe(true);
      });
    });

    test('should return false for traditional columns', () => {
      const traditionalColumns = ['PTS', 'REB', 'AST', 'Points', 'Wins'];
      
      traditionalColumns.forEach(column => {
        expect(isAdvancedColumn(column)).toBe(false);
      });
    });

    test('should return false for identity columns', () => {
      const identityColumns = ['Name', 'Team', 'Age', 'Games Played'];
      
      identityColumns.forEach(column => {
        expect(isAdvancedColumn(column)).toBe(false);
      });
    });

    test('should return false for unknown columns', () => {
      expect(isAdvancedColumn('UNKNOWN_COLUMN')).toBe(false);
      expect(isAdvancedColumn('')).toBe(false);
      expect(isAdvancedColumn(null)).toBe(false);
    });
  });

  describe('getColumnsByCategory', () => {
    test('should return player identity columns', () => {
      const identityColumns = getColumnsByCategory('Players', ['identity']);
      
      expect(identityColumns).toContain('Name');
      expect(identityColumns).toContain('Team');
      expect(identityColumns).toContain('TEAM');
      expect(identityColumns).toContain('Age');
      expect(identityColumns).toContain('AGE');
      expect(identityColumns).toContain('Games Played');
      expect(identityColumns).not.toContain('PTS');
      expect(identityColumns).not.toContain('Offensive Rating');
    });

    test('should return player traditional columns', () => {
      const traditionalColumns = getColumnsByCategory('Players', ['traditional']);
      
      expect(traditionalColumns).toContain('PTS');
      expect(traditionalColumns).toContain('REB');
      expect(traditionalColumns).toContain('AST');
      expect(traditionalColumns).toContain('FG%');
      expect(traditionalColumns).not.toContain('Name');
      expect(traditionalColumns).not.toContain('Offensive Rating');
    });

    test('should return player advanced columns', () => {
      const advancedColumns = getColumnsByCategory('Players', ['advanced']);
      
      expect(advancedColumns).toContain('Offensive Rating');
      expect(advancedColumns).toContain('Usage %');
      expect(advancedColumns).toContain('True Shooting %');
      expect(advancedColumns).not.toContain('PTS');
      expect(advancedColumns).not.toContain('Name');
    });

    test('should return team identity columns', () => {
      const identityColumns = getColumnsByCategory('Teams', ['identity']);
      
      expect(identityColumns).toContain('Team');
      expect(identityColumns).toContain('Games Played');
      expect(identityColumns).not.toContain('Points');
      expect(identityColumns).not.toContain('Offensive Rating');
    });

    test('should return team traditional columns', () => {
      const traditionalColumns = getColumnsByCategory('Teams', ['traditional']);
      
      expect(traditionalColumns).toContain('Points');
      expect(traditionalColumns).toContain('Wins');
      expect(traditionalColumns).toContain('FG%');
      expect(traditionalColumns).not.toContain('Team');
      expect(traditionalColumns).not.toContain('Offensive Rating');
    });

    test('should return team advanced columns', () => {
      const advancedColumns = getColumnsByCategory('Teams', ['advanced']);
      
      expect(advancedColumns).toContain('Offensive Rating');
      expect(advancedColumns).toContain('Net Rating');
      expect(advancedColumns).toContain('Pace');
      expect(advancedColumns).not.toContain('Points');
      expect(advancedColumns).not.toContain('Team');
    });

    test('should return multiple categories', () => {
      const columns = getColumnsByCategory('Players', ['identity', 'traditional']);
      
      expect(columns).toContain('Name');
      expect(columns).toContain('Team');
      expect(columns).toContain('PTS');
      expect(columns).toContain('REB');
      expect(columns).not.toContain('Offensive Rating');
    });

    test('should return all categories', () => {
      const columns = getColumnsByCategory('Players', ['identity', 'traditional', 'advanced']);
      
      expect(columns).toContain('Name');
      expect(columns).toContain('PTS');
      expect(columns).toContain('Offensive Rating');
      expect(columns.length).toBeGreaterThan(30); // Should have many columns
    });

    test('should return empty array for unknown categories', () => {
      const columns = getColumnsByCategory('Players', ['unknown']);
      
      expect(columns).toEqual([]);
    });

    test('should return empty array for unknown measure', () => {
      const columns = getColumnsByCategory('Unknown', ['traditional']);
      
      expect(columns).toEqual([]);
    });

    test('should handle empty categories array', () => {
      const columns = getColumnsByCategory('Players', []);
      
      expect(columns).toEqual([]);
    });
  });

  describe('edge cases and data integrity', () => {
    test('should have consistent column structure', () => {
      const allColumns = { ...PLAYER_COLUMNS, ...TEAM_COLUMNS };
      
      Object.entries(allColumns).forEach(([columnName, columnDef]) => {
        // Each column should have all required properties
        expect(columnDef).toHaveProperty('sort');
        expect(columnDef).toHaveProperty('select');
        expect(columnDef).toHaveProperty('type');
        expect(columnDef).toHaveProperty('category');
        expect(columnDef).toHaveProperty('where'); // Can be null
        
        // Validate property types
        expect(typeof columnDef.sort).toBe('string');
        expect(typeof columnDef.select).toBe('string');
        expect(typeof columnDef.type).toBe('string');
        expect(typeof columnDef.category).toBe('string');
        // where can be string or null
      });
    });

    test('should have percentage columns marked correctly', () => {
      const percentageColumns = [
        'FG%', '3P%', 'FT%', 'Usage %', 'True Shooting %', 'Effective FG%',
        'Assist %', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %',
        'Turnover %', 'Win %'
      ];
      
      percentageColumns.forEach(column => {
        if (PLAYER_COLUMNS[column]) {
          expect(PLAYER_COLUMNS[column].type).toBe('percentage');
        }
        if (TEAM_COLUMNS[column]) {
          expect(TEAM_COLUMNS[column].type).toBe('percentage');
        }
      });
    });

    test('should have numeric columns marked correctly', () => {
      const numericColumns = [
        'PTS', 'REB', 'AST', 'Age', 'Points', 'Wins',
        'Offensive Rating', 'Net Rating', 'PIE'
      ];
      
      numericColumns.forEach(column => {
        if (PLAYER_COLUMNS[column]) {
          expect(PLAYER_COLUMNS[column].type).toBe('numeric');
        }
        if (TEAM_COLUMNS[column]) {
          expect(TEAM_COLUMNS[column].type).toBe('numeric');
        }
      });
    });

    test('should have string columns marked correctly', () => {
      const stringColumns = ['Name', 'Team', 'TEAM'];
      
      stringColumns.forEach(column => {
        if (PLAYER_COLUMNS[column]) {
          expect(PLAYER_COLUMNS[column].type).toBe('string');
        }
        if (TEAM_COLUMNS[column]) {
          expect(TEAM_COLUMNS[column].type).toBe('string');
        }
      });
    });

    test('should have unique sort column names within each measure', () => {
      // Check for duplicate sort columns in players
      const playerSortValues = Object.values(PLAYER_COLUMNS).map(col => col.sort);
      const uniquePlayerSorts = new Set(playerSortValues);
      
      // If there are duplicates, log them for debugging
      if (playerSortValues.length !== uniquePlayerSorts.size) {
        const duplicates = playerSortValues.filter((item, index) => playerSortValues.indexOf(item) !== index);
        console.log('Player column duplicate sorts found:', [...new Set(duplicates)]);
      }
      
      // Allow for some intentional duplicates (like Team/TEAM, Age/AGE aliases)
      expect(uniquePlayerSorts.size).toBeGreaterThan(35); // Should have most columns unique
      
      // Check for duplicate sort columns in teams
      const teamSortValues = Object.values(TEAM_COLUMNS).map(col => col.sort);
      const uniqueTeamSorts = new Set(teamSortValues);
      
      if (teamSortValues.length !== uniqueTeamSorts.size) {
        const duplicates = teamSortValues.filter((item, index) => teamSortValues.indexOf(item) !== index);
        console.log('Team column duplicate sorts found:', [...new Set(duplicates)]);
      }
      
      expect(uniqueTeamSorts.size).toBeGreaterThan(20); // Should have most columns unique
    });

   test('should have valid SQL in select clauses', () => {
  const allColumns = { ...PLAYER_COLUMNS, ...TEAM_COLUMNS };
  
  Object.entries(allColumns).forEach(([columnName, columnDef]) => {
    // Basic SQL validation - should contain valid SQL keywords
    const selectClause = columnDef.select.toLowerCase();
    
    // Should not contain obvious SQL injection patterns
    expect(selectClause).not.toContain(';');
    expect(selectClause).not.toContain('drop');
    expect(selectClause).not.toContain('delete');
    expect(selectClause).not.toContain('insert');
    expect(selectClause).not.toContain('update');
    
    // Should contain expected SQL patterns for aggregation
    if (columnDef.category !== 'identity') {
      const hasAggregation = selectClause.includes('avg(') || 
                           selectClause.includes('count(') || 
                           selectClause.includes('sum(') || 
                           selectClause.includes('round(') ||
                           selectClause.includes('case when'); // For computed columns
      expect(hasAggregation).toBe(true);
    }
  });
}); // <- Added this missing closing brace

test('should handle case sensitivity correctly', () => {
  // Test that exact case matching works
  expect(getColumnName('PTS', 'Players', false)).toBe('pgs.points');
  expect(getColumnName('pts', 'Players', false)).toBeNull(); // lowercase should not match
  
  expect(getColumnName('Team', 'Players', false)).toBe('t.team_code');
  expect(getColumnName('TEAM', 'Players', false)).toBe('t.team_code');
  expect(getColumnName('team', 'Players', false)).toBeNull(); // lowercase should not match
});

test('should maintain consistency between mappings and direct access', () => {
  // Test that getPlayerColumnMapping returns same values as direct PLAYER_COLUMNS access
  const mapping = getPlayerColumnMapping(true, true); // Get all columns
  
  Object.entries(mapping).forEach(([filterType, expectedColumn]) => {
    const directAccess = PLAYER_COLUMNS[filterType]?.where;
    expect(directAccess).toBe(expectedColumn);
  });
});

test('should maintain consistency between team mappings and direct access', () => {
  // Test that getTeamColumnMapping returns same values as direct TEAM_COLUMNS access
  const mapping = getTeamColumnMapping(true, true); // Get all columns
  
  Object.entries(mapping).forEach(([filterType, expectedColumn]) => {
    const directAccess = TEAM_COLUMNS[filterType]?.where;
    expect(directAccess).toBe(expectedColumn);
  });
});

  describe('backwards compatibility', () => {
    test('should maintain API compatibility for getColumnName', () => {
      // Test that the function signature works as expected
      expect(() => getColumnName('PTS', 'Players')).not.toThrow();
      expect(() => getColumnName('PTS', 'Players', false)).not.toThrow();
      expect(() => getColumnName('PTS', 'Players', false, false)).not.toThrow();
      expect(() => getColumnName('PTS', 'Players', true, true)).not.toThrow();
    });

    test('should maintain API compatibility for mapping functions', () => {
      // Test that all mapping functions work with various parameter combinations
      expect(() => getPlayerColumnMapping()).not.toThrow();
      expect(() => getPlayerColumnMapping(false)).not.toThrow();
      expect(() => getPlayerColumnMapping(true)).not.toThrow();
      expect(() => getPlayerColumnMapping(false, true)).not.toThrow();
      expect(() => getPlayerColumnMapping(true, true)).not.toThrow();
      
      expect(() => getTeamColumnMapping()).not.toThrow();
      expect(() => getTeamColumnMapping(false)).not.toThrow();
      expect(() => getTeamColumnMapping(true)).not.toThrow();
      expect(() => getTeamColumnMapping(false, true)).not.toThrow();
      expect(() => getTeamColumnMapping(true, true)).not.toThrow();
      
      expect(() => getSortColumnMapping('Players')).not.toThrow();
      expect(() => getSortColumnMapping('Players', false)).not.toThrow();
      expect(() => getSortColumnMapping('Players', true)).not.toThrow();
      expect(() => getSortColumnMapping('Players', false, false)).not.toThrow();
      expect(() => getSortColumnMapping('Players', true, true)).not.toThrow();
    });

    test('should return objects with expected structure', () => {
      const playerMapping = getPlayerColumnMapping();
      const teamMapping = getTeamColumnMapping();
      const sortMapping = getSortColumnMapping('Players');
      
      // All should return plain objects
      expect(typeof playerMapping).toBe('object');
      expect(typeof teamMapping).toBe('object');
      expect(typeof sortMapping).toBe('object');
      
      // All should not be arrays
      expect(Array.isArray(playerMapping)).toBe(false);
      expect(Array.isArray(teamMapping)).toBe(false);
      expect(Array.isArray(sortMapping)).toBe(false);
      
      // All should have string values
      Object.values(playerMapping).forEach(value => {
        expect(typeof value).toBe('string');
      });
      Object.values(teamMapping).forEach(value => {
        expect(typeof value).toBe('string');
      });
      Object.values(sortMapping).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('performance and memory', () => {
    test('should have reasonable number of columns defined', () => {
      // Ensure we don't have too many columns (performance concern)
      expect(Object.keys(PLAYER_COLUMNS).length).toBeLessThan(100);
      expect(Object.keys(TEAM_COLUMNS).length).toBeLessThan(100);
      
      // Ensure we have minimum expected columns
      expect(Object.keys(PLAYER_COLUMNS).length).toBeGreaterThan(30);
      expect(Object.keys(TEAM_COLUMNS).length).toBeGreaterThan(20);
    });

    test('should not have excessive string lengths in SQL', () => {
      const allColumns = { ...PLAYER_COLUMNS, ...TEAM_COLUMNS };
      
      Object.entries(allColumns).forEach(([columnName, columnDef]) => {
        // Select clauses shouldn't be too long (performance concern)
        expect(columnDef.select.length).toBeLessThan(200);
        
        // Sort columns should be reasonable length
        expect(columnDef.sort.length).toBeLessThan(50);
        
        // Where clauses (if present) should be reasonable
        if (columnDef.where) {
          expect(columnDef.where.length).toBeLessThan(100);
        }
      });
    });

    test('should reuse common table aliases efficiently', () => {
      // Check that we're using consistent table aliases
      const playerWheres = Object.values(PLAYER_COLUMNS)
        .map(col => col.where)
        .filter(where => where !== null);
      
      const teamWheres = Object.values(TEAM_COLUMNS)
        .map(col => col.where)
        .filter(where => where !== null);
      
      // Player columns should primarily use p., t., pgs., pas. prefixes
      playerWheres.forEach(where => {
        const hasExpectedPrefix = where.startsWith('p.') || 
                                where.startsWith('t.') || 
                                where.startsWith('pgs.') || 
                                where.startsWith('pas.') ||
                                where.startsWith('COUNT(') ||
                                where.startsWith('CASE WHEN');
        expect(hasExpectedPrefix).toBe(true);
      });
      
      // Team columns should primarily use t., tgs., tas. prefixes
      teamWheres.forEach(where => {
        const hasExpectedPrefix = where.startsWith('t.') || 
                                where.startsWith('tgs.') || 
                                where.startsWith('tas.') ||
                                where.startsWith('COUNT(') ||
                                where.startsWith('CASE WHEN');
        expect(hasExpectedPrefix).toBe(true);
      });
    });
  });

  describe('integration with filter system', () => {
    test('should support all common NBA statistical categories', () => {
      // Basic scoring stats
      expect(PLAYER_COLUMNS).toHaveProperty('PTS');
      expect(PLAYER_COLUMNS).toHaveProperty('FGM');
      expect(PLAYER_COLUMNS).toHaveProperty('FGA');
      expect(PLAYER_COLUMNS).toHaveProperty('FG%');
      
      // Three-point stats
      expect(PLAYER_COLUMNS).toHaveProperty('3PM');
      expect(PLAYER_COLUMNS).toHaveProperty('3PA');
      expect(PLAYER_COLUMNS).toHaveProperty('3P%');
      
      // Free throw stats
      expect(PLAYER_COLUMNS).toHaveProperty('FTM');
      expect(PLAYER_COLUMNS).toHaveProperty('FTA');
      expect(PLAYER_COLUMNS).toHaveProperty('FT%');
      
      // Rebounding stats
      expect(PLAYER_COLUMNS).toHaveProperty('OREB');
      expect(PLAYER_COLUMNS).toHaveProperty('DREB');
      expect(PLAYER_COLUMNS).toHaveProperty('REB');
      
      // Playmaking and defense
      expect(PLAYER_COLUMNS).toHaveProperty('AST');
      expect(PLAYER_COLUMNS).toHaveProperty('STL');
      expect(PLAYER_COLUMNS).toHaveProperty('BLK');
      expect(PLAYER_COLUMNS).toHaveProperty('TOV');
      
      // Advanced metrics
      expect(PLAYER_COLUMNS).toHaveProperty('Offensive Rating');
      expect(PLAYER_COLUMNS).toHaveProperty('Defensive Rating');
      expect(PLAYER_COLUMNS).toHaveProperty('Usage %');
      expect(PLAYER_COLUMNS).toHaveProperty('True Shooting %');
    });

    test('should support team-specific statistics', () => {
      // Team scoring
      expect(TEAM_COLUMNS).toHaveProperty('Points');
      expect(TEAM_COLUMNS).toHaveProperty('Wins');
      expect(TEAM_COLUMNS).toHaveProperty('Losses');
      expect(TEAM_COLUMNS).toHaveProperty('Win %');
      
      // Team shooting
      expect(TEAM_COLUMNS).toHaveProperty('FG%');
      expect(TEAM_COLUMNS).toHaveProperty('3P%');
      expect(TEAM_COLUMNS).toHaveProperty('FT%');
      
      // Team advanced metrics
      expect(TEAM_COLUMNS).toHaveProperty('Offensive Rating');
      expect(TEAM_COLUMNS).toHaveProperty('Defensive Rating');
      expect(TEAM_COLUMNS).toHaveProperty('Pace');
    });

    test('should provide proper column types for UI components', () => {
      // Test that percentage columns are marked correctly for UI
      const percentageColumns = Object.entries(PLAYER_COLUMNS)
        .concat(Object.entries(TEAM_COLUMNS))
        .filter(([name, def]) => def.type === 'percentage');
      
      percentageColumns.forEach(([name, def]) => {
        expect(name.includes('%') || name.includes('percentage')).toBe(true);
      });
      
      // Test that string columns are identity-related
      const stringColumns = Object.entries(PLAYER_COLUMNS)
        .concat(Object.entries(TEAM_COLUMNS))
        .filter(([name, def]) => def.type === 'string');
      
      stringColumns.forEach(([name, def]) => {
        expect(['Name', 'Team', 'TEAM'].includes(name)).toBe(true);
      });
    });
  });
});});