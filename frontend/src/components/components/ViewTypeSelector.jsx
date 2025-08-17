import React from 'react';
import { Eye, Loader2, Zap, AlertTriangle } from 'lucide-react';

const ViewTypeSelector = ({ 
  viewType, 
  viewOptions, 
  detectedViewType, 
  viewInfo, 
  onViewTypeChange, 
  isLoading 
}) => {
  const showRecommendation = detectedViewType && detectedViewType !== viewType;

  return (
    <div className="space-y-4 mb-6">
      {/* Main view selector */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">View:</span>
        </div>
        
        <select
          value={viewType}
          onChange={(e) => onViewTypeChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-48"
          disabled={isLoading}
        >
          {viewOptions.map(option => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={!option.available}
            >
              {option.label}
              {!option.available && ' (Not Available)'}
            </option>
          ))}
        </select>

        {isLoading && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Advanced stats availability warning */}
      {viewType === 'advanced' && viewOptions.find(o => o.value === 'advanced')?.available === false && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <span className="font-medium">Limited Data:</span>
              {' '}
              Advanced statistics may not be available for all entries. Some rows might show incomplete data.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getViewLabel = (viewType, viewOptions) => {
  const option = viewOptions.find(o => o.value === viewType);
  return option ? option.label : viewType;
};

export default ViewTypeSelector;