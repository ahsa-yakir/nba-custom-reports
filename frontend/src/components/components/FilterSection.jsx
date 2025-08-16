import React, { useState } from 'react';
import { Filter, WifiOff } from 'lucide-react';
import FilterBuilder from './FilterBuilder';
import ActiveFilters from './ActiveFilters';
import { getFilterOptions } from '../utils/filterOptions';

const FilterSection = ({ 
  measure, 
  filters, 
  teams, 
  connectionStatus, 
  onFiltersChange 
}) => {
  const [newFilter, setNewFilter] = useState({ 
    type: '', operator: '', value: '', value2: '', values: [] 
  });

  const addFilter = () => {
    if (!newFilter.type || !newFilter.operator) return;
    
    const filter = {
      id: Date.now(),
      type: newFilter.type,
      operator: newFilter.operator,
      value: newFilter.value,
      value2: newFilter.value2,
      values: newFilter.values
    };
    
    onFiltersChange([...filters, filter]);
    setNewFilter({ type: '', operator: '', value: '', value2: '', values: [] });
  };

  const removeFilter = (filterId) => {
    onFiltersChange(filters.filter(filter => filter.id !== filterId));
  };

  const filterOptions = getFilterOptions(measure, teams);

  return (
    <div className="bg-white rounded-lg border-2 border-green-200 p-6 min-h-96">
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-800">Filters *</h3>
        <span className="text-sm text-gray-500">(At least one required)</span>
      </div>

      {measure && connectionStatus === 'connected' && (
        <FilterBuilder
          newFilter={newFilter}
          setNewFilter={setNewFilter}
          filterOptions={filterOptions}
          onAddFilter={addFilter}
        />
      )}

      <ActiveFilters
        filters={filters}
        onRemoveFilter={removeFilter}
      />

      {!measure && (
        <div className="text-center py-8 text-gray-500">
          <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Select a measure first to see available filters.</p>
        </div>
      )}

      {connectionStatus === 'failed' && (
        <div className="text-center py-8 text-gray-500">
          <WifiOff className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Connect to backend to use filters.</p>
        </div>
      )}
    </div>
  );
};

export default FilterSection;