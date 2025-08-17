import React, { useMemo } from 'react';
import { Save, Download, RefreshCw, AlertCircle } from 'lucide-react';
import ViewTypeSelector from './ViewTypeSelector';
import DataTable from './DataTable';
import { getColumnsForView, getColumnMetadata } from '../utils/columnManager';
import { getViewOptions, getViewDisplayInfo } from '../utils/viewDetection';
import { validateDataForView } from '../utils/dataFormatting';

const ReportResults = ({ 
  results, 
  rawApiResponse,
  measure, 
  viewType, 
  sortConfig, 
  isLoading,
  filters,
  detectedViewType,
  needsNewFetch,
  onViewTypeChange, 
  onSortChange,
  onFiltersChange
}) => {
  // Get columns for current view
  const columns = useMemo(() => {
    return getColumnsForView(viewType, measure, rawApiResponse, filters);
  }, [viewType, measure, rawApiResponse, filters]);

  // Get column metadata for enhanced rendering
  const columnMetadata = useMemo(() => {
    return getColumnMetadata(columns);
  }, [columns]);

  // Get available view options
  const viewOptions = useMemo(() => {
    return getViewOptions(rawApiResponse, filters);
  }, [rawApiResponse, filters]);

  // Validate current data for selected view
  const dataValidation = useMemo(() => {
    return validateDataForView(results, viewType);
  }, [results, viewType]);

  // Get view display information
  const viewInfo = useMemo(() => {
    return getViewDisplayInfo(viewType, rawApiResponse, filters);
  }, [viewType, rawApiResponse, filters]);

  if (results.length === 0 && !isLoading) return null;

  const handleSort = (column) => {
    let direction = 'desc';
    if (sortConfig.column === column && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    onSortChange({ column, direction });
  };

  const handleExport = () => {
    // Simple CSV export
    if (results.length === 0) return;
    
    const csvHeaders = columns.join(',');
    const csvRows = results.map(row => 
      columns.map(col => {
        const value = row[col.toLowerCase().replace(/\s+/g, '_').replace(/%/g, 'pct')];
        return typeof value === 'string' ? `"${value}"` : value || '';
      }).join(',')
    );
    
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `nba_${measure.toLowerCase()}_${viewType}_report.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header with title and actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-xl font-semibold text-gray-800">Report Results</h3>
          {needsNewFetch && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
              <RefreshCw className="w-4 h-4" />
              <span>Data needs refresh</span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button 
            className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
            disabled={results.length === 0}
          >
            <Save className="w-4 h-4" />
            <span>Save Report</span>
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
            disabled={results.length === 0}
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* View type selector with enhanced information */}
      <ViewTypeSelector 
        viewType={viewType}
        viewOptions={viewOptions}
        detectedViewType={detectedViewType}
        viewInfo={viewInfo}
        onViewTypeChange={onViewTypeChange}
        isLoading={isLoading}
      />

      {/* Data validation warnings */}
      {dataValidation.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Data Limitations</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {dataValidation.map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Results count and view info */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          Showing {results.length} {measure.toLowerCase()} 
          {viewType === 'custom' && ` with ${columns.length} selected columns`}
        </div>
      </div>

      {/* Data table */}
      <DataTable 
        data={results}
        columns={columns}
        columnMetadata={columnMetadata}
        sortConfig={sortConfig}
        viewType={viewType}
        measure={measure}
        onSort={handleSort}
        isLoading={isLoading}
      />

      {/* Additional metadata footer */}
      {rawApiResponse?.queryMetadata?.isUnified && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Data source: Unified query combining traditional and advanced statistics
            {rawApiResponse.queryMetadata.hasAdvancedData && (
              <span className="ml-2">• Advanced stats available</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportResults;