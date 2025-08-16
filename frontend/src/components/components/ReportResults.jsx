import React, { useMemo } from 'react';
import { Save, Download } from 'lucide-react';
import ViewTypeSelector from './ViewTypeSelector';
import DataTable from './DataTable';
import { formatApiResults, getTableColumns } from '../utils/dataFormatting';
import { apiService } from '../../services/api';

const ReportResults = ({ 
  results, 
  measure, 
  viewType, 
  sortConfig, 
  isLoading,
  filters,
  onViewTypeChange, 
  onSortChange,
  onFiltersChange,
  onResultsChange
}) => {
  const sortedData = useMemo(() => {
    if (results.length === 0) return [];

    const formattedData = formatApiResults(results);

    if (!sortConfig.column) return formattedData;

    const getValueForSorting = (item, column) => {
      const columnMap = {
        'Team': 'team', 'Name': 'name', 'TEAM': 'team', 'AGE': 'age',
        'Games Played': 'gamesPlayed', 'Wins': 'wins', 'Losses': 'losses', 'Win %': 'winPct',
        'PTS': 'pts', 'MINS': 'mins', 'FGM': 'fgm', 'FGA': 'fga', 'FG%': 'fg_pct',
        '3PM': 'tpm', '3PA': 'tpa', '3P%': 'tp_pct',
        'FTM': 'ftm', 'FTA': 'fta', 'FT%': 'ft_pct',
        'OREB': 'oreb', 'DREB': 'dreb', 'REB': 'reb',
        'AST': 'ast', 'TOV': 'tov', 'STL': 'stl', 'BLK': 'blk', 'PF': 'pf', '+/-': 'plusMinus',
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

    return sortedResults;
  }, [results, sortConfig]);

  const handleSort = (column) => {
    let direction = 'desc';
    if (sortConfig.column === column && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    onSortChange({ column, direction });
  };

  const handleViewChange = async (newViewType) => {
    // Update view type immediately for UI feedback
    onViewTypeChange(newViewType);
    
    // Set default sort for new view
    let newSortConfig = null;
    if (measure === 'Players') {
      newSortConfig = { 
        column: newViewType === 'advanced' ? 'Offensive Rating' : 'PTS', 
        direction: 'desc' 
      };
    } else if (measure === 'Teams') {
      newSortConfig = { 
        column: newViewType === 'advanced' ? 'Net Rating' : 'Wins', 
        direction: 'desc' 
      };
    }
    
    if (newSortConfig) {
      onSortChange(newSortConfig);
    }

    // Regenerate report with new view type - this is essential because
    // traditional and advanced views query different database tables
    try {
      const reportConfig = {
        measure,
        filters: filters.map(filter => ({
          type: filter.type,
          operator: filter.operator,
          value: filter.value,
          value2: filter.value2,
          values: filter.values
        })),
        sortConfig: newSortConfig,
        viewType: newViewType
      };

      console.log('Regenerating report for view change:', reportConfig);
      const response = await apiService.generateReport(reportConfig);
      
      if (response.success && response.results) {
        onResultsChange(response.results);
        console.log(`Report regenerated: ${response.count} results for ${newViewType} view`);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to regenerate report:', error);
      // Could add error handling here - perhaps show a toast or revert view type
    }
  };

  if (results.length === 0) return null;

  const columns = getTableColumns(viewType, measure);

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

      <ViewTypeSelector 
        viewType={viewType}
        onViewTypeChange={handleViewChange}
        isLoading={isLoading}
      />

      <DataTable 
        data={sortedData}
        columns={columns}
        sortConfig={sortConfig}
        onSort={handleSort}
      />
    </div>
  );
};

export default ReportResults;