import React, { useState } from 'react';
import { Settings, WifiOff, AlertCircle } from 'lucide-react';

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
        return `Last ${organizer.value || 0} Games`;
      case 'game_range':
        return `Games ${organizer.from || 0} to ${organizer.to || 0}`;
      case 'home_away':
        return `${organizer.gameType === 'home' ? 'Home' : 'Away'} Games`;
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
              <p className="text-xs text-gray-500 mt-1">
                Show averages from each player's/team's most recent games
              </p>
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
            </select>
          </div>

          {renderOrganizerControls()}


        </div>
      )}
    </div>
  );
};

export default OrganizerSection;