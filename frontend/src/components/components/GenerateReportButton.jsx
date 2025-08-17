import React from 'react';
import { Play, Loader2, RefreshCw, Zap } from 'lucide-react';

const GenerateReportButton = ({ canGenerate, isLoading, onGenerate, needsNewFetch }) => {
  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Generating Unified Report...</span>
        </>
      );
    }
    
    if (needsNewFetch) {
      return (
        <>
          <RefreshCw className="w-5 h-5" />
          <span>Generate New Report</span>
        </>
      );
    }
    
    return (
      <>
        <Play className="w-5 h-5" />
        <span>Generate Report</span>
      </>
    );
  };

  const getButtonStyle = () => {
    if (canGenerate && !isLoading) {
      return needsNewFetch 
        ? 'bg-blue-600 text-white hover:bg-blue-700'
        : 'bg-green-600 text-white hover:bg-green-700';
    }
    return 'bg-gray-300 text-gray-500 cursor-not-allowed';
  };

  return (
    <div className="flex justify-center">
      <button
        onClick={onGenerate}
        disabled={!canGenerate || isLoading}
        className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-semibold transition-colors ${getButtonStyle()}`}
      >
        {getButtonContent()}
      </button>
    </div>
  );
};

export default GenerateReportButton;