import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Zap } from 'lucide-react';
import { apiService } from '../services/api';
import { isAdvancedFilterType } from './utils/filterOptions';
import { detectViewType, shouldAutoSwitchView } from './utils/viewDetection';
import { formatUnifiedResults, sortData, filterDataByView } from './utils/dataFormatting';
import ConnectionStatus from './components/ConnectionStatus';
import ErrorDisplay from './components/ErrorDisplay';
import MeasureSection from './components/MeasureSection';
import FilterSection from './components/FilterSection';
import GenerateReportButton from './components/GenerateReportButton';
import RequirementsWarning from './components/RequirementsWarning';
import ReportResults from './components/ReportResults';

const CustomReportsBuilder = () => {
  // Consolidated report state
  const [reportState, setReportState] = useState({
    measure: '',
    filters: [],
    sortConfig: { column: null, direction: 'desc' },
    viewType: 'traditional',
    lastViewType: null // Track user's explicit view choice
  });

  // Cached unified data and metadata
  const [dataCache, setDataCache] = useState({
    rawResults: [],
    formattedData: [],
    apiResponse: null,
    lastFetchConfig: null,
    isStale: false
  });

  // UI state
  const [uiState, setUiState] = useState({
    isLoading: false,
    connectionStatus: 'unknown',
    apiError: null,
    teams: [],
    isAutoSwitching: false
  });

  // Smart view detection with auto-switching
  const detectedViewType = useMemo(() => {
    return detectViewType(reportState.filters, dataCache.apiResponse);
  }, [reportState.filters, dataCache.apiResponse]);

  // Memoized sorted and filtered data
  const displayData = useMemo(() => {
    if (dataCache.formattedData.length === 0) return [];
    
    // Filter data based on current view type
    const viewFilteredData = filterDataByView(
      dataCache.formattedData, 
      reportState.viewType, 
      reportState.measure
    );
    
    // Apply sorting
    return sortData(viewFilteredData, reportState.sortConfig);
  }, [dataCache.formattedData, reportState.viewType, reportState.measure, reportState.sortConfig]);

  // Auto-switch view type when filters change
  useEffect(() => {
    if (reportState.filters.length > 0 && dataCache.apiResponse) {
      const shouldSwitch = shouldAutoSwitchView(
        reportState.lastViewType, 
        detectedViewType, 
        reportState.filters
      );
      
      if (shouldSwitch && reportState.viewType !== detectedViewType) {
        setUiState(prev => ({ ...prev, isAutoSwitching: true }));
        setReportState(prev => ({ 
          ...prev, 
          viewType: detectedViewType
        }));
        
        // Clear auto-switching flag after a delay
        setTimeout(() => {
          setUiState(prev => ({ ...prev, isAutoSwitching: false }));
        }, 2000);
      }
    }
  }, [reportState.filters, detectedViewType, reportState.lastViewType, dataCache.apiResponse]);

  // Check if current config needs new data fetch
  const needsNewFetch = useMemo(() => {
    if (!dataCache.lastFetchConfig) return true;
    
    const { measure, filters } = reportState;
    const lastConfig = dataCache.lastFetchConfig;
    
    return (
      measure !== lastConfig.measure ||
      JSON.stringify(filters) !== JSON.stringify(lastConfig.filters) ||
      dataCache.isStale
    );
  }, [reportState.measure, reportState.filters, dataCache.lastFetchConfig, dataCache.isStale]);

  // Initialize connection and teams
  useEffect(() => {
    testConnection();
    loadTeams();
  }, []);

  const testConnection = async () => {
    try {
      setUiState(prev => ({ ...prev, connectionStatus: 'testing' }));
      const result = await apiService.testConnection();
      
      if (result.status === 'connected') {
        setUiState(prev => ({ 
          ...prev, 
          connectionStatus: 'connected', 
          apiError: null 
        }));
      } else {
        setUiState(prev => ({ 
          ...prev, 
          connectionStatus: 'failed', 
          apiError: result.error 
        }));
      }
    } catch (error) {
      setUiState(prev => ({ 
        ...prev, 
        connectionStatus: 'failed', 
        apiError: error.message 
      }));
    }
  };

  const loadTeams = async () => {
    try {
      const response = await apiService.getTeams();
      if (response.success && response.teams) {
        setUiState(prev => ({ 
          ...prev, 
          teams: response.teams.map(team => team.team_code) 
        }));
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      setUiState(prev => ({ 
        ...prev, 
        teams: ['BOS', 'MIL', 'PHI', 'LAL', 'GSW', 'DAL', 'DEN', 'OKC'] 
      }));
    }
  };

  const generateReport = async () => {
    if (!reportState.measure || reportState.filters.length === 0) return;

    setUiState(prev => ({ ...prev, isLoading: true, apiError: null }));

    try {
      console.log('Generating unified report...', { 
        measure: reportState.measure, 
        filters: reportState.filters
      });

      const reportConfig = {
        measure: reportState.measure,
        filters: reportState.filters.map(filter => ({
          type: filter.type,
          operator: filter.operator,
          value: filter.value,
          value2: filter.value2,
          values: filter.values
        })),
        sortConfig: reportState.sortConfig.column ? reportState.sortConfig : null,
        viewType: 'unified' // Always request unified data /
      };

      const response = await apiService.generateReport(reportConfig);
      
      if (response.success && response.results) {
        console.log(`Unified report generated: ${response.count} results`);
        
        // Format and cache the unified data
        const formattedData = formatUnifiedResults(
          response.results, 
          reportState.viewType, 
          response
        );
        
        setDataCache({
          rawResults: response.results,
          formattedData,
          apiResponse: response,
          lastFetchConfig: {
            measure: reportState.measure,
            filters: reportState.filters
          },
          isStale: false
        });

        // Set smart default sorting if none specified
        if (!reportState.sortConfig.column) {
          const defaultSort = getSmartDefaultSort(reportState.measure, response);
          setReportState(prev => ({ ...prev, sortConfig: defaultSort }));
        }

        // Auto-switch view type if recommended and user hasn't explicitly chosen
        if (!reportState.lastViewType && response.queryMetadata?.recommendedViewType) {
          setReportState(prev => ({ 
            ...prev, 
            viewType: response.queryMetadata.recommendedViewType 
          }));
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      setUiState(prev => ({ ...prev, apiError: error.message }));
      setDataCache(prev => ({ ...prev, isStale: true }));
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const getSmartDefaultSort = (measure, apiResponse) => {
    // Use API recommendations if available
    if (apiResponse?.queryMetadata?.activeColumns?.length > 0) {
      const activeColumns = apiResponse.queryMetadata.activeColumns;
      // Find the first numeric column from active columns
      const numericColumn = activeColumns.find(col => 
        !['Name', 'Team', 'TEAM', 'AGE'].includes(col)
      );
      if (numericColumn) {
        return { column: numericColumn, direction: 'desc' };
      }
    }

    // Fallback defaults
    if (measure === 'Players') {
      return { column: 'PTS', direction: 'desc' };
    } else {
      return { column: 'Wins', direction: 'desc' };
    }
  };

  const handleViewChange = (newViewType) => {
    setReportState(prev => ({ 
      ...prev, 
      viewType: newViewType,
      lastViewType: newViewType // Track user's explicit choice
    }));
  };

  const handleSortChange = (sortConfig) => {
    setReportState(prev => ({ ...prev, sortConfig }));
  };

  const handleFiltersChange = (filters) => {
    setReportState(prev => ({ 
      ...prev, 
      filters,
      lastViewType: null // Reset view choice when filters change
    }));
    
    // Mark cache as potentially stale
    setDataCache(prev => ({ ...prev, isStale: true }));
  };

  const canGenerateReport = reportState.measure && 
    reportState.filters.length > 0 && 
    uiState.connectionStatus === 'connected';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-800">NBA Custom Reports</h1>
              {uiState.isAutoSwitching && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <Zap className="w-4 h-4" />
                  <span>Auto-switching view...</span>
                </div>
              )}
            </div>
            
            <ConnectionStatus 
              status={uiState.connectionStatus}
              onRetry={testConnection}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          
          <ErrorDisplay 
            error={uiState.apiError}
            connectionStatus={uiState.connectionStatus}
            onRetry={testConnection}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            <div className="lg:col-span-1">
              <MeasureSection
                measure={reportState.measure}
                onMeasureChange={(measure) => {
                  setReportState(prev => ({ ...prev, measure }));
                  setDataCache(prev => ({ ...prev, isStale: true }));
                }}
                disabled={uiState.connectionStatus === 'failed'}
              />
            </div>

            <div className="lg:col-span-3">
              <FilterSection
                measure={reportState.measure}
                filters={reportState.filters}
                teams={uiState.teams}
                connectionStatus={uiState.connectionStatus}
                onFiltersChange={handleFiltersChange}
              />
            </div>
          </div>

          <GenerateReportButton
            canGenerate={canGenerateReport}
            isLoading={uiState.isLoading}
            onGenerate={generateReport}
            needsNewFetch={needsNewFetch}
          />

          <RequirementsWarning
            canGenerate={canGenerateReport}
            isLoading={uiState.isLoading}
            connectionStatus={uiState.connectionStatus}
            measure={reportState.measure}
            filtersCount={reportState.filters.length}
          />

          <ReportResults
            results={displayData}
            rawApiResponse={dataCache.apiResponse}
            measure={reportState.measure}
            viewType={reportState.viewType}
            sortConfig={reportState.sortConfig}
            isLoading={uiState.isLoading}
            filters={reportState.filters}
            detectedViewType={detectedViewType}
            needsNewFetch={needsNewFetch}
            onViewTypeChange={handleViewChange}
            onSortChange={handleSortChange}
            onFiltersChange={handleFiltersChange}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomReportsBuilder;