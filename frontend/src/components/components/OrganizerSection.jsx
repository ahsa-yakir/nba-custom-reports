import React, { useState } from 'react';
import { Settings, WifiOff, AlertCircle, Calendar, Clock } from 'lucide-react';

const OrganizerSection = ({ 
  measure, 
  organizer, 
  connectionStatus, 
  onOrganizerChange,
  disabled 
}) => {
  const [errors, setErrors] = useState({});

  const validateOrganizer = (organizerData) => {
    const newErrors = {};
    
    switch (organizerData.type) {
      case 'last_games':
        if (!organizerData.value || organizerData.value < 1 || organizerData.value > 82) {
          newErrors.value = 'Must be between 1 and 82 games';
        }
        break;
      case 'game_range':
        if (!organizerData.from || organizerData.from < 1 || organizerData.from > 82) {
          newErrors.from = 'Must be between 1 and 82';
        }
        if (!organizerData.to || organizerData.to < 1 || organizerData.to > 82) {
          newErrors.to = 'Must be between 1 and 82';
        }
        if (organizerData.from && organizerData.to && organizerData.from > organizerData.to) {
          newErrors.range = 'From game must be less than or equal to To game';
        }
        break;
      case 'home_away':
        if (!organizerData.gameType || !['home', 'away'].includes(organizerData.gameType)) {
          newErrors.gameType = 'Must select Home or Away';
        }
        break;
      case 'last_period':
        if (!organizerData.period || !['days', 'weeks', 'months'].includes(organizerData.period)) {
          newErrors.period = 'Must select Days, Weeks, or Months';
        }
        if (!organizerData.value || organizerData.value < 1) {
          newErrors.value = 'Must be at least 1';
        }
        // Period-specific limits
        if (organizerData.period === 'days' && organizerData.value > 365) {
          newErrors.value = 'Cannot exceed 365 days';
        }
        if (organizerData.period === 'weeks' && organizerData.value > 52) {
          newErrors.value = 'Cannot exceed 52 weeks';
        }
        if (organizerData.period === 'months' && organizerData.value > 12) {
          newErrors.value = 'Cannot exceed 12 months';
        }
        break;
      case 'date_range':
        if (!organizerData.fromDate) {
          newErrors.fromDate = 'From date is required';
        }
        if (!organizerData.toDate) {
          newErrors.toDate = 'To date is required';
        }
        if (organizerData.fromDate && organizerData.toDate) {
          const fromDate = new Date(organizerData.fromDate);
          const toDate = new Date(organizerData.toDate);
          
          if (isNaN(fromDate.getTime())) {
            newErrors.fromDate = 'Invalid date format';
          }
          if (isNaN(toDate.getTime())) {
            newErrors.toDate = 'Invalid date format';
          }
          
          if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime()) && fromDate > toDate) {
            newErrors.dateRange = 'From date must be before or equal to To date';
          }
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOrganizerChange = (field, value) => {
    let newOrganizer;
    
    if (field === 'type') {
      // Reset organizer when type changes
      switch (value) {
        case 'all_games':
          newOrganizer = { type: 'all_games' };
          break;
        case 'last_games':
          newOrganizer = { type: 'last_games', value: 5 };
          break;
        case 'game_range':
          newOrganizer = { type: 'game_range', from: 1, to: 10 };
          break;
        case 'home_away':
          newOrganizer = { type: 'home_away', gameType: 'home' };
          break;
        case 'last_period':
          newOrganizer = { type: 'last_period', period: 'days', value: 7 };
          break;
        case 'date_range':
          // Set default dates to last month
          const today = new Date();
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
          newOrganizer = { 
            type: 'date_range', 
            fromDate: lastMonth.toISOString().split('T')[0],
            toDate: today.toISOString().split('T')[0]
          };
          break;
        default:
          newOrganizer = { type: 'all_games' };
      }
    } else {
      // Update specific field
      newOrganizer = { ...organizer, [field]: value };
    }
    
    if (validateOrganizer(newOrganizer)) {
      onOrganizerChange(newOrganizer);
    } else {
      // Still call onChange to update UI, validation will show errors
      onOrganizerChange(newOrganizer);
    }
  };

  const getOrganizerDescription = () => {
    if (!organizer || !organizer.type) return 'All Games';
    
    switch (organizer.type) {
      case 'all_games':
        return 'All Games';
      case 'last_games':
        return `Last ${organizer.value || 0} games player has played`;
      case 'game_range':
        return `Games ${organizer.from || 0} to ${organizer.to || 0}`;
      case 'home_away':
        return `${organizer.gameType === 'home' ? 'Home' : 'Away'} Games`;
      case 'last_period':
        const periodLabel = organizer.value === 1 
          ? organizer.period?.slice(0, -1) // Remove 's' for singular
          : organizer.period;
        return `Last ${organizer.value || 0} ${periodLabel || 'period'}`;
      case 'date_range':
        return `${organizer.fromDate || 'start'} to ${organizer.toDate || 'end'}`;
      default:
        return 'All Games';
    }
  };

  const renderOrganizerControls = () => {
    if (!organizer || !organizer.type || organizer.type === 'all_games') {
      return null;
    }

    switch (organizer.type) {
      case 'last_games':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Games
              </label>
              <input
                type="number"
                min="1"
                max="82"
                value={organizer.value || ''}
                onChange={(e) => handleOrganizerChange('value', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.value ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., 5"
                disabled={disabled}
              />
              {errors.value && (
                <p className="text-red-500 text-xs mt-1">{errors.value}</p>
              )}
            </div>
          </div>
        );

      case 'game_range':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Game
                </label>
                <input
                  type="number"
                  min="1"
                  max="82"
                  value={organizer.from || ''}
                  onChange={(e) => handleOrganizerChange('from', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.from ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1"
                  disabled={disabled}
                />
                {errors.from && (
                  <p className="text-red-500 text-xs mt-1">{errors.from}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Game
                </label>
                <input
                  type="number"
                  min="1"
                  max="82"
                  value={organizer.to || ''}
                  onChange={(e) => handleOrganizerChange('to', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.to ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="10"
                  disabled={disabled}
                />
                {errors.to && (
                  <p className="text-red-500 text-xs mt-1">{errors.to}</p>
                )}
              </div>
            </div>
            {errors.range && (
              <p className="text-red-500 text-xs">{errors.range}</p>
            )}
            <p className="text-xs text-gray-500">
              Show averages from games within this range (e.g., games 10-20 of the season)
            </p>
          </div>
        );

      case 'home_away':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Game Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gameType"
                    value="home"
                    checked={organizer.gameType === 'home'}
                    onChange={(e) => handleOrganizerChange('gameType', e.target.value)}
                    className="mr-2"
                    disabled={disabled}
                  />
                  Home Games
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="gameType"
                    value="away"
                    checked={organizer.gameType === 'away'}
                    onChange={(e) => handleOrganizerChange('gameType', e.target.value)}
                    className="mr-2"
                    disabled={disabled}
                  />
                  Away Games
                </label>
              </div>
              {errors.gameType && (
                <p className="text-red-500 text-xs mt-1">{errors.gameType}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Show averages from home or away games only
              </p>
            </div>
          </div>
        );

      case 'last_period':
        return (
          <div className="space-y-3">         
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value
                </label>
                <input
                  type="number"
                  min="1"
                  value={organizer.value || ''}
                  onChange={(e) => handleOrganizerChange('value', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.value ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="7"
                  disabled={disabled}
                />
                {errors.value && (
                  <p className="text-red-500 text-xs mt-1">{errors.value}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period
                </label>
                <select
                  value={organizer.period || 'days'}
                  onChange={(e) => handleOrganizerChange('period', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.period ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={disabled}
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
                {errors.period && (
                  <p className="text-red-500 text-xs mt-1">{errors.period}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Shows averages from games played within the specified time period from the most recent game
            </p>
          </div>
        );

      case 'date_range':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">NEW: Date range organizer</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={organizer.fromDate || ''}
                  onChange={(e) => handleOrganizerChange('fromDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.fromDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={disabled}
                />
                {errors.fromDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.fromDate}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={organizer.toDate || ''}
                  onChange={(e) => handleOrganizerChange('toDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.toDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={disabled}
                />
                {errors.toDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.toDate}</p>
                )}
              </div>
            </div>
            
            {errors.dateRange && (
              <p className="text-red-500 text-xs">{errors.dateRange}</p>
            )}
            
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="text-xs text-green-800">
                <span className="font-medium">📅 Date Range:</span> {getOrganizerDescription()}
                <br />
                <span className="font-medium">🎯 Logic:</span> Only games played between these specific dates
              </p>
            </div>
            
            <p className="text-xs text-gray-500">
              Shows averages from games played within the specified date range
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg border-2 border-orange-200 p-6 min-h-96 flex flex-col">
      <div className="flex items-center space-x-2 mb-4">
        <Settings className="w-5 h-5 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-800">Organizer</h3>
        <span className="text-sm text-gray-500">(Game Scope)</span>
        {(organizer?.type === 'last_period' || organizer?.type === 'date_range') && (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">NEW</span>
        )}
      </div>
      
      {!measure && (
        <div className="text-center py-8 text-gray-500 flex-1 flex flex-col justify-center">
          <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Select a measure first to configure organizer options.</p>
        </div>
      )}

      {connectionStatus === 'failed' && (
        <div className="text-center py-8 text-gray-500 flex-1 flex flex-col justify-center">
          <WifiOff className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Connect to backend to use organizers.</p>
        </div>
      )}

      {measure && connectionStatus === 'connected' && (
        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Game Scope
            </label>
            <select
              value={organizer?.type || 'all_games'}
              onChange={(e) => handleOrganizerChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              disabled={disabled}
            >
              <option value="all_games">All Games (Season Average)</option>
              <option value="last_games">Last X Games</option>
              <option value="game_range">Game Range (X to Y)</option>
              <option value="home_away">Home/Away Games</option>
              <option value="last_period">Last X Days/Weeks/Months</option>
              <option value="date_range">Specific Date Range</option>
            </select>
          </div>

          {renderOrganizerControls()}

          {/* Show current configuration summary */}
          {organizer && organizer.type !== 'all_games' && (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg mt-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Current Configuration:</p>
              <p className="text-sm text-gray-600">{getOrganizerDescription()}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizerSection;