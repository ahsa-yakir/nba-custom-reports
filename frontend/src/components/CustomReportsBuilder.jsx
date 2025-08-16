import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { apiService } from '../services/api';
import { isAdvancedFilterType } from './utils/filterOptions';
import ConnectionStatus from './components/ConnectionStatus';
import ErrorDisplay from './components/ErrorDisplay';
import MeasureSection from './components/MeasureSection';
import FilterSection from './components/FilterSection';
import GenerateReportButton from './components/GenerateReportButton';
import RequirementsWarning from './components/RequirementsWarning';
import ReportResults from './components/ReportResults';

const CustomReportsBuilder = () => {
  // Consolidated state
  const [reportState, setReportState] = useState({
    measure: '',
    filters: [],
    reportResults: [],
    sortConfig: { column: null, direction: 'desc' },
    viewType: 'traditional'
  });

  const [uiState, setUiState] = useState({
    isLoading: false,
    connectionStatus: 'unknown',
    apiError: null,
    teams: []
  });

  // Auto-detect advanced view
  useEffect(() => {
    const hasAdvancedFilters = reportState.filters.some(filter => 
      isAdvancedFilterType(filter.type)
    );
    
    if (hasAdvancedFilters && reportState.viewType === 'traditional') {
      setReportState(prev => ({ ...prev, viewType: 'advanced' }));
    }
  }, [reportState.filters, reportState.viewType]);

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
      console.log('Generating report...', { 
        measure: reportState.measure, 
        filters: reportState.filters, 
        sortConfig: reportState.sortConfig, 
        viewType: reportState.viewType 
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
        viewType: reportState.viewType
      };

      const response = await apiService.generateReport(reportConfig);
      
      if (response.success && response.results) {
        console.log(`Report generated: ${response.count} results`);
        setReportState(prev => ({ ...prev, reportResults: response.results }));
        
        // Set default sorting if none specified
        if (!reportState.sortConfig.column) {
          const defaultSort = reportState.measure === 'Players' 
            ? { column: reportState.viewType === 'advanced' ? 'Offensive Rating' : 'PTS', direction: 'desc' }
            : { column: reportState.viewType === 'advanced' ? 'Net Rating' : 'Wins', direction: 'desc' };
          
          setReportState(prev => ({ ...prev, sortConfig: defaultSort }));
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      setUiState(prev => ({ ...prev, apiError: error.message }));
      setReportState(prev => ({ ...prev, reportResults: [] }));
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
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
                onMeasureChange={(measure) => 
                  setReportState(prev => ({ ...prev, measure }))
                }
                disabled={uiState.connectionStatus === 'failed'}
              />
            </div>

            <div className="lg:col-span-3">
              <FilterSection
                measure={reportState.measure}
                filters={reportState.filters}
                teams={uiState.teams}
                connectionStatus={uiState.connectionStatus}
                onFiltersChange={(filters) => 
                  setReportState(prev => ({ ...prev, filters }))
                }
              />
            </div>
          </div>

          <GenerateReportButton
            canGenerate={canGenerateReport}
            isLoading={uiState.isLoading}
            onGenerate={generateReport}
          />

          <RequirementsWarning
            canGenerate={canGenerateReport}
            isLoading={uiState.isLoading}
            connectionStatus={uiState.connectionStatus}
            measure={reportState.measure}
            filtersCount={reportState.filters.length}
          />

          <ReportResults
            results={reportState.reportResults}
            measure={reportState.measure}
            viewType={reportState.viewType}
            sortConfig={reportState.sortConfig}
            isLoading={uiState.isLoading}
            filters={reportState.filters}
            onViewTypeChange={(viewType) => 
              setReportState(prev => ({ ...prev, viewType }))
            }
            onSortChange={(sortConfig) => 
              setReportState(prev => ({ ...prev, sortConfig }))
            }
            onFiltersChange={(filters) => 
              setReportState(prev => ({ ...prev, filters }))
            }
            onResultsChange={(results) =>
              setReportState(prev => ({ ...prev, reportResults: results }))
            }
          />
        </div>
      </div>
    </div>
  );
};

export default CustomReportsBuilder;