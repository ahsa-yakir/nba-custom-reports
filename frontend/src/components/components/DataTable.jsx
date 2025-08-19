import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Minus, Info } from 'lucide-react';
import { getValueForColumn, formatTableValue } from '../utils/dataFormatting';
import { getColumnKey, getColumnTooltip } from '../utils/columnManager';
import PlayerCareerModal from '../PlayerCareerModal';

const DataTable = ({ 
  data, 
  columns, 
  columnMetadata, 
  sortConfig, 
  viewType, 
  measure, 
  onSort, 
  isLoading 
}) => {
  const [careerModal, setCareerModal] = useState({
    isOpen: false,
    playerId: null,
    playerName: null
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-lg font-medium mb-2">No data available</div>
        <div className="text-sm">Try adjusting your filters or generating a new report.</div>
      </div>
    );
  }

  const getSortIcon = (column) => {
    if (sortConfig.column !== column) {
      return <Minus className="w-4 h-4 text-gray-300" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-500" />
      : <ChevronDown className="w-4 h-4 text-blue-500" />;
  };

  const getCellClassName = (column, value) => {
    let baseClass = "px-4 py-3 text-sm";
    
    // Add fixed width classes based on column type
    if (['Name'].includes(column)) {
      baseClass += " text-left font-medium w-48 min-w-48 max-w-48";
    } else if (['Team', 'TEAM'].includes(column)) {
      baseClass += " text-left font-medium w-16 min-w-16 max-w-16";
    } else if (['AGE', 'Age'].includes(column)) {
      baseClass += " text-right w-16 min-w-16 max-w-16";
    } else if (['Games Played'].includes(column)) {
      baseClass += " text-right w-20 min-w-20 max-w-20";
    } else if (column.includes('%') || column.includes('Rating')) {
      baseClass += " text-right w-24 min-w-24 max-w-24";
    } else {
      baseClass += " text-right w-20 min-w-20 max-w-20";
    }

    // Highlight null/missing advanced stats
    if (viewType === 'advanced' && (value === null || value === undefined)) {
      baseClass += " text-gray-400";
    }

    return baseClass;
  };

  const handlePlayerClick = (item) => {
    // Only handle clicks for player names in Players measure
    if (measure !== 'Players') return;

    // Extract player ID and name from the item
    // Try multiple possible fields for player ID
    const playerId = item.player_id || item.id || item.playerId;
    const playerName = item.name || getValueForColumn(item, 'Name');

    if (playerId && playerName) {
      console.log('Opening career modal for:', { playerId, playerName });
      setCareerModal({
        isOpen: true,
        playerId: playerId,
        playerName: playerName
      });
    } else {
      console.warn('Unable to extract player ID for career modal', item);
      console.warn('Available fields:', Object.keys(item));
      
      // Fallback: try to use the player name as ID for search
      if (playerName) {
        console.log('Attempting fallback: using player name for search');
        // You could implement a search-by-name fallback here
        // For now, show an alert to the user
        alert(`Career data not available for ${playerName}. Player ID missing from data.`);
      }
    }
  };

  const renderCellValue = (item, column) => {
    const value = getValueForColumn(item, column);
    
    if (value === null || value === undefined) {
      return <span className="text-gray-400">-</span>;
    }

    const columnMeta = columnMetadata.find(m => m.key === column);
    const formattedValue = formatTableValue(value, column, columnMeta?.format);

    // Make player names clickable for Players measure
    if (column === 'Name' && measure === 'Players') {
      return (
        <button
          onClick={() => handlePlayerClick(item)}
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left font-medium"
          title={`View ${value}'s career stats`}
        >
          {formattedValue}
        </button>
      );
    }

    return formattedValue;
  };

  const closeCareerModal = () => {
    setCareerModal({
      isOpen: false,
      playerId: null,
      playerName: null
    });
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="divide-y divide-gray-200" style={{ width: 'auto', minWidth: 'min-content' }}>
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => {
                const columnMeta = columnMetadata.find(m => m.key === column);
                const tooltip = getColumnTooltip(column);
                
                // Get consistent width classes for headers
                let headerClass = "px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100";
                
                if (['Name'].includes(column)) {
                  headerClass += " text-left w-48 min-w-48 max-w-48";
                } else if (['Team', 'TEAM'].includes(column)) {
                  headerClass += " text-left w-16 min-w-16 max-w-16";
                } else if (['AGE', 'Age'].includes(column)) {
                  headerClass += " text-right w-16 min-w-16 max-w-16";
                } else if (['Games Played'].includes(column)) {
                  headerClass += " text-right w-20 min-w-20 max-w-20";
                } else if (column.includes('%') || column.includes('Rating')) {
                  headerClass += " text-right w-24 min-w-24 max-w-24";
                } else {
                  headerClass += " text-right w-20 min-w-20 max-w-20";
                }
                
                return (
                  <th
                    key={column}
                    className={headerClass}
                    onClick={() => onSort(column)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column}</span>
                      {tooltip && (
                        <div className="group relative">
                          <Info className="w-3 h-3 text-gray-400" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                            {tooltip}
                          </div>
                        </div>
                      )}
                      {getSortIcon(column)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr 
                key={index} 
                className={`hover:bg-gray-50 ${
                  item._has_advanced_data === false && viewType === 'advanced' 
                    ? 'bg-yellow-50' 
                    : ''
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column}
                    className={getCellClassName(column, getValueForColumn(item, column))}
                  >
                    {renderCellValue(item, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Table footer with metadata */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing {data.length} {measure.toLowerCase()}
            {viewType === 'custom' && ` with ${columns.length} selected columns`}
            {measure === 'Players' && (
              <span className="ml-2 text-blue-600">• Click player names to view career stats</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {viewType === 'advanced' && (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span>Limited advanced data</span>
              </div>
            )}
            <div>
              Sort: {sortConfig.column || 'Default'} {sortConfig.direction === 'asc' ? '↑' : '↓'}
            </div>
          </div>
        </div>
      </div>

      {/* Career Modal */}
      <PlayerCareerModal
        isOpen={careerModal.isOpen}
        onClose={closeCareerModal}
        playerId={careerModal.playerId}
        playerName={careerModal.playerName}
      />
    </>
  );
};

export default DataTable;