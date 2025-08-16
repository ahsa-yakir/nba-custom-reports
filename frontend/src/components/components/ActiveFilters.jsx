import React from 'react';
import { X } from 'lucide-react';

const ActiveFilters = ({ filters, onRemoveFilter }) => {
  if (filters.length === 0) return null;

  const formatFilterDisplay = (filter) => {
    let valueDisplay = '';
    
    if (filter.values?.length > 0) {
      valueDisplay = filter.values.join(', ');
    } else if (filter.operator === 'between') {
      valueDisplay = `${filter.value}-${filter.value2}`;
    } else {
      valueDisplay = filter.value;
    }
    
    return `${filter.type} ${filter.operator} ${valueDisplay}`;
  };

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Active Filters:</h4>
      <div className="flex flex-wrap gap-2">
        {filters.map(filter => (
          <div key={filter.id} className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
            <span>
              {formatFilterDisplay(filter)}
            </span>
            <button
              onClick={() => onRemoveFilter(filter.id)}
              className="ml-2 text-green-600 hover:text-green-800"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveFilters;