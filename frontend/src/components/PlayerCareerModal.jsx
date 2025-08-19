import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, User, Trophy, Calendar, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { careerApiService } from '../services/careerApi';

const PlayerCareerModal = ({ isOpen, onClose, playerId, playerName }) => {
  const [careerData, setCareerData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('regular_season'); // Fixed: use 'regular_season' to match API
  const [chartStats, setChartStats] = useState({
    ppg: true,
    rpg: false,
    apg: false,
    spg: false,
    bpg: false,
    fg_pct: false,
    three_p_pct: false,
    ft_pct: false
  });

  const fetchCareerData = useCallback(async () => {
    console.log('Starting API call for player:', playerId);
    setIsLoading(true);
    setError(null);
    try {
      const data = await careerApiService.getPlayerCareerData(playerId);
      console.log('API response data:', data);
      setCareerData(data);
    } catch (err) {
      console.error('API call failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  // Fetch career data when modal opens
  useEffect(() => {
    console.log('useEffect triggered:', { isOpen, playerId });
    if (isOpen && playerId) {
      console.log('Conditions met, calling fetchCareerData');
      fetchCareerData();
    }
  }, [isOpen, playerId, fetchCareerData]);

  // Debug the data structure
  useEffect(() => {
    if (careerData) {
      console.log('Career data loaded:', careerData);
      console.log('Regular season data:', careerData?.season_stats?.regular_season);
      console.log('Active tab:', activeTab);
      console.log('Data for active tab:', careerData?.season_stats?.[activeTab]);
    }
  }, [careerData, activeTab]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!careerData?.season_stats?.[activeTab] || !Array.isArray(careerData.season_stats[activeTab])) {
      return [];
    }

    return careerData.season_stats[activeTab].map(season => ({
      season: season.season,
      ppg: parseFloat(season.ppg) || 0,
      rpg: parseFloat(season.rpg) || 0,
      apg: parseFloat(season.apg) || 0,
      spg: parseFloat(season.spg) || 0,
      bpg: parseFloat(season.bpg) || 0,
      fg_pct: parseFloat(season.fg_pct) || 0,
      three_p_pct: parseFloat(season.three_p_pct) || 0,
      ft_pct: parseFloat(season.ft_pct) || 0
    }));
  }, [careerData, activeTab]);

  // Calculate dynamic Y-axis domain and ticks
  const { yAxisDomain, yAxisTicks } = useMemo(() => {
    if (chartData.length === 0) return { yAxisDomain: [0, 10], yAxisTicks: [0, 5, 10] };

    const activeStatValues = [];
    Object.keys(chartStats).forEach(stat => {
      if (chartStats[stat]) {
        chartData.forEach(season => {
          if (season[stat] !== undefined && season[stat] !== null) {
            activeStatValues.push(season[stat]);
          }
        });
      }
    });

    if (activeStatValues.length === 0) return { yAxisDomain: [0, 10], yAxisTicks: [0, 5, 10] };

    const min = Math.min(...activeStatValues);
    const max = Math.max(...activeStatValues);
    
    let domainMin, domainMax, ticks;
    
    if (max <= 3) {
      // For low values (like blocks, steals), use simple 0 to ceiling
      domainMin = 0;
      domainMax = Math.ceil(max) || 1;
      ticks = Array.from({ length: domainMax + 1 }, (_, i) => i);
    } else if (max <= 10) {
      // For medium values, round to nearest whole number
      domainMin = 0;
      domainMax = Math.ceil(max);
      ticks = Array.from({ length: Math.min(domainMax + 1, 6) }, (_, i) => Math.round(i * domainMax / Math.min(domainMax, 5)));
    } else {
      // For high values (like points), use intervals of 5 or 10
      const interval = max <= 30 ? 5 : 10;
      domainMin = 0;
      domainMax = Math.ceil(max / interval) * interval;
      ticks = Array.from({ length: Math.floor(domainMax / interval) + 1 }, (_, i) => i * interval);
    }

    return { 
      yAxisDomain: [domainMin, domainMax], 
      yAxisTicks: ticks.filter(tick => tick >= domainMin && tick <= domainMax)
    };
  }, [chartData, chartStats]);

  const toggleStat = (stat) => {
    setChartStats(prev => ({ ...prev, [stat]: !prev[stat] }));
  };

  const getStatColor = (stat) => {
    const colors = {
      ppg: '#3B82F6',     // Blue
      rpg: '#10B981',     // Green
      apg: '#F59E0B',     // Yellow
      spg: '#EF4444',     // Red
      bpg: '#8B5CF6',     // Purple
      fg_pct: '#06B6D4',  // Cyan
      three_p_pct: '#F97316', // Orange
      ft_pct: '#EC4899'   // Pink
    };
    return colors[stat] || '#6B7280';
  };

  const formatPercentage = (value) => value ? `${value}%` : '0.0%';
  const formatNumber = (value) => value ? value.toLocaleString() : '0';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {playerName ? `${playerName} - Career Stats` : 'Player Career Stats'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600">Loading career data...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {careerData && (
            <div className="p-6 space-y-8">
              {/* Player Info Section */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-800">{careerData.player.name}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-gray-500">Team:</span>
                        <div className="font-semibold">{careerData.player.current_team.code}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Age:</span>
                        <div className="font-semibold">{careerData.player.age}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Position:</span>
                        <div className="font-semibold">{careerData.player.position}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Experience:</span>
                        <div className="font-semibold">{careerData.player.experience} years</div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              {/* Career Overview Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-6">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-xl font-bold text-gray-800">Career Overview</h3>
                </div>

                {careerData.career_stats.regular_season ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatNumber(careerData.career_stats.regular_season.total_points)}
                      </div>
                      <div className="text-sm text-gray-500">Career Points</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatNumber(careerData.career_stats.regular_season.total_rebounds)}
                      </div>
                      <div className="text-sm text-gray-500">Career Rebounds</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatNumber(careerData.career_stats.regular_season.total_assists)}
                      </div>
                      <div className="text-sm text-gray-500">Career Assists</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {formatNumber(careerData.career_stats.regular_season.total_steals)}
                      </div>
                      <div className="text-sm text-gray-500">Career Steals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatNumber(careerData.career_stats.regular_season.total_blocks)}
                      </div>
                      <div className="text-sm text-gray-500">Career Blocks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {formatNumber(careerData.career_stats.regular_season.total_minutes)}
                      </div>
                      <div className="text-sm text-gray-500">Career Minutes</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No career statistics available</p>
                )}

                {/* Career Shooting Percentages */}
                {careerData.career_stats.regular_season && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">
                          {formatPercentage(careerData.career_stats.regular_season.career_fg_pct * 100)}
                        </div>
                        <div className="text-sm text-gray-500">Career FG%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-orange-600">
                          {formatPercentage(careerData.career_stats.regular_season.career_3p_pct * 100)}
                        </div>
                        <div className="text-sm text-gray-500">Career 3P%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">
                          {formatPercentage(careerData.career_stats.regular_season.career_ft_pct * 100)}
                        </div>
                        <div className="text-sm text-gray-500">Career FT%</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Season by Season Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-6 h-6 text-blue-500" />
                    <h3 className="text-xl font-bold text-gray-800">Season by Season</h3>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveTab('regular_season')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'regular_season'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Regular Season
                    </button>
                    <button
                      onClick={() => setActiveTab('playoffs')}
                      disabled={!careerData?.metadata?.has_playoff_seasons}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'playoffs'
                          ? 'bg-blue-500 text-white'
                          : careerData?.metadata?.has_playoff_seasons
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Playoffs {!careerData?.metadata?.has_playoff_seasons && '(N/A)'}
                    </button>
                  </div>
                </div>

                {careerData?.season_stats?.[activeTab]?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Season</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Team</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500">GP</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500">PPG</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500">RPG</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500">APG</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500">SPG</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500">BPG</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500">FG%</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500">3P%</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500">FT%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {careerData?.season_stats?.[activeTab]?.map((season, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">{season.season}</td>
                            <td className="px-3 py-2 font-medium">{season.team}</td>
                            <td className="px-3 py-2 text-center">{season.gp}</td>
                            <td className="px-3 py-2 text-center">{season.ppg}</td>
                            <td className="px-3 py-2 text-center">{season.rpg}</td>
                            <td className="px-3 py-2 text-center">{season.apg}</td>
                            <td className="px-3 py-2 text-center">{season.spg}</td>
                            <td className="px-3 py-2 text-center">{season.bpg}</td>
                            <td className="px-3 py-2 text-center">{season.fg_pct}%</td>
                            <td className="px-3 py-2 text-center">{season.three_p_pct}%</td>
                            <td className="px-3 py-2 text-center">{season.ft_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No {activeTab === 'playoffs' ? 'playoff' : 'regular season'} data available
                  </p>
                )}
              </div>

              {/* Performance Chart Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-6">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                  <h3 className="text-xl font-bold text-gray-800">Performance Chart</h3>
                  <span className="text-sm text-gray-500">({activeTab === 'playoffs' ? 'Playoffs' : 'Regular Season'})</span>
                </div>

                {/* Chart Controls */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => toggleStat('ppg')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      chartStats.ppg
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ backgroundColor: chartStats.ppg ? getStatColor('ppg') : undefined }}
                  >
                    PPG
                  </button>
                  <button
                    onClick={() => toggleStat('rpg')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      chartStats.rpg
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ backgroundColor: chartStats.rpg ? getStatColor('rpg') : undefined }}
                  >
                    RPG
                  </button>
                  <button
                    onClick={() => toggleStat('apg')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      chartStats.apg
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ backgroundColor: chartStats.apg ? getStatColor('apg') : undefined }}
                  >
                    APG
                  </button>
                  <button
                    onClick={() => toggleStat('spg')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      chartStats.spg
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ backgroundColor: chartStats.spg ? getStatColor('spg') : undefined }}
                  >
                    SPG
                  </button>
                  <button
                    onClick={() => toggleStat('bpg')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      chartStats.bpg
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ backgroundColor: chartStats.bpg ? getStatColor('bpg') : undefined }}
                  >
                    BPG
                  </button>
                  <button
                    onClick={() => toggleStat('fg_pct')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      chartStats.fg_pct
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ backgroundColor: chartStats.fg_pct ? getStatColor('fg_pct') : undefined }}
                  >
                    FG%
                  </button>
                  <button
                    onClick={() => toggleStat('three_p_pct')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      chartStats.three_p_pct
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ backgroundColor: chartStats.three_p_pct ? getStatColor('three_p_pct') : undefined }}
                  >
                    3P%
                  </button>
                  <button
                    onClick={() => toggleStat('ft_pct')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      chartStats.ft_pct
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={{ backgroundColor: chartStats.ft_pct ? getStatColor('ft_pct') : undefined }}
                  >
                    FT%
                  </button>
                </div>

                {/* Chart */}
                {chartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="season" 
                          stroke="#6b7280"
                          fontSize={12}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          stroke="#6b7280"
                          fontSize={12}
                          domain={yAxisDomain}
                          ticks={yAxisTicks}
                          type="number"
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend />
                        
                        {chartStats.ppg && (
                          <Line
                            type="monotone"
                            dataKey="ppg"
                            stroke={getStatColor('ppg')}
                            strokeWidth={2}
                            dot={{ fill: getStatColor('ppg'), strokeWidth: 0, r: 4 }}
                            name="PPG"
                          />
                        )}
                        {chartStats.rpg && (
                          <Line
                            type="monotone"
                            dataKey="rpg"
                            stroke={getStatColor('rpg')}
                            strokeWidth={2}
                            dot={{ fill: getStatColor('rpg'), strokeWidth: 0, r: 4 }}
                            name="RPG"
                          />
                        )}
                        {chartStats.apg && (
                          <Line
                            type="monotone"
                            dataKey="apg"
                            stroke={getStatColor('apg')}
                            strokeWidth={2}
                            dot={{ fill: getStatColor('apg'), strokeWidth: 0, r: 4 }}
                            name="APG"
                          />
                        )}
                        {chartStats.spg && (
                          <Line
                            type="monotone"
                            dataKey="spg"
                            stroke={getStatColor('spg')}
                            strokeWidth={2}
                            dot={{ fill: getStatColor('spg'), strokeWidth: 0, r: 4 }}
                            name="SPG"
                          />
                        )}
                        {chartStats.bpg && (
                          <Line
                            type="monotone"
                            dataKey="bpg"
                            stroke={getStatColor('bpg')}
                            strokeWidth={2}
                            dot={{ fill: getStatColor('bpg'), strokeWidth: 0, r: 4 }}
                            name="BPG"
                          />
                        )}
                        {chartStats.fg_pct && (
                          <Line
                            type="monotone"
                            dataKey="fg_pct"
                            stroke={getStatColor('fg_pct')}
                            strokeWidth={2}
                            dot={{ fill: getStatColor('fg_pct'), strokeWidth: 0, r: 4 }}
                            name="FG%"
                          />
                        )}
                        {chartStats.three_p_pct && (
                          <Line
                            type="monotone"
                            dataKey="three_p_pct"
                            stroke={getStatColor('three_p_pct')}
                            strokeWidth={2}
                            dot={{ fill: getStatColor('three_p_pct'), strokeWidth: 0, r: 4 }}
                            name="3P%"
                          />
                        )}
                        {chartStats.ft_pct && (
                          <Line
                            type="monotone"
                            dataKey="ft_pct"
                            stroke={getStatColor('ft_pct')}
                            strokeWidth={2}
                            dot={{ fill: getStatColor('ft_pct'), strokeWidth: 0, r: 4 }}
                            name="FT%"
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No {activeTab === 'playoffs' ? 'playoff' : 'regular season'} data available for chart</p>
                    </div>
                  </div>
                )}

                {/* Chart Tips */}
                <div className="mt-4 text-xs text-gray-500">
                  <p>• Click the stat buttons above to toggle lines on/off</p>
                  <p>• Chart automatically adjusts Y-axis based on selected stats</p>
                  <p>• Switch between Regular Season and Playoffs using the tabs above</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerCareerModal;