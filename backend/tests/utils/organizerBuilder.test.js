/**
 * Unit tests for organizerBuilder.js utility
 * Tests organizer validation, description generation, and subquery building
 */

const {
  buildOrganizerSubquery,
  validateOrganizer,
  getOrganizerDescription
} = require('../../src/utils/organizerBuilder');

describe('organizerBuilder', () => {
  describe('validateOrganizer', () => {
    test('should accept valid all_games organizer', () => {
      const organizer = { type: 'all_games' };
      expect(validateOrganizer(organizer)).toEqual([]);
    });

    test('should reject null/undefined organizer', () => {
      expect(validateOrganizer(null)).toEqual(['Organizer is required']);
      expect(validateOrganizer(undefined)).toEqual(['Organizer is required']);
    });

    test('should reject organizer without type', () => {
      expect(validateOrganizer({})).toEqual(['Organizer type is required']);
    });

    test('should reject invalid organizer type', () => {
      const organizer = { type: 'invalid_type' };
      const errors = validateOrganizer(organizer);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Invalid organizer type');
      expect(errors[0]).toContain('all_games, last_games, game_range, home_away, last_period, date_range');
    });

    describe('last_games validation', () => {
      test('should accept valid last_games organizer', () => {
        const organizer = { type: 'last_games', value: 10 };
        expect(validateOrganizer(organizer)).toEqual([]);
      });

      test('should reject last_games without value', () => {
        const organizer = { type: 'last_games' };
        expect(validateOrganizer(organizer)).toEqual([
          'Last games organizer requires a positive number value'
        ]);
      });

      test('should reject last_games with invalid value', () => {
        const organizer1 = { type: 'last_games', value: 0 };
        const organizer2 = { type: 'last_games', value: -5 };
        const organizer3 = { type: 'last_games', value: 'ten' };
        
        expect(validateOrganizer(organizer1)).toEqual([
          'Last games organizer requires a positive number value'
        ]);
        expect(validateOrganizer(organizer2)).toEqual([
          'Last games organizer requires a positive number value'
        ]);
        expect(validateOrganizer(organizer3)).toEqual([
          'Last games organizer requires a positive number value'
        ]);
      });

      test('should reject last_games with value exceeding 82', () => {
        const organizer = { type: 'last_games', value: 100 };
        expect(validateOrganizer(organizer)).toEqual([
          'Last games value cannot exceed 82 (max games in NBA season)'
        ]);
      });
    });

    describe('game_range validation', () => {
      test('should accept valid game_range organizer', () => {
        const organizer = { type: 'game_range', from: 10, to: 20 };
        expect(validateOrganizer(organizer)).toEqual([]);
      });

      test('should reject game_range with missing values', () => {
        const organizer1 = { type: 'game_range', to: 20 };
        const organizer2 = { type: 'game_range', from: 10 };
        
        expect(validateOrganizer(organizer1)).toContain(
          'Game range organizer requires a positive "from" value'
        );
        expect(validateOrganizer(organizer2)).toContain(
          'Game range organizer requires a positive "to" value'
        );
      });

      test('should reject game_range with invalid values', () => {
        const organizer1 = { type: 'game_range', from: 0, to: 20 };
        const organizer2 = { type: 'game_range', from: 10, to: 0 };
        const organizer3 = { type: 'game_range', from: 'ten', to: 20 };
        
        expect(validateOrganizer(organizer1)).toContain(
          'Game range organizer requires a positive "from" value'
        );
        expect(validateOrganizer(organizer2)).toContain(
          'Game range organizer requires a positive "to" value'
        );
        expect(validateOrganizer(organizer3)).toContain(
          'Game range organizer requires a positive "from" value'
        );
      });

      test('should reject game_range where from > to', () => {
        const organizer = { type: 'game_range', from: 30, to: 20 };
        expect(validateOrganizer(organizer)).toContain(
          'Game range "from" value must be less than or equal to "to" value'
        );
      });

      test('should reject game_range with values exceeding 82', () => {
        const organizer1 = { type: 'game_range', from: 90, to: 95 };
        const organizer2 = { type: 'game_range', from: 10, to: 90 };
        
        expect(validateOrganizer(organizer1)).toContain(
          'Game range values cannot exceed 82 (max games in NBA season)'
        );
        expect(validateOrganizer(organizer2)).toContain(
          'Game range values cannot exceed 82 (max games in NBA season)'
        );
      });
    });

    describe('home_away validation', () => {
      test('should accept valid home_away organizer', () => {
        const organizer1 = { type: 'home_away', gameType: 'home' };
        const organizer2 = { type: 'home_away', gameType: 'away' };
        
        expect(validateOrganizer(organizer1)).toEqual([]);
        expect(validateOrganizer(organizer2)).toEqual([]);
      });

      test('should reject home_away with missing gameType', () => {
        const organizer = { type: 'home_away' };
        expect(validateOrganizer(organizer)).toEqual([
          'Home/Away organizer requires gameType to be either "home" or "away"'
        ]);
      });

      test('should reject home_away with invalid gameType', () => {
        const organizer = { type: 'home_away', gameType: 'neutral' };
        expect(validateOrganizer(organizer)).toEqual([
          'Home/Away organizer requires gameType to be either "home" or "away"'
        ]);
      });
    });

    describe('last_period validation', () => {
      test('should accept valid last_period organizer', () => {
        const organizer1 = { type: 'last_period', period: 'days', value: 7 };
        const organizer2 = { type: 'last_period', period: 'weeks', value: 2 };
        const organizer3 = { type: 'last_period', period: 'months', value: 1 };
        
        expect(validateOrganizer(organizer1)).toEqual([]);
        expect(validateOrganizer(organizer2)).toEqual([]);
        expect(validateOrganizer(organizer3)).toEqual([]);
      });

      test('should reject last_period with missing fields', () => {
        const organizer1 = { type: 'last_period', value: 7 };
        const organizer2 = { type: 'last_period', period: 'days' };
        
        expect(validateOrganizer(organizer1)).toContain(
          'Last period organizer requires period to be "days", "weeks", or "months"'
        );
        expect(validateOrganizer(organizer2)).toContain(
          'Last period organizer requires a positive number value'
        );
      });

      test('should reject last_period with invalid period', () => {
        const organizer = { type: 'last_period', period: 'years', value: 1 };
        expect(validateOrganizer(organizer)).toContain(
          'Last period organizer requires period to be "days", "weeks", or "months"'
        );
      });

      test('should reject last_period with invalid value', () => {
        const organizer1 = { type: 'last_period', period: 'days', value: 0 };
        const organizer2 = { type: 'last_period', period: 'days', value: 'seven' };
        
        expect(validateOrganizer(organizer1)).toContain(
          'Last period organizer requires a positive number value'
        );
        expect(validateOrganizer(organizer2)).toContain(
          'Last period organizer requires a positive number value'
        );
      });

      test('should reject last_period with excessive values', () => {
        const organizer1 = { type: 'last_period', period: 'days', value: 400 };
        const organizer2 = { type: 'last_period', period: 'weeks', value: 60 };
        const organizer3 = { type: 'last_period', period: 'months', value: 15 };
        
        expect(validateOrganizer(organizer1)).toContain('Last days cannot exceed 365');
        expect(validateOrganizer(organizer2)).toContain('Last weeks cannot exceed 52');
        expect(validateOrganizer(organizer3)).toContain('Last months cannot exceed 12');
      });
    });

    describe('date_range validation', () => {
      test('should accept valid date_range organizer', () => {
        const organizer = {
          type: 'date_range',
          fromDate: '2024-01-01',
          toDate: '2024-01-31'
        };
        expect(validateOrganizer(organizer)).toEqual([]);
      });

      test('should reject date_range with missing dates', () => {
        const organizer1 = { type: 'date_range', toDate: '2024-01-31' };
        const organizer2 = { type: 'date_range', fromDate: '2024-01-01' };
        
        expect(validateOrganizer(organizer1)).toContain('Date range organizer requires fromDate');
        expect(validateOrganizer(organizer2)).toContain('Date range organizer requires toDate');
      });

      test('should reject date_range with invalid date format', () => {
        const organizer1 = {
          type: 'date_range',
          fromDate: 'invalid-date',
          toDate: '2024-01-31'
        };
        const organizer2 = {
          type: 'date_range',
          fromDate: '2024-01-01',
          toDate: 'invalid-date'
        };
        
        expect(validateOrganizer(organizer1)).toContain('Invalid fromDate format. Use YYYY-MM-DD');
        expect(validateOrganizer(organizer2)).toContain('Invalid toDate format. Use YYYY-MM-DD');
      });

      test('should reject date_range where fromDate > toDate', () => {
        const organizer = {
          type: 'date_range',
          fromDate: '2024-01-31',
          toDate: '2024-01-01'
        };
        expect(validateOrganizer(organizer)).toContain(
          'From date must be before or equal to to date'
        );
      });
    });
  });

  describe('getOrganizerDescription', () => {
    test('should return description for all_games', () => {
      expect(getOrganizerDescription({ type: 'all_games' })).toBe('All Games');
      expect(getOrganizerDescription(null)).toBe('All Games (Default)');
      expect(getOrganizerDescription(undefined)).toBe('All Games (Default)');
      expect(getOrganizerDescription({})).toBe('All Games (Default)');
    });

    test('should return description for last_games', () => {
      const organizer = { type: 'last_games', value: 10 };
      expect(getOrganizerDescription(organizer)).toBe('Last 10 Games (Per Player/Team)');
    });

    test('should return description for game_range', () => {
      const organizer = { type: 'game_range', from: 10, to: 20 };
      expect(getOrganizerDescription(organizer)).toBe('Games 10 to 20');
    });

    test('should return description for home_away', () => {
      const organizer1 = { type: 'home_away', gameType: 'home' };
      const organizer2 = { type: 'home_away', gameType: 'away' };
      
      expect(getOrganizerDescription(organizer1)).toBe('Home Games');
      expect(getOrganizerDescription(organizer2)).toBe('Away Games');
    });

    test('should return description for last_period', () => {
      const organizer1 = { type: 'last_period', period: 'days', value: 1 };
      const organizer2 = { type: 'last_period', period: 'days', value: 7 };
      const organizer3 = { type: 'last_period', period: 'weeks', value: 1 };
      const organizer4 = { type: 'last_period', period: 'weeks', value: 2 };
      const organizer5 = { type: 'last_period', period: 'months', value: 1 };
      const organizer6 = { type: 'last_period', period: 'months', value: 3 };
      
      expect(getOrganizerDescription(organizer1)).toBe('Last 1 Day');
      expect(getOrganizerDescription(organizer2)).toBe('Last 7 Days');
      expect(getOrganizerDescription(organizer3)).toBe('Last 1 Week');
      expect(getOrganizerDescription(organizer4)).toBe('Last 2 Weeks');
      expect(getOrganizerDescription(organizer5)).toBe('Last 1 Month');
      expect(getOrganizerDescription(organizer6)).toBe('Last 3 Months');
    });

    test('should return description for date_range', () => {
      const organizer = {
        type: 'date_range',
        fromDate: '2024-01-01',
        toDate: '2024-01-31'
      };
      expect(getOrganizerDescription(organizer)).toBe('2024-01-01 to 2024-01-31');
    });

    test('should return unknown for invalid organizer', () => {
      const organizer = { type: 'invalid_type' };
      expect(getOrganizerDescription(organizer)).toBe('Unknown Organizer');
    });
  });

  describe('buildOrganizerSubquery', () => {
    test('should build subquery for all_games', () => {
      const result = buildOrganizerSubquery({ type: 'all_games' }, 'Players');
      
      expect(result.description).toBe('All Games');
      expect(result.subquery).toContain('SELECT');
      expect(result.subquery).toContain('pgs.player_id as entity_id');
      expect(result.subquery).toContain('pgs.game_id');
      expect(result.subquery).toContain('player_game_stats pgs');
      expect(result.subquery).toContain("g.game_type = 'regular'");
    });

    test('should build subquery for all_games Teams', () => {
      const result = buildOrganizerSubquery({ type: 'all_games' }, 'Teams');
      
      expect(result.description).toBe('All Games');
      expect(result.subquery).toContain('tgs.team_id as entity_id');
      expect(result.subquery).toContain('tgs.game_id');
      expect(result.subquery).toContain('team_game_stats tgs');
      expect(result.subquery).toContain("g.game_type = 'regular'");
    });

    test('should build subquery for last_games', () => {
      const organizer = { type: 'last_games', value: 10 };
      const result = buildOrganizerSubquery(organizer, 'Players');
      
      expect(result.description).toBe('Last 10 Games (Per Player)');
      expect(result.subquery).toContain('WITH ranked_games AS');
      expect(result.subquery).toContain('ROW_NUMBER() OVER');
      expect(result.subquery).toContain('PARTITION BY pgs.player_id');
      expect(result.subquery).toContain('ORDER BY g.game_date DESC');
      expect(result.subquery).toContain('game_rank <= 10');
    });

    test('should build subquery for game_range', () => {
      const organizer = { type: 'game_range', from: 10, to: 20 };
      const result = buildOrganizerSubquery(organizer, 'Players');
      
      expect(result.description).toBe('Games 10 to 20');
      expect(result.subquery).toContain('home_team_game_number BETWEEN 10 AND 20');
      expect(result.subquery).toContain('away_team_game_number BETWEEN 10 AND 20');
    });

    test('should build subquery for home_away', () => {
      const organizer1 = { type: 'home_away', gameType: 'home' };
      const organizer2 = { type: 'home_away', gameType: 'away' };
      
      const result1 = buildOrganizerSubquery(organizer1, 'Players');
      const result2 = buildOrganizerSubquery(organizer2, 'Players');
      
      expect(result1.description).toBe('Home Games');
      expect(result1.subquery).toContain('pgs.team_id = g.home_team_id');
      
      expect(result2.description).toBe('Away Games');
      expect(result2.subquery).toContain('pgs.team_id = g.away_team_id');
    });

    test('should build subquery for last_period', () => {
      const organizer = { type: 'last_period', period: 'days', value: 7 };
      const result = buildOrganizerSubquery(organizer, 'Players');
      
      expect(result.description).toBe('Last 7 Days');
      expect(result.subquery).toContain('WITH latest_game_date AS');
      expect(result.subquery).toContain('MAX(game_date) as max_date');
      expect(result.subquery).toContain("INTERVAL '7 days'");
      expect(result.subquery).toContain('g.game_date > (lgd.max_date -');
    });

    test('should build subquery for date_range', () => {
      const organizer = {
        type: 'date_range',
        fromDate: '2024-01-01',
        toDate: '2024-01-31'
      };
      const result = buildOrganizerSubquery(organizer, 'Players');
      
      expect(result.description).toBe('2024-01-01 to 2024-01-31');
      expect(result.subquery).toContain("g.game_date >= '2024-01-01'");
      expect(result.subquery).toContain("g.game_date <= '2024-01-31'");
    });

    test('should throw error for invalid organizer type', () => {
      expect(() => {
        buildOrganizerSubquery({ type: 'invalid_type' }, 'Players');
      }).toThrow('Unknown organizer type: invalid_type');
    });

    test('should throw error for invalid last_games value', () => {
      expect(() => {
        buildOrganizerSubquery({ type: 'last_games', value: 0 }, 'Players');
      }).toThrow('Last games organizer requires a positive value');
    });

    test('should throw error for invalid game_range values', () => {
      expect(() => {
        buildOrganizerSubquery({ type: 'game_range', from: 0, to: 10 }, 'Players');
      }).toThrow('Game range organizer requires valid from and to values (from <= to)');
      
      expect(() => {
        buildOrganizerSubquery({ type: 'game_range', from: 20, to: 10 }, 'Players');
      }).toThrow('Game range organizer requires valid from and to values (from <= to)');
    });

    test('should throw error for invalid home_away gameType', () => {
      expect(() => {
        buildOrganizerSubquery({ type: 'home_away', gameType: 'neutral' }, 'Players');
      }).toThrow('Home/Away organizer requires gameType to be either "home" or "away"');
    });

    test('should throw error for invalid date_range dates', () => {
      expect(() => {
        buildOrganizerSubquery({
          type: 'date_range',
          fromDate: '2024-01-31',
          toDate: '2024-01-01'
        }, 'Players');
      }).toThrow('From date must be before or equal to to date');
      
      expect(() => {
        buildOrganizerSubquery({
          type: 'date_range',
          fromDate: 'invalid-date',
          toDate: '2024-01-31'
        }, 'Players');
      }).toThrow('Invalid date format. Use YYYY-MM-DD format');
    });
  });

  describe('null and undefined organizer handling', () => {
    test('should handle null organizer', () => {
      const result = buildOrganizerSubquery(null, 'Players');
      expect(result.description).toBe('All Games');
      expect(result.subquery).toContain("g.game_type = 'regular'");
    });

    test('should handle undefined organizer', () => {
      const result = buildOrganizerSubquery(undefined, 'Players');
      expect(result.description).toBe('All Games');
      expect(result.subquery).toContain("g.game_type = 'regular'");
    });
  });
});