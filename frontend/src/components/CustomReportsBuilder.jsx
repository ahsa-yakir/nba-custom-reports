import React, { useState, useEffect } from 'react';
import { X, Download, Play, Save, BarChart3, Filter, Target, Check, ChevronUp, ChevronDown, Wifi, WifiOff, Loader2, Eye } from 'lucide-react';
import { apiService } from '../services/api';

const CustomReportsBuilder = () => {
  // STATE MANAGEMENT
  const [measure, setMeasure] = useState('');
  const [filters, setFilters] = useState([]);
  const [reportResults, setReportResults] = useState([]);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'desc' });
  const [newFilter, setNewFilter] = useState({ 
    type: '', operator: '', value: '', value2: '', values: [] 
  });
  const [viewType, setViewType] = useState('traditional');

  // API INTEGRATION STATE
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [apiError, setApiError] = useState(null);
  const [teams, setTeams] = useState([]);

  // Auto-detect advanced view when advanced filters are added
  useEffect(() => {
    const hasAdvancedFilters = filters.some(filter => {
      const advancedFilterTypes = [
        'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %', 'True Shooting %',
        'Effective FG%', 'Assist %', 'Rebound %', 'Turnover %', 'PIE', 'Pace',
        'Assist Turnover Ratio', 'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %'
      ];
      return advancedFilterTypes.includes(filter.type);
    });
    
    if (hasAdvancedFilters && viewType === 'traditional') {
      setViewType('advanced');
    }
  }, [filters, viewType]);

  // CONNECTION TEST ON COMPONENT MOUNT
  useEffect(() => {
    testConnection();
    loadTeams();
  }, []);

  // API METHODS
  const testConnection = async () => {
    try {
      setConnectionStatus('testing');
      const result = await apiService.testConnection();
      
      if (result.status === 'connected') {
        setConnectionStatus('connected');
        setApiError(null);
        console.log('Backend connection successful');
      } else {
        setConnectionStatus('failed');
        setApiError(result.error);
      }
    } catch (error) {
      setConnectionStatus('failed');
      setApiError(error.message);
      console.error('Backend connection failed:', error.message);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await apiService.getTeams();
      if (response.success && response.teams) {
        setTeams(response.teams.map(team => team.team_code));
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      setTeams(['BOS', 'MIL', 'PHI', 'LAL', 'GSW', 'DAL', 'DEN', 'OKC']);
    }
  };

  // FILTER OPTIONS INCLUDING ADVANCED STATS
  const getFilterOptions = (measure) => {
    if (measure === 'Teams') {
      return [
        // Traditional team filters
        { type: 'Wins', operators: ['greater than', 'less than', 'between'] },
        { type: 'Games Played', operators: ['greater than', 'less than', 'between'] },
        { type: 'Points', operators: ['greater than', 'less than', 'between'] },
        { type: 'FGM', operators: ['greater than', 'less than', 'between'] },
        { type: 'FGA', operators: ['greater than', 'less than', 'between'] },
        { type: 'FG%', operators: ['greater than', 'less than', 'between'] },
        { type: '3PM', operators: ['greater than', 'less than', 'between'] },
        { type: 'FTM', operators: ['greater than', 'less than', 'between'] },
        { type: 'FTA', operators: ['greater than', 'less than', 'between'] },
        { type: 'FT%', operators: ['greater than', 'less than', 'between'] },
        { type: 'OREB', operators: ['greater than', 'less than', 'between'] },
        { type: 'DREB', operators: ['greater than', 'less than', 'between'] },
        { type: 'REB', operators: ['greater than', 'less than', 'between'] },
        { type: 'AST', operators: ['greater than', 'less than', 'between'] },
        { type: 'TOV', operators: ['greater than', 'less than', 'between'] },
        { type: 'STL', operators: ['greater than', 'less than', 'between'] },
        { type: 'BLK', operators: ['greater than', 'less than', 'between'] },
        { type: '+/-', operators: ['greater than', 'less than', 'between'] },
        
        // Advanced team filters
        { type: 'Offensive Rating', operators: ['greater than', 'less than', 'between'] },
        { type: 'Defensive Rating', operators: ['greater than', 'less than', 'between'] },
        { type: 'Net Rating', operators: ['greater than', 'less than', 'between'] },
        { type: 'True Shooting %', operators: ['greater than', 'less than', 'between'] },
        { type: 'Effective FG%', operators: ['greater than', 'less than', 'between'] },
        { type: 'Assist %', operators: ['greater than', 'less than', 'between'] },
        { type: 'Assist Turnover Ratio', operators: ['greater than', 'less than', 'between'] },
        { type: 'Offensive Rebound %', operators: ['greater than', 'less than', 'between'] },
        { type: 'Defensive Rebound %', operators: ['greater than', 'less than', 'between'] },
        { type: 'Rebound %', operators: ['greater than', 'less than', 'between'] },
        { type: 'Turnover %', operators: ['greater than', 'less than', 'between'] },
        { type: 'PIE', operators: ['greater than', 'less than', 'between'] },
        { type: 'Pace', operators: ['greater than', 'less than', 'between'] },
      ];
    } else if (measure === 'Players') {
      return [
        // Traditional player filters
        { type: 'Team', operators: ['equals', 'in'], options: teams },
        { type: 'Age', operators: ['greater than', 'less than', 'equals', 'between'] },
        { type: 'Games Played', operators: ['greater than', 'less than', 'between'] },
        { type: 'MINS', operators: ['greater than', 'less than', 'between'] },
        { type: 'PTS', operators: ['greater than', 'less than', 'between'] },
        { type: 'FGM', operators: ['greater than', 'less than', 'between'] },
        { type: 'FGA', operators: ['greater than', 'less than', 'between'] },
        { type: 'FG%', operators: ['greater than', 'less than', 'between'] },
        { type: '3PM', operators: ['greater than', 'less than', 'between'] },
        { type: '3PA', operators: ['greater than', 'less than', 'between'] },
        { type: '3P%', operators: ['greater than', 'less than', 'between'] },
        { type: 'FTM', operators: ['greater than', 'less than', 'between'] },
        { type: 'FTA', operators: ['greater than', 'less than', 'between'] },
        { type: 'FT%', operators: ['greater than', 'less than', 'between'] },
        { type: 'OREB', operators: ['greater than', 'less than', 'between'] },
        { type: 'DREB', operators: ['greater than', 'less than', 'between'] },
        { type: 'REB', operators: ['greater than', 'less than', 'between'] },
        { type: 'AST', operators: ['greater than', 'less than', 'between'] },
        { type: 'TOV', operators: ['greater than', 'less than', 'between'] },
        { type: 'BLK', operators: ['greater than', 'less than', 'between'] },
        { type: 'PF', operators: ['greater than', 'less than', 'between'] },
        { type: '+/-', operators: ['greater than', 'less than', 'between'] },
        
        // Advanced player filters
        { type: 'Offensive Rating', operators: ['greater than', 'less than', 'between'] },
        { type: 'Defensive Rating', operators: ['greater than', 'less than', 'between'] },
        { type: 'Net Rating', operators: ['greater than', 'less than', 'between'] },
        { type: 'Usage %', operators: ['greater than', 'less than', 'between'] },
        { type: 'True Shooting %', operators: ['greater than', 'less than', 'between'] },
        { type: 'Effective FG%', operators: ['greater than', 'less than', 'between'] },
        { type: 'Assist %', operators: ['greater than', 'less than', 'between'] },
        { type: 'Assist Turnover Ratio', operators: ['greater than', 'less than', 'between'] },
        { type: 'Assist Ratio', operators: ['greater than', 'less than', 'between'] },
        { type: 'Offensive Rebound %', operators: ['greater than', 'less than', 'between'] },
        { type: 'Defensive Rebound %', operators: ['greater than', 'less than', 'between'] },
        { type: 'Rebound %', operators: ['greater than', 'less than', 'between'] },
        { type: 'Turnover %', operators: ['greater than', 'less than', 'between'] },
        { type: 'PIE', operators: ['greater than', 'less than', 'between'] },
        { type: 'Pace', operators: ['greater than', 'less than', 'between'] },
      ];
    }
    return [];
  };

  const addFilter = () => {
    if (!newFilter.type || !newFilter.operator) return;
    
    const filter = {
      id: Date.now(),
      type: newFilter.type,
      operator: newFilter.operator,
      value: newFilter.value,
      value2: newFilter.value2,
      values: newFilter.values
    };
    
    setFilters([...filters, filter]);
    setNewFilter({ type: '', operator: '', value: '', value2: '', values: [] });
  };

  const removeFilter = (filterId) => {
    setFilters(filters.filter(filter => filter.id !== filterId));
  };

  // REPORT GENERATION WITH VIEW TYPE
  const generateReport = async () => {
    if (!measure || filters.length === 0) return;

    setIsLoading(true);
    setApiError(null);

    try {
      console.log('Generating report...', { measure, filters, sortConfig, viewType });

      const reportConfig = {
        measure,
        filters: filters.map(filter => ({
          type: filter.type,
          operator: filter.operator,
          value: filter.value,
          value2: filter.value2,
          values: filter.values
        })),
        sortConfig: sortConfig.column ? sortConfig : null,
        viewType: viewType
      };

      const response = await apiService.generateReport(reportConfig);
      
      if (response.success && response.results) {
        console.log(`Report generated: ${response.count} results`);
        setReportResults(response.results);
        
        // Set default sorting if none specified
        if (!sortConfig.column) {
          if (measure === 'Players') {
            setSortConfig({ 
              column: viewType === 'advanced' ? 'Offensive Rating' : 'PTS', 
              direction: 'desc' 
            });
          } else if (measure === 'Teams') {
            setSortConfig({ 
              column: viewType === 'advanced' ? 'Net Rating' : 'Wins', 
              direction: 'desc' 
            });
          }
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      setApiError(error.message);
      setReportResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // FORMAT API RESULTS
  const formatApiResults = (results) => {
    return results.map(item => {
      // Debug log to see what we're getting from the API
      console.log('Raw API item:', item);
      
      const baseData = {
        name: item.name,
        team: item.team || item.team_code,
        age: parseInt(item.age) || 0,
        gamesPlayed: parseInt(item.games_played) || 0,
        mins: parseFloat(item.mins) || 0,
        wins: parseInt(item.wins) || 0,
        losses: parseInt(item.losses) || 0,
        winPct: parseFloat(item.win_pct) || 0,
        pts: parseFloat(item.pts) || 0,
        fgm: parseFloat(item.fgm) || 0,
        fga: parseFloat(item.fga) || 0,
        fg_pct: parseFloat(item.fg_pct) || 0,
        tpm: parseFloat(item.tpm) || 0,
        tpa: parseFloat(item.tpa) || 0,
        tp_pct: parseFloat(item.tp_pct) || 0,
        ftm: parseFloat(item.ftm) || 0,
        fta: parseFloat(item.fta) || 0,
        ft_pct: parseFloat(item.ft_pct) || 0,
        oreb: parseFloat(item.oreb) || 0,
        dreb: parseFloat(item.dreb) || 0,
        reb: parseFloat(item.reb) || 0,
        ast: parseFloat(item.ast) || 0,
        tov: parseFloat(item.tov) || 0,
        stl: parseFloat(item.stl) || 0,
        blk: parseFloat(item.blk) || 0,
        plusMinus: parseFloat(item.plus_minus) || 0
      };

      // Add advanced stats - the backend returns them with these exact names
      baseData.offensiveRating = parseFloat(item.offensive_rating) || 0;
      baseData.defensiveRating = parseFloat(item.defensive_rating) || 0;
      baseData.netRating = parseFloat(item.net_rating) || 0;
      baseData.usagePercentage = parseFloat(item.usage_percentage) || 0;
      baseData.trueShootingPercentage = parseFloat(item.true_shooting_percentage) || 0;
      baseData.effectiveFieldGoalPercentage = parseFloat(item.effective_field_goal_percentage) || 0;
      baseData.assistPercentage = parseFloat(item.assist_percentage) || 0;
      baseData.assistTurnoverRatio = parseFloat(item.assist_turnover_ratio) || 0;
      baseData.assistRatio = parseFloat(item.assist_ratio) || 0;
      baseData.offensiveReboundPercentage = parseFloat(item.offensive_rebound_percentage) || 0;
      baseData.defensiveReboundPercentage = parseFloat(item.defensive_rebound_percentage) || 0;
      baseData.reboundPercentage = parseFloat(item.rebound_percentage) || 0;
      baseData.turnoverPercentage = parseFloat(item.turnover_percentage) || 0;
      baseData.pie = parseFloat(item.pie) || 0;
      baseData.pace = parseFloat(item.pace) || 0;

      console.log('Formatted item:', baseData);
      return baseData;
    });
  };

  // SORTING
  const sortedData = React.useMemo(() => {
    if (reportResults.length === 0) return [];

    const formattedData = formatApiResults(reportResults);

    const getValueForSorting = (item, column) => {
      const columnMap = {
        // Traditional columns
        'Team': 'team', 'Name': 'name', 'TEAM': 'team', 'AGE': 'age',
        'Games Played': 'gamesPlayed', 'Wins': 'wins', 'Losses': 'losses', 'Win %': 'winPct',
        'PTS': 'pts', 'MINS': 'mins', 'FGM': 'fgm', 'FGA': 'fga', 'FG%': 'fg_pct',
        '3PM': 'tpm', '3PA': 'tpa', '3P%': 'tp_pct',
        'FTM': 'ftm', 'FTA': 'fta', 'FT%': 'ft_pct',
        'OREB': 'oreb', 'DREB': 'dreb', 'REB': 'reb',
        'AST': 'ast', 'TOV': 'tov', 'STL': 'stl', 'BLK': 'blk', '+/-': 'plusMinus',
        
        // Advanced columns
        'Offensive Rating': 'offensiveRating',
        'Defensive Rating': 'defensiveRating',
        'Net Rating': 'netRating',
        'Usage %': 'usagePercentage',
        'True Shooting %': 'trueShootingPercentage',
        'Effective FG%': 'effectiveFieldGoalPercentage',
        'Assist %': 'assistPercentage',
        'Assist Turnover Ratio': 'assistTurnoverRatio',
        'Assist Ratio': 'assistRatio',
        'Offensive Rebound %': 'offensiveReboundPercentage',
        'Defensive Rebound %': 'defensiveReboundPercentage',
        'Rebound %': 'reboundPercentage',
        'Turnover %': 'turnoverPercentage',
        'PIE': 'pie',
        'Pace': 'pace'
      };
      
      return item[columnMap[column]] || '';
    };

    let sortedResults = [...formattedData];

    if (sortConfig.column) {
      sortedResults.sort((a, b) => {
        const aValue = getValueForSorting(a, sortConfig.column);
        const bValue = getValueForSorting(b, sortConfig.column);

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        } else {
          const comparison = (parseFloat(aValue) || 0) - (parseFloat(bValue) || 0);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }
      });
    }

    return sortedResults;
  }, [reportResults, sortConfig]);

  const handleSort = (column) => {
    let direction = 'desc';
    if (sortConfig.column === column && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ column, direction });
  };

  // CONNECTION STATUS INDICATOR
  const renderConnectionStatus = () => {
    const getStatusConfig = () => {
      switch (connectionStatus) {
        case 'connected':
          return { icon: Wifi, color: 'text-green-600', bg: 'bg-green-100', text: 'Connected' };
        case 'failed':
          return { icon: WifiOff, color: 'text-red-600', bg: 'bg-red-100', text: 'Disconnected' };
        case 'testing':
          return { icon: Loader2, color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Testing...' };
        default:
          return { icon: WifiOff, color: 'text-gray-600', bg: 'bg-gray-100', text: 'Unknown' };
      }
    };

    const { icon: Icon, color, bg, text } = getStatusConfig();

    return (
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${bg} ${color}`}>
        <Icon className={`w-4 h-4 ${connectionStatus === 'testing' ? 'animate-spin' : ''}`} />
        <span>{text}</span>
        {connectionStatus === 'failed' && (
          <button
            onClick={testConnection}
            className="ml-2 text-xs underline hover:no-underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  };

  // ERROR DISPLAY
  const renderError = () => {
    if (!apiError) return null;

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <X className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">API Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{apiError}</p>
              {connectionStatus === 'failed' && (
                <p className="mt-2">
                  Make sure your backend server is running on port 3001. 
                  <button 
                    onClick={testConnection}
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

  // MEASURE SECTION
  const renderMeasureSection = () => (
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
                onChange={(e) => setMeasure(e.target.value)}
                className="mr-2"
                disabled={connectionStatus === 'failed'}
              />
              Players
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="measure"
                value="Teams"
                checked={measure === 'Teams'}
                onChange={(e) => setMeasure(e.target.value)}
                className="mr-2"
                disabled={connectionStatus === 'failed'}
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

  // FILTER SECTION
  const renderFilterSection = () => {
    const filterOptions = getFilterOptions(measure);
    
    return (
      <div className="bg-white rounded-lg border-2 border-green-200 p-6 min-h-96">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filters *</h3>
          <span className="text-sm text-gray-500">(At least one required)</span>
        </div>

        {measure && connectionStatus === 'connected' && (
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Add Filter:</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter Type</label>
                <select
                  value={newFilter.type}
                  onChange={(e) => setNewFilter({ 
                    ...newFilter, 
                    type: e.target.value, 
                    operator: '', 
                    value: '', 
                    value2: '', 
                    values: [] 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Type</option>
                  {filterOptions.map(option => (
                    <option key={option.type} value={option.type}>{option.type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                <select
                  value={newFilter.operator}
                  onChange={(e) => setNewFilter({ 
                    ...newFilter, 
                    operator: e.target.value, 
                    value: '', 
                    value2: '', 
                    values: [] 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  disabled={!newFilter.type}
                >
                  <option value="">Select Operator</option>
                  {newFilter.type && filterOptions.find(opt => opt.type === newFilter.type)?.operators.map(operator => (
                    <option key={operator} value={operator}>{operator}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                
                {newFilter.operator === 'in' ? (
                  <select
                    multiple
                    value={newFilter.values}
                    onChange={(e) => setNewFilter({ 
                      ...newFilter, 
                      values: Array.from(e.target.selectedOptions, option => option.value) 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20"
                  >
                    {filterOptions.find(opt => opt.type === newFilter.type)?.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : newFilter.operator === 'equals' && filterOptions.find(opt => opt.type === newFilter.type)?.options ? (
                  <select
                    value={newFilter.value}
                    onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Value</option>
                    {filterOptions.find(opt => opt.type === newFilter.type)?.options?.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : newFilter.operator === 'between' ? (
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={newFilter.value}
                      onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={newFilter.value2}
                      onChange={(e) => setNewFilter({ ...newFilter, value2: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                ) : (
                  <input
                    type="number"
                    placeholder="Enter value"
                    value={newFilter.value}
                    onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    disabled={!newFilter.operator}
                  />
                )}
              </div>

              <div className="flex items-end">
                <button
                  onClick={addFilter}
                  disabled={!newFilter.type || !newFilter.operator || 
                    (newFilter.operator === 'in' && newFilter.values.length === 0) ||
                    (newFilter.operator === 'between' && (!newFilter.value || !newFilter.value2)) ||
                    (!['in', 'between'].includes(newFilter.operator) && !newFilter.value)
                  }
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    newFilter.type && newFilter.operator && 
                    ((newFilter.operator === 'in' && newFilter.values.length > 0) ||
                     (newFilter.operator === 'between' && newFilter.value && newFilter.value2) ||
                     (!['in', 'between'].includes(newFilter.operator) && newFilter.value))
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {filters.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Active Filters:</h4>
            <div className="flex flex-wrap gap-2">
              {filters.map(filter => (
                <div key={filter.id} className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  <span>
                    {filter.type} {filter.operator} {filter.values?.length > 0 ? filter.values.join(', ') : 
                    filter.operator === 'between' ? `${filter.value}-${filter.value2}` : filter.value}
                  </span>
                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!measure && (
          <div className="text-center py-8 text-gray-500">
            <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Select a measure first to see available filters.</p>
          </div>
        )}

        {connectionStatus === 'failed' && (
          <div className="text-center py-8 text-gray-500">
            <WifiOff className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Connect to backend to use filters.</p>
          </div>
        )}
      </div>
    );
  };

  // VIEW TYPE DROPDOWN
  const renderViewTypeSelector = () => {
    if (reportResults.length === 0) return null;

    return (
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">View:</span>
        </div>
        <select
          value={viewType}
          onChange={(e) => setViewType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="traditional">Traditional Stats</option>
          <option value="advanced">Advanced Stats</option>
        </select>
      </div>
    );
  };

  // RESULTS TABLE
  const renderResults = () => {
    if (reportResults.length === 0) return null;

    const getColumns = () => {
      if (viewType === 'advanced') {
        if (measure === 'Teams') {
          return ['Team', 'Games Played', 'Offensive Rating', 'Defensive Rating', 'Net Rating', 'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %', 'Turnover %', 'PIE', 'Pace'];
        } else {
          return ['Name', 'TEAM', 'AGE', 'Games Played', 'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %', 'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio', 'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %', 'Turnover %', 'PIE', 'Pace'];
        }
      } else {
        if (measure === 'Teams') {
          return ['Team', 'Games Played', 'Wins', 'Losses', 'Win %', 'PTS', 'FGM', 'FGA', 'FG%', '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB', 'AST', 'TOV', 'STL', 'BLK', '+/-'];
        } else {
          return ['Name', 'TEAM', 'AGE', 'Games Played', 'MINS', 'PTS', 'FGM', 'FGA', 'FG%', '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB', 'AST', 'TOV', 'STL', 'BLK', '+/-'];
        }
      }
    };

    const columns = getColumns();
    
    const formatValue = (value, column) => {
      if (column.includes('%') || column.includes('Rating') || column === 'PIE' || column === 'Pace') {
        return typeof value === 'number' ? value.toFixed(1) : value;
      }
      return typeof value === 'number' ? value.toFixed(1) : value;
    };

    const getValueForColumn = (item, column) => {
      const columnMap = {
        // Traditional columns
        'Team': 'team', 'Name': 'name', 'TEAM': 'team', 'AGE': 'age',
        'Games Played': 'gamesPlayed', 'Wins': 'wins', 'Losses': 'losses', 'Win %': 'winPct',
        'PTS': 'pts', 'MINS': 'mins', 'FGM': 'fgm', 'FGA': 'fga', 'FG%': 'fg_pct',
        '3PM': 'tpm', '3PA': 'tpa', '3P%': 'tp_pct',
        'FTM': 'ftm', 'FTA': 'fta', 'FT%': 'ft_pct',
        'OREB': 'oreb', 'DREB': 'dreb', 'REB': 'reb',
        'AST': 'ast', 'TOV': 'tov', 'STL': 'stl', 'BLK': 'blk', '+/-': 'plusMinus',
        
        // Advanced columns
        'Offensive Rating': 'offensiveRating',
        'Defensive Rating': 'defensiveRating',
        'Net Rating': 'netRating',
        'Usage %': 'usagePercentage',
        'True Shooting %': 'trueShootingPercentage',
        'Effective FG%': 'effectiveFieldGoalPercentage',
        'Assist %': 'assistPercentage',
        'Assist Turnover Ratio': 'assistTurnoverRatio',
        'Assist Ratio': 'assistRatio',
        'Offensive Rebound %': 'offensiveReboundPercentage',
        'Defensive Rebound %': 'defensiveReboundPercentage',
        'Rebound %': 'reboundPercentage',
        'Turnover %': 'turnoverPercentage',
        'PIE': 'pie',
        'Pace': 'pace'
      };
      return item[columnMap[column]] || '';
    };

    const getSortIcon = (column) => {
      if (sortConfig.column !== column) {
        return <div className="w-4 h-4"></div>;
      }
      return sortConfig.direction === 'asc' ? 
        <ChevronUp className="w-4 h-4 text-blue-600" /> : 
        <ChevronDown className="w-4 h-4 text-blue-600" />;
    };

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Report Results</h3>
          <div className="flex space-x-2">
            <button className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
              <Save className="w-4 h-4" />
              <span>Save Report</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {renderViewTypeSelector()}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {columns.map(column => (
                  <th 
                    key={column} 
                    className={`text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none ${
                      sortConfig.column === column ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column}</span>
                      {getSortIcon(column)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  {columns.map(column => (
                    <td key={column} className="py-3 px-4">
                      {formatValue(getValueForColumn(item, column), column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Check if report can be generated
  const canGenerateReport = measure && filters.length > 0 && connectionStatus === 'connected';

  // MAIN COMPONENT RENDER
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Application Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-800">NBA Custom Reports</h1>
            </div>
            
            {/* Connection Status in Header */}
            <div className="flex items-center space-x-4">
              {renderConnectionStatus()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          
          {/* API Error Display */}
          {renderError()}
          
          {/* Report Builder Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            <div className="lg:col-span-1">
              {renderMeasureSection()}
            </div>

            <div className="lg:col-span-3">
              {renderFilterSection()}
            </div>
          </div>

          {/* Generate Report Button */}
          <div className="flex justify-center">
            <button
              onClick={generateReport}
              disabled={!canGenerateReport || isLoading}
              className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-semibold transition-colors ${
                canGenerateReport && !isLoading
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

          {/* Requirements Warning */}
          {!canGenerateReport && !isLoading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Requirements Missing</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      {connectionStatus === 'failed' && <li>Backend connection required</li>}
                      {!measure && <li>Select a Measure (Players or Teams)</li>}
                      {filters.length === 0 && <li>Add at least one Filter</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Report Results Table */}
          {renderResults()}
        </div>
      </div>
    </div>
  );
};

export default CustomReportsBuilder;