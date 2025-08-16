import React from 'react';
import { Eye, Loader2 } from 'lucide-react';

const ViewTypeSelector = ({ viewType, onViewTypeChange, isLoading }) => {
  return (
    <div className="flex items-center space-x-4 mb-6">
      <div className="flex items-center space-x-2">
        <Eye className="w-5 h-5 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">View:</span>
      </div>
      <select
        value={viewType}
        onChange={(e) => onViewTypeChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        disabled={isLoading}
      >
        <option value="traditional">Traditional Stats</option>
        <option value="advanced">Advanced Stats</option>
      </select>
      {isLoading && (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Updating view...</span>
        </div>
      )}
    </div>
  );
};

export default ViewTypeSelector;