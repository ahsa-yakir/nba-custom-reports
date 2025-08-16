import React from 'react';
import { Play, Loader2 } from 'lucide-react';

const GenerateReportButton = ({ canGenerate, isLoading, onGenerate }) => {
  return (
    <div className="flex justify-center">
      <button
        onClick={onGenerate}
        disabled={!canGenerate || isLoading}
        className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-semibold transition-colors ${
          canGenerate && !isLoading
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Play className="w-5 h-5" />
        )}
        <span>{isLoading ? 'Generating...' : 'Generate Report'}</span>
      </button>
    </div>
  );
};

export default GenerateReportButton;