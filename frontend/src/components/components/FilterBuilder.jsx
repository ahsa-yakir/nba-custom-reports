import React from 'react';
import { Check } from 'lucide-react';

const FilterBuilder = ({ newFilter, setNewFilter, filterOptions, onAddFilter }) => {
  const isValidFilter = () => {
    if (!newFilter.type || !newFilter.operator) return false;
    
    if (newFilter.operator === 'in') {
      return newFilter.values.length > 0;
    }
    
    if (newFilter.operator === 'between') {
      return newFilter.value && newFilter.value2;
    }
    
    return newFilter.value;
  };

  const handleValueChange = (field, value) => {
    setNewFilter(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type) => {
    setNewFilter({ 
      type, 
      operator: '', 
      value: '', 
      value2: '', 
      values: [] 
    });
  };

  const handleOperatorChange = (operator) => {
    setNewFilter(prev => ({ 
      ...prev, 
      operator, 
      value: '', 
      value2: '', 
      values: [] 
    }));
  };

  const getSelectedFilterOption = () => {
    return filterOptions.find(opt => opt.type === newFilter.type);
  };

  const renderValueInput = () => {
    const selectedOption = getSelectedFilterOption();
    
    if (newFilter.operator === 'in') {
      return (
        <select
          multiple
          value={newFilter.values}
          onChange={(e) => handleValueChange('values', Array.from(e.target.selectedOptions, option => option.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20"
        >
          {selectedOption?.options?.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }
    
    if (newFilter.operator === 'equals' && selectedOption?.options) {
      return (
        <select
          value={newFilter.value}
          onChange={(e) => handleValueChange('value', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select Value</option>
          {selectedOption.options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }
    
    if (newFilter.operator === 'between') {
      return (
        <div className="flex space-x-2">
          <input
            type="number"
            placeholder="Min"
            value={newFilter.value}
            onChange={(e) => handleValueChange('value', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="number"
            placeholder="Max"
            value={newFilter.value2}
            onChange={(e) => handleValueChange('value2', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      );
    }
    
    return (
      <input
        type="number"
        placeholder="Enter value"
        value={newFilter.value}
        onChange={(e) => handleValueChange('value', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        disabled={!newFilter.operator}
      />
    );
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Add Filter:</h4>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter Type</label>
          <select
            value={newFilter.type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select Type</option>
            {filterOptions.map(option => (
              <option key={option.type} value={option.type}>{option.type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
          <select
            value={newFilter.operator}
            onChange={(e) => handleOperatorChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            disabled={!newFilter.type}
          >
            <option value="">Select Operator</option>
            {getSelectedFilterOption()?.operators.map(operator => (
              <option key={operator} value={operator}>{operator}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
          {renderValueInput()}
        </div>

        <div className="flex items-end">
          <button
            onClick={onAddFilter}
            disabled={!isValidFilter()}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isValidFilter()
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterBuilder;