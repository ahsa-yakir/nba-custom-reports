/**
 * Value conversion utility for handling percentage and numeric conversions
 * Extracts scattered conversion logic from whereClauseBuilder.js
 */

class ValueConverter {
  /**
   * Determine if a filter type represents a percentage column
   * @param {string} filterType - The filter type (e.g., 'FG%', 'Usage %', etc.)
   * @returns {boolean} True if the column is a percentage
   */
  static isPercentageColumn(filterType) {
    const percentageColumns = [
    'FG%', '3P%', 'FT%', 'Usage %', 'True Shooting %', 'Effective FG%', 
    'Assist %', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %', 
    'Turnover %', 'Win %'
    ];
    return percentageColumns.includes(filterType);
  }
  
  /**
   * Convert a single filter value based on whether it's a percentage
   * @param {*} value - The value to convert
   * @param {string} filterType - The filter type to determine conversion
   * @returns {*} Converted value (percentage values divided by 100)
   */
  static convertFilterValue(value, filterType) {
    if (value === null || value === undefined || value === '') {
      return value;
    }
    
    if (this.isPercentageColumn(filterType)) {
      // Convert percentage from user input (e.g., 45.5) to decimal (0.455)
      return parseFloat(value) / 100;
    }
    
    // For non-percentage numeric values, just parse as float
    if (!isNaN(value)) {
      return parseFloat(value);
    }
    
    // Return string values as-is
    return value;
  }
  
  /**
   * Convert an array of filter values
   * @param {Array} values - Array of values to convert
   * @param {string} filterType - The filter type
   * @returns {Array} Array of converted values
   */
  static convertFilterValues(values, filterType) {
    if (!Array.isArray(values)) {
      return values;
    }
    
    return values.map(value => this.convertFilterValue(value, filterType));
  }
  
  /**
   * Convert value back to display format (reverse of convertFilterValue)
   * @param {*} value - Database value to format for display
   * @param {string} filterType - The filter type
   * @returns {string} Formatted display value
   */
  static formatDisplayValue(value, filterType) {
    if (value === null || value === undefined) {
      return '-';
    }
    
    if (this.isPercentageColumn(filterType)) {
      // Convert decimal back to percentage for display
      return (parseFloat(value) * 100).toFixed(1) + '%';
    }
    
    // Format numeric values
    const num = parseFloat(value);
    if (isNaN(num)) {
      return String(value);
    }
    
    // Show integers without decimals, floats with 1 decimal
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
  }
  
  /**
   * Validate that a value is appropriate for the filter type
   * @param {*} value - Value to validate
   * @param {string} filterType - Filter type for validation context
   * @returns {Object} { valid: boolean, message: string }
   */
  static validateValue(value, filterType) {
    if (value === null || value === undefined || value === '') {
      return { valid: false, message: 'Value is required' };
    }
    
    if (this.isPercentageColumn(filterType)) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return { valid: false, message: 'Percentage must be a number' };
      }
      if (numValue < 0 || numValue > 100) {
        return { valid: false, message: 'Percentage must be between 0 and 100' };
      }
      return { valid: true, message: '' };
    }
    
    // For non-percentage columns that should be numeric
    if (['Age', 'PTS', 'MINS', 'FGM', 'FGA', 'AST', 'REB'].includes(filterType)) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return { valid: false, message: 'Value must be a number' };
      }
      if (numValue < 0) {
        return { valid: false, message: 'Value cannot be negative' };
      }
      return { valid: true, message: '' };
    }
    
    // String values (like Team) - just check they're not empty
    if (typeof value === 'string' && value.trim().length === 0) {
      return { valid: false, message: 'Value cannot be empty' };
    }
    
    return { valid: true, message: '' };
  }
  
  /**
   * Validate an array of values
   * @param {Array} values - Values to validate
   * @param {string} filterType - Filter type
   * @returns {Object} { valid: boolean, message: string, invalidValues: Array }
   */
  static validateValues(values, filterType) {
    if (!Array.isArray(values) || values.length === 0) {
      return { valid: false, message: 'At least one value is required', invalidValues: [] };
    }
    
    const invalidValues = [];
    
    values.forEach((value, index) => {
      const validation = this.validateValue(value, filterType);
      if (!validation.valid) {
        invalidValues.push({ index, value, message: validation.message });
      }
    });
    
    if (invalidValues.length > 0) {
      return {
        valid: false,
        message: `${invalidValues.length} invalid value(s) found`,
        invalidValues
      };
    }
    
    return { valid: true, message: '', invalidValues: [] };
  }
  
  /**
   * Get appropriate input type for HTML forms based on filter type
   * @param {string} filterType - Filter type
   * @returns {string} HTML input type
   */
  static getInputType(filterType) {
    if (filterType === 'Team') {
      return 'text';
    }
    
    // Most NBA stats are numeric
    return 'number';
  }
  
  /**
   * Get input attributes for HTML forms (min, max, step, placeholder)
   * @param {string} filterType - Filter type
   * @returns {Object} Attributes object for HTML input
   */
  static getInputAttributes(filterType) {
    const base = {
      type: this.getInputType(filterType)
    };
    
    if (filterType === 'Team') {
      return {
        ...base,
        placeholder: 'e.g., LAL, GSW',
        maxlength: '3'
      };
    }
    
    if (this.isPercentageColumn(filterType)) {
      return {
        ...base,
        min: '0',
        max: '100',
        step: '0.1',
        placeholder: 'e.g., 45.5'
      };
    }
    
    if (filterType === 'Age') {
      return {
        ...base,
        min: '18',
        max: '50',
        step: '1',
        placeholder: 'e.g., 25'
      };
    }
    
    // Default numeric attributes
    return {
      ...base,
      min: '0',
      step: '0.1',
      placeholder: 'e.g., 25.3'
    };
  }
}

module.exports = { ValueConverter };