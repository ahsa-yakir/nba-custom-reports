import React from 'react';
import { Target } from 'lucide-react';

const MeasureSection = ({ measure, onMeasureChange, disabled }) => {
  return (
    <div className="bg-white rounded-lg border-2 border-blue-200 p-6 min-h-96 flex flex-col">
      <div className="flex items-center space-x-2 mb-4">
        <Target className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Measure *</h3>
        <span className="text-sm text-gray-500">(Required)</span>
      </div>
      
      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Entity</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="measure"
                value="Players"
                checked={measure === 'Players'}
                onChange={(e) => onMeasureChange(e.target.value)}
                className="mr-2"
                disabled={disabled}
              />
              Players
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="measure"
                value="Teams"
                checked={measure === 'Teams'}
                onChange={(e) => onMeasureChange(e.target.value)}
                className="mr-2"
                disabled={disabled}
              />
              Teams
            </label>
          </div>
        </div>

        {measure && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Selected:</span> {measure}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeasureSection;