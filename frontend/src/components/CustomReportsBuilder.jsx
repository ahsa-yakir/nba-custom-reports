import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Zap, Save, Star, ArrowLeft, FolderOpen, Heart, ChevronRight, ChevronDown, ChevronUp, Minimize2, Maximize2, X, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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
  const { dashboardId } = useParams(); // Get dashboard ID from URL if present
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authService } = useAuth();

  // Get dashboard info from navigation state
  const dashboardName = location.state?.dashboardName;
  const isInDashboard = !!(dashboardId && user);

  // Consolidated report state
  const [reportState, setReportState] = useState({
    measure: '',
    filters: [],
    sortConfig: { column: null, direction: 'desc' },
    viewType: 'traditional',
    lastViewType: null
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

  // Save functionality state
  const [saveState, setSaveState] = useState({
    showSaveModal: false,
    saveName: '',
    saveDescription: '',
    isSaving: false,
    savedReports: []
  });

  // Multiple expanded reports state
  const [expandedReports, setExpandedReports] = useState(new Map());
  const [loadingReports, setLoadingReports] = useState(new Set());

  // Smart view detection with auto-switching
  const detectedViewType = useMemo(() => {
    return detectViewType(reportState.filters, dataCache.apiResponse);
  }, [reportState.filters, dataCache.apiResponse]);

  // Memoized sorted and filtered data
  const displayData = useMemo(() => {
    if (dataCache.formattedData.length === 0) return [];
    
    const viewFilteredData = filterDataByView(
      dataCache.formattedData, 
      reportState.viewType, 
      reportState.measure
    );
    
    return sortData(viewFilteredData, reportState.sortConfig);
  }, [dataCache.formattedData, reportState.viewType, reportState.measure, reportState.sortConfig]);

  // Load saved reports if in dashboard context
  useEffect(() => {
    if (isInDashboard) {
      loadSavedReports();
    }
  }, [dashboardId, isInDashboard]);

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

  const loadSavedReports = async () => {
    if (!isInDashboard) return;

    try {
      const response = await authService.apiRequest(`/dashboards/${dashboardId}/reports`);
      if (response.success) {
        setSaveState(prev => ({ 
          ...prev, 
          savedReports: response.reports 
        }));
      }
    } catch (error) {
      console.error('Failed to load saved reports:', error);
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
        viewType: 'unified'
      };

      const response = await apiService.generateReport(reportConfig);
      
      if (response.success && response.results) {
        console.log(`Unified report generated: ${response.count} results`);
        
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

        if (!reportState.sortConfig.column) {
          const defaultSort = getSmartDefaultSort(reportState.measure, response);
          setReportState(prev => ({ ...prev, sortConfig: defaultSort }));
        }

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

  const handleSaveReport = async () => {
    if (!isInDashboard || !saveState.saveName.trim()) return;

    setSaveState(prev => ({ ...prev, isSaving: true }));

    try {
      const reportData = {
        name: saveState.saveName.trim(),
        description: saveState.saveDescription.trim() || null,
        measure: reportState.measure,
        filters: reportState.filters,
        sortConfig: reportState.sortConfig,
        viewType: reportState.viewType
      };

      const response = await authService.apiRequest(`/dashboards/${dashboardId}/reports`, {
        method: 'POST',
        body: JSON.stringify(reportData)
      });

      if (response.success) {
        // Add the new report to our local state
        const newReport = {
          id: response.report.id,
          name: response.report.name,
          description: response.report.description,
          measure: response.report.measure,
          viewType: response.report.viewType,
          isFavorite: false,
          viewCount: 0,
          createdAt: response.report.createdAt,
          hasCachedData: response.report.hasCachedData
        };

        setSaveState(prev => ({ 
          ...prev, 
          savedReports: [newReport, ...prev.savedReports],
          showSaveModal: false,
          saveName: '',
          saveDescription: ''
        }));

        console.log('Report saved successfully:', response.report.name);
      }
    } catch (error) {
      console.error('Failed to save report:', error);
      setUiState(prev => ({ 
        ...prev, 
        apiError: 'Failed to save report: ' + error.message 
      }));
    } finally {
      setSaveState(prev => ({ ...prev, isSaving: false }));
    }
  };

  const handleLoadSavedReport = async (reportId, reportName) => {
    // Toggle expansion state
    const newExpandedReports = new Map(expandedReports);
    
    if (newExpandedReports.has(reportId)) {
      // Report is already expanded, toggle its minimized state
      const currentReport = newExpandedReports.get(reportId);
      newExpandedReports.set(reportId, {
        ...currentReport,
        minimized: !currentReport.minimized
      });
      setExpandedReports(newExpandedReports);
      return;
    }

    // Report is not expanded, load and expand it
    const newLoadingReports = new Set(loadingReports);
    newLoadingReports.add(reportId);
    setLoadingReports(newLoadingReports);

    try {
      const response = await authService.apiRequest(`/saved-reports/${reportId}`);

      if (response.success) {
        const report = response.report;
        
        // Format the data if available
        let formattedData = [];
        if (response.data) {
          formattedData = formatUnifiedResults(
            response.data,
            report.viewType,
            response.metadata
          );
        }

        // Add to expanded reports
        newExpandedReports.set(reportId, {
          id: reportId,
          name: report.name,
          description: report.description,
          measure: report.measure,
          filters: report.filters,
          sortConfig: report.sortConfig,
          viewType: report.viewType,
          data: formattedData,
          rawData: response.data,
          metadata: response.metadata,
          minimized: false,
          lastLoaded: new Date().toISOString(),
          hasCache: !!response.data
        });

        setExpandedReports(newExpandedReports);
        console.log('Loaded and expanded report:', report.name);
      }
    } catch (error) {
      console.error('Failed to load saved report:', error);
      setUiState(prev => ({ 
        ...prev, 
        apiError: 'Failed to load report: ' + error.message 
      }));
    } finally {
      newLoadingReports.delete(reportId);
      setLoadingReports(newLoadingReports);
    }
  };

  const handleCloseExpandedReport = (reportId) => {
    const newExpandedReports = new Map(expandedReports);
    newExpandedReports.delete(reportId);
    setExpandedReports(newExpandedReports);
  };

  const handleRefreshExpandedReport = async (reportId) => {
    const expandedReport = expandedReports.get(reportId);
    if (!expandedReport) return;

    const newLoadingReports = new Set(loadingReports);
    newLoadingReports.add(reportId);
    setLoadingReports(newLoadingReports);

    try {
      const response = await authService.apiRequest(`/saved-reports/${reportId}?regenerate=true`);

      if (response.success && response.data) {
        const formattedData = formatUnifiedResults(
          response.data,
          expandedReport.viewType,
          response.metadata
        );

        const newExpandedReports = new Map(expandedReports);
        newExpandedReports.set(reportId, {
          ...expandedReport,
          data: formattedData,
          rawData: response.data,
          metadata: response.metadata,
          lastLoaded: new Date().toISOString(),
          hasCache: true
        });

        setExpandedReports(newExpandedReports);
        console.log('Refreshed report:', expandedReport.name);
      }
    } catch (error) {
      console.error('Failed to refresh report:', error);
      setUiState(prev => ({ 
        ...prev, 
        apiError: 'Failed to refresh report: ' + error.message 
      }));
    } finally {
      newLoadingReports.delete(reportId);
      setLoadingReports(newLoadingReports);
    }
  };

  const getSmartDefaultSort = (measure, apiResponse) => {
    if (apiResponse?.queryMetadata?.activeColumns?.length > 0) {
      const activeColumns = apiResponse.queryMetadata.activeColumns;
      const numericColumn = activeColumns.find(col => 
        !['Name', 'Team', 'TEAM', 'AGE'].includes(col)
      );
      if (numericColumn) {
        return { column: numericColumn, direction: 'desc' };
      }
    }

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
      lastViewType: newViewType
    }));
  };

  const handleSortChange = (sortConfig) => {
    setReportState(prev => ({ ...prev, sortConfig }));
  };

  const handleFiltersChange = (filters) => {
    setReportState(prev => ({ 
      ...prev, 
      filters,
      lastViewType: null
    }));
    
    setDataCache(prev => ({ ...prev, isStale: true }));
  };

  const canGenerateReport = reportState.measure && 
    reportState.filters.length > 0 && 
    uiState.connectionStatus === 'connected';

  const canSaveReport = isInDashboard && canGenerateReport && displayData.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with Dashboard Context */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-gray-800">NBA Custom Reports</h1>
                
                {/* Dashboard breadcrumb */}
                {isInDashboard && (
                  <>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-600 font-medium">{dashboardName || 'Dashboard'}</span>
                    </div>
                  </>
                )}
              </div>
              
              {uiState.isAutoSwitching && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <Zap className="w-4 h-4" />
                  <span>Auto-switching view...</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Back to Dashboard button */}
              {isInDashboard && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Dashboards</span>
                </button>
              )}

              {/* Save Report button */}
              {canSaveReport && (
                <button
                  onClick={() => setSaveState(prev => ({ ...prev, showSaveModal: true }))}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Report</span>
                </button>
              )}
              
              <ConnectionStatus 
                status={uiState.connectionStatus}
                onRetry={testConnection}
              />
            </div>
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

          {/* Saved Reports Section (only show in dashboard context) */}
          {isInDashboard && saveState.savedReports.length > 0 && (
            <div className="bg-white rounded-lg border border-blue-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Star className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">Saved Reports in this Dashboard</h3>
                <span className="text-sm text-gray-500">
                  ({expandedReports.size} expanded)
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {saveState.savedReports.map((report) => {
                  const isExpanded = expandedReports.has(report.id);
                  const isLoading = loadingReports.has(report.id);
                  
                  return (
                    <div
                      key={report.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        isExpanded 
                          ? 'border-blue-500 bg-blue-50 shadow-md' 
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      onClick={() => !isLoading && handleLoadSavedReport(report.id, report.name)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 truncate">{report.name}</h4>
                        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                          {isLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                          {report.isFavorite && (
                            <Heart className="w-4 h-4 text-red-500 fill-current" />
                          )}
                          {isExpanded && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      
                      {report.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{report.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-1 rounded">{report.measure}</span>
                        <span>{report.viewCount} views</span>
                      </div>
                      
                      {report.hasCachedData && (
                        <div className="mt-2 text-xs text-green-600">⚡ Cached data available</div>
                      )}
                      
                      {isExpanded && (
                        <div className="mt-2 text-xs text-blue-600 font-medium">
                          ✓ Expanded below
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Expanded Reports Display */}
              {expandedReports.size > 0 && (
                <div className="space-y-6">
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Expanded Reports ({expandedReports.size})
                    </h4>
                    
                    {Array.from(expandedReports.values()).map((report) => {
                      const sortedData = report.data.length > 0 ? sortData(report.data, report.sortConfig) : [];
                      
                      return (
                        <div key={report.id} className="border border-gray-200 rounded-lg mb-6 bg-white shadow-sm">
                          {/* Report Header */}
                          <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newExpandedReports = new Map(expandedReports);
                                      newExpandedReports.set(report.id, {
                                        ...report,
                                        minimized: !report.minimized
                                      });
                                      setExpandedReports(newExpandedReports);
                                    }}
                                    className="p-1 text-gray-500 hover:text-gray-700"
                                  >
                                    {report.minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                                  </button>
                                  <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                    {report.measure}
                                  </span>
                                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                                    {report.viewType}
                                  </span>
                                  {report.hasCache && (
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                      ⚡ Cached
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRefreshExpandedReport(report.id);
                                  }}
                                  disabled={loadingReports.has(report.id)}
                                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Refresh report data"
                                >
                                  <RefreshCw className={`w-4 h-4 ${loadingReports.has(report.id) ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCloseExpandedReport(report.id);
                                  }}
                                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Close report"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            {report.description && (
                              <p className="text-sm text-gray-600 mt-2">{report.description}</p>
                            )}
                            
                            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                              <div className="flex items-center space-x-4">
                                <span>{report.filters.length} filters applied</span>
                                <span>{sortedData.length} results</span>
                                {report.lastLoaded && (
                                  <span>Updated: {new Date(report.lastLoaded).toLocaleTimeString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Report Content */}
                          {!report.minimized && (
                            <div className="p-4">
                              {loadingReports.has(report.id) ? (
                                <div className="flex items-center justify-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                                  <span className="text-gray-600">Loading report data...</span>
                                </div>
                              ) : sortedData.length > 0 ? (
                                <ReportResults
                                  results={sortedData}
                                  rawApiResponse={report.metadata}
                                  measure={report.measure}
                                  viewType={report.viewType}
                                  sortConfig={report.sortConfig}
                                  isLoading={false}
                                  filters={report.filters}
                                  detectedViewType={report.viewType}
                                  needsNewFetch={false}
                                  onViewTypeChange={(newViewType) => {
                                    const newExpandedReports = new Map(expandedReports);
                                    newExpandedReports.set(report.id, {
                                      ...report,
                                      viewType: newViewType
                                    });
                                    setExpandedReports(newExpandedReports);
                                  }}
                                  onSortChange={(newSortConfig) => {
                                    const newExpandedReports = new Map(expandedReports);
                                    newExpandedReports.set(report.id, {
                                      ...report,
                                      sortConfig: newSortConfig
                                    });
                                    setExpandedReports(newExpandedReports);
                                  }}
                                  onFiltersChange={() => {}} // Read-only for saved reports
                                />
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <p>No cached data available. Click refresh to load fresh data.</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
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

      {/* Save Report Modal */}
      {saveState.showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Report</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="reportName" className="block text-sm font-medium text-gray-700 mb-2">
                  Report Name *
                </label>
                <input
                  id="reportName"
                  type="text"
                  value={saveState.saveName}
                  onChange={(e) => setSaveState(prev => ({ ...prev, saveName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter report name"
                  maxLength={255}
                />
              </div>

              <div>
                <label htmlFor="reportDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  id="reportDescription"
                  value={saveState.saveDescription}
                  onChange={(e) => setSaveState(prev => ({ ...prev, saveDescription: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Report Summary:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Measure: {reportState.measure}</li>
                  <li>• Filters: {reportState.filters.length}</li>
                  <li>• View: {reportState.viewType}</li>
                  <li>• Results: {displayData.length} rows</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setSaveState(prev => ({ 
                  ...prev, 
                  showSaveModal: false, 
                  saveName: '', 
                  saveDescription: '' 
                }))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={saveState.isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReport}
                disabled={!saveState.saveName.trim() || saveState.isSaving}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saveState.isSaving ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Report'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomReportsBuilder;