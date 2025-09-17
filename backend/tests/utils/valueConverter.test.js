/**
 * Unit tests for valueConverter.js utility
 * Tests the ValueConverter class methods for NBA statistics value conversion
 */

const { ValueConverter } = require('../../src/utils/valueConverter');

describe('ValueConverter', () => {
  describe('isPercentageColumn', () => {
    test('should identify percentage columns correctly', () => {
      expect(ValueConverter.isPercentageColumn('FG%')).toBe(true);
      expect(ValueConverter.isPercentageColumn('3P%')).toBe(true);
      expect(ValueConverter.isPercentageColumn('FT%')).toBe(true);
      expect(ValueConverter.isPercentageColumn('Usage %')).toBe(true);
      expect(ValueConverter.isPercentageColumn('True Shooting %')).toBe(true);
      expect(ValueConverter.isPercentageColumn('Win %')).toBe(true);
    });

    test('should identify non-percentage columns correctly', () => {
      expect(ValueConverter.isPercentageColumn('PTS')).toBe(false);
      expect(ValueConverter.isPercentageColumn('REB')).toBe(false);
      expect(ValueConverter.isPercentageColumn('AST')).toBe(false);
      expect(ValueConverter.isPercentageColumn('Team')).toBe(false);
      expect(ValueConverter.isPercentageColumn('Age')).toBe(false);
    });

    test('should handle undefined and null inputs', () => {
      expect(ValueConverter.isPercentageColumn(undefined)).toBe(false);
      expect(ValueConverter.isPercentageColumn(null)).toBe(false);
      expect(ValueConverter.isPercentageColumn('')).toBe(false);
    });
  });

  describe('convertFilterValue', () => {
    test('should convert percentage values correctly', () => {
      expect(ValueConverter.convertFilterValue(45.5, 'FG%')).toBe(0.455);
      expect(ValueConverter.convertFilterValue(100, '3P%')).toBe(1.0);
      expect(ValueConverter.convertFilterValue(0, 'FT%')).toBe(0.0);
      expect(ValueConverter.convertFilterValue('85.7', 'Usage %')).toBe(0.857);
    });

    test('should convert numeric values correctly', () => {
      expect(ValueConverter.convertFilterValue(25, 'PTS')).toBe(25);
      expect(ValueConverter.convertFilterValue('15.5', 'REB')).toBe(15.5);
      expect(ValueConverter.convertFilterValue(30, 'Age')).toBe(30);
    });

    test('should handle string values correctly', () => {
      expect(ValueConverter.convertFilterValue('LAL', 'Team')).toBe('LAL');
      expect(ValueConverter.convertFilterValue('GSW', 'Team')).toBe('GSW');
    });

    test('should handle null and undefined values', () => {
      expect(ValueConverter.convertFilterValue(null, 'PTS')).toBe(null);
      expect(ValueConverter.convertFilterValue(undefined, 'FG%')).toBe(undefined);
      expect(ValueConverter.convertFilterValue('', 'Team')).toBe('');
    });

    test('should handle invalid numeric strings', () => {
      expect(ValueConverter.convertFilterValue('abc', 'PTS')).toBe('abc');
      expect(ValueConverter.convertFilterValue('not-a-number', 'Age')).toBe('not-a-number');
    });
  });

  describe('convertFilterValues', () => {
    test('should convert array of percentage values', () => {
      const input = [45.5, 50.0, 85.7];
      const expected = [0.455, 0.5, 0.857];
      expect(ValueConverter.convertFilterValues(input, 'FG%')).toEqual(expected);
    });

    test('should convert array of numeric values', () => {
      const input = [20, 25, 30];
      const expected = [20, 25, 30];
      expect(ValueConverter.convertFilterValues(input, 'PTS')).toEqual(expected);
    });

    test('should convert array of team values', () => {
      const input = ['LAL', 'GSW', 'BOS'];
      const expected = ['LAL', 'GSW', 'BOS'];
      expect(ValueConverter.convertFilterValues(input, 'Team')).toEqual(expected);
    });

    test('should handle non-array inputs', () => {
      expect(ValueConverter.convertFilterValues('single-value', 'PTS')).toBe('single-value');
      expect(ValueConverter.convertFilterValues(null, 'Team')).toBe(null);
      expect(ValueConverter.convertFilterValues(undefined, 'Age')).toBe(undefined);
    });

    test('should handle empty arrays', () => {
      expect(ValueConverter.convertFilterValues([], 'PTS')).toEqual([]);
    });
  });

  describe('formatDisplayValue', () => {
    test('should format percentage values for display', () => {
      expect(ValueConverter.formatDisplayValue(0.455, 'FG%')).toBe('45.5%');
      expect(ValueConverter.formatDisplayValue(1.0, '3P%')).toBe('100.0%');
      expect(ValueConverter.formatDisplayValue(0.0, 'FT%')).toBe('0.0%');
    });

    test('should format numeric values for display', () => {
      expect(ValueConverter.formatDisplayValue(25, 'PTS')).toBe('25');
      expect(ValueConverter.formatDisplayValue(15.5, 'REB')).toBe('15.5');
      expect(ValueConverter.formatDisplayValue(10.0, 'AST')).toBe('10');
    });

    test('should handle string values', () => {
      expect(ValueConverter.formatDisplayValue('LAL', 'Team')).toBe('LAL');
      expect(ValueConverter.formatDisplayValue('Point Guard', 'Position')).toBe('Point Guard');
    });

    test('should handle null and undefined values', () => {
      expect(ValueConverter.formatDisplayValue(null, 'PTS')).toBe('-');
      expect(ValueConverter.formatDisplayValue(undefined, 'FG%')).toBe('-');
    });

    test('should handle invalid numeric values', () => {
      expect(ValueConverter.formatDisplayValue('not-a-number', 'PTS')).toBe('not-a-number');
      expect(ValueConverter.formatDisplayValue(NaN, 'Age')).toBe('NaN');
    });
  });

  describe('validateValue', () => {
    test('should validate percentage values correctly', () => {
      expect(ValueConverter.validateValue(45.5, 'FG%')).toEqual({ valid: true, message: '' });
      expect(ValueConverter.validateValue(0, '3P%')).toEqual({ valid: true, message: '' });
      expect(ValueConverter.validateValue(100, 'FT%')).toEqual({ valid: true, message: '' });
    });

    test('should reject invalid percentage values', () => {
      expect(ValueConverter.validateValue(-5, 'FG%')).toEqual({
        valid: false,
        message: 'Percentage must be between 0 and 100'
      });
      expect(ValueConverter.validateValue(150, '3P%')).toEqual({
        valid: false,
        message: 'Percentage must be between 0 and 100'
      });
      expect(ValueConverter.validateValue('not-a-number', 'FT%')).toEqual({
        valid: false,
        message: 'Percentage must be a number'
      });
    });

    test('should validate numeric values correctly', () => {
      expect(ValueConverter.validateValue(25, 'PTS')).toEqual({ valid: true, message: '' });
      expect(ValueConverter.validateValue(0, 'REB')).toEqual({ valid: true, message: '' });
      expect(ValueConverter.validateValue(30, 'Age')).toEqual({ valid: true, message: '' });
    });

    test('should reject invalid numeric values', () => {
      expect(ValueConverter.validateValue(-5, 'PTS')).toEqual({
        valid: false,
        message: 'Value cannot be negative'
      });
      expect(ValueConverter.validateValue('not-a-number', 'Age')).toEqual({
        valid: false,
        message: 'Value must be a number'
      });
    });

    test('should validate string values correctly', () => {
      expect(ValueConverter.validateValue('LAL', 'Team')).toEqual({ valid: true, message: '' });
      expect(ValueConverter.validateValue('Golden State Warriors', 'Team')).toEqual({ valid: true, message: '' });
    });

    test('should reject empty string values', () => {
      expect(ValueConverter.validateValue('', 'Team')).toEqual({
        valid: false,
        message: 'Value is required'
      });
      expect(ValueConverter.validateValue('   ', 'Team')).toEqual({
        valid: false,
        message: 'Value cannot be empty'
      });
    });

    test('should reject null and undefined values', () => {
      expect(ValueConverter.validateValue(null, 'PTS')).toEqual({
        valid: false,
        message: 'Value is required'
      });
      expect(ValueConverter.validateValue(undefined, 'Team')).toEqual({
        valid: false,
        message: 'Value is required'
      });
    });
  });

  describe('validateValues', () => {
    test('should validate array of valid values', () => {
      const values = [25, 30, 35];
      expect(ValueConverter.validateValues(values, 'PTS')).toEqual({
        valid: true,
        message: '',
        invalidValues: []
      });
    });

    test('should identify invalid values in array', () => {
      const values = [25, -5, 30, 'not-a-number'];
      const result = ValueConverter.validateValues(values, 'PTS');
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('2 invalid value(s) found');
      expect(result.invalidValues).toHaveLength(2);
      expect(result.invalidValues[0]).toEqual({
        index: 1,
        value: -5,
        message: 'Value cannot be negative'
      });
      expect(result.invalidValues[1]).toEqual({
        index: 3,
        value: 'not-a-number',
        message: 'Value must be a number'
      });
    });

    test('should reject non-array inputs', () => {
      expect(ValueConverter.validateValues('not-an-array', 'PTS')).toEqual({
        valid: false,
        message: 'At least one value is required',
        invalidValues: []
      });
      expect(ValueConverter.validateValues(null, 'Team')).toEqual({
        valid: false,
        message: 'At least one value is required',
        invalidValues: []
      });
    });

    test('should reject empty arrays', () => {
      expect(ValueConverter.validateValues([], 'PTS')).toEqual({
        valid: false,
        message: 'At least one value is required',
        invalidValues: []
      });
    });
  });

  describe('getInputType', () => {
    test('should return correct input types', () => {
      expect(ValueConverter.getInputType('Team')).toBe('text');
      expect(ValueConverter.getInputType('PTS')).toBe('number');
      expect(ValueConverter.getInputType('FG%')).toBe('number');
      expect(ValueConverter.getInputType('Age')).toBe('number');
    });
  });

  describe('getInputAttributes', () => {
    test('should return correct attributes for Team', () => {
      const attrs = ValueConverter.getInputAttributes('Team');
      expect(attrs.type).toBe('text');
      expect(attrs.placeholder).toBe('e.g., LAL, GSW');
      expect(attrs.maxlength).toBe('3');
    });

    test('should return correct attributes for percentage columns', () => {
      const attrs = ValueConverter.getInputAttributes('FG%');
      expect(attrs.type).toBe('number');
      expect(attrs.min).toBe('0');
      expect(attrs.max).toBe('100');
      expect(attrs.step).toBe('0.1');
      expect(attrs.placeholder).toBe('e.g., 45.5');
    });

    test('should return correct attributes for Age', () => {
      const attrs = ValueConverter.getInputAttributes('Age');
      expect(attrs.type).toBe('number');
      expect(attrs.min).toBe('18');
      expect(attrs.max).toBe('50');
      expect(attrs.step).toBe('1');
      expect(attrs.placeholder).toBe('e.g., 25');
    });

    test('should return correct attributes for general numeric columns', () => {
      const attrs = ValueConverter.getInputAttributes('PTS');
      expect(attrs.type).toBe('number');
      expect(attrs.min).toBe('0');
      expect(attrs.step).toBe('0.1');
      expect(attrs.placeholder).toBe('e.g., 25.3');
    });
  });
});