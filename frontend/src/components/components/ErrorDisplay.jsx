import React from 'react';
import { X } from 'lucide-react';

const ErrorDisplay = ({ error, connectionStatus, onRetry }) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <X className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">API Error</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error}</p>
            {connectionStatus === 'failed' && (
              <p className="mt-2">
                Make sure your backend server is running on port 3001.
                <button 
                  onClick={onRetry}
                  className="ml-2 underline hover:no-underline"
                >
                  Test connection
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;