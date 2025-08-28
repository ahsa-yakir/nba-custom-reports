/**
 * Dashboard Page - Main dashboard selection and management
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Settings, 
  Star, 
  Clock, 
  BarChart3, 
  Users, 
  TrendingUp,
  Folder,
  LogOut,
  ChevronRight,
  AlertCircle,
  Trash2,
  Edit2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout, authService } = useAuth();
  
  const [dashboards, setDashboards] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateDashboard, setShowCreateDashboard] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState(null);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDescription, setNewDashboardDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [dashboardsResponse, recentReportsResponse] = await Promise.all([
        authService.apiRequest('/dashboards'),
        authService.apiRequest('/saved-reports/recent?limit=5')
      ]);

      if (dashboardsResponse.success) {
        setDashboards(dashboardsResponse.dashboards);
      }

      if (recentReportsResponse.success) {
        setRecentReports(recentReportsResponse.recentReports);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) return;

    try {
      setIsCreating(true);
      const response = await authService.apiRequest('/dashboards', {
        method: 'POST',
        body: JSON.stringify({
          name: newDashboardName.trim(),
          description: newDashboardDescription.trim() || null
        })
      });

      if (response.success) {
        // Ensure the new dashboard has proper stats structure
        const newDashboard = {
          ...response.dashboard,
          stats: {
            reportCount: 0,
            favoriteCount: 0,
            lastActivity: null
          }
        };
        
        setDashboards([...dashboards, newDashboard]);
        setNewDashboardName('');
        setNewDashboardDescription('');
        setShowCreateDashboard(false);
      }
    } catch (error) {
      console.error('Failed to create dashboard:', error);
      setError('Failed to create dashboard: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditDashboard = async (dashboardId, updates) => {
    try {
      const response = await authService.apiRequest(`/dashboards/${dashboardId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (response.success) {
        setDashboards(dashboards.map(d => 
          d.id === dashboardId ? { 
            ...d, 
            ...response.dashboard,
            stats: d.stats || { reportCount: 0, favoriteCount: 0, lastActivity: null }
          } : d
        ));
        setEditingDashboard(null);
        setNewDashboardName('');
        setNewDashboardDescription('');
      }
    } catch (error) {
      console.error('Failed to update dashboard:', error);
      setError('Failed to update dashboard: ' + error.message);
    }
  };

  const handleDeleteDashboard = async (dashboardId) => {
    if (!window.confirm('Are you sure you want to delete this dashboard? All saved reports will be lost.')) {
      return;
    }

    try {
      const response = await authService.apiRequest(`/dashboards/${dashboardId}`, {
        method: 'DELETE'
      });

      if (response.success) {
        setDashboards(dashboards.filter(d => d.id !== dashboardId));
      }
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
      setError('Failed to delete dashboard: ' + error.message);
    }
  };

  const handleEnterDashboard = (dashboard) => {
    navigate(`/dashboard/${dashboard.id}`, { 
      state: { dashboardName: dashboard.name } 
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getDefaultDashboard = () => {
    return dashboards.find(d => d.isDefault) || dashboards[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NBA Analytics</h1>
                <p className="text-sm text-gray-500">Welcome back, {user?.firstName || user?.username}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/reports')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Browse Reports
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
              <button 
                onClick={() => setError('')}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Default Dashboard Quick Access */}
          {getDefaultDashboard() && (
            <div 
              onClick={() => handleEnterDashboard(getDefaultDashboard())}
              className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white cursor-pointer hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <Star className="w-8 h-8" />
                <ChevronRight className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Enter Default Dashboard</h3>
              <p className="text-blue-100 text-sm">
                {getDefaultDashboard().name}
              </p>
              <div className="mt-4 text-xs text-blue-200">
                {getDefaultDashboard().stats?.reportCount || 0} reports saved
              </div>
            </div>
          )}

          {/* Create New Report */}
          <div 
            onClick={() => navigate('/reports')}
            className="bg-white rounded-lg p-6 border-2 border-dashed border-gray-300 hover:border-green-400 cursor-pointer transition-colors"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Report</h3>
              <p className="text-gray-600 text-sm">
                Build custom NBA analytics reports
              </p>
            </div>
          </div>

          {/* Browse All Reports */}
          <div 
            onClick={() => navigate('/reports')}
            className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Without Login</h3>
              <p className="text-gray-600 text-sm">
                Use the report builder without saving
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Dashboards Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Folder className="w-5 h-5 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Your Dashboards</h2>
                  </div>
                  <button
                    onClick={() => setShowCreateDashboard(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Dashboard</span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {dashboards.length === 0 ? (
                  <div className="text-center py-8">
                    <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Dashboards Yet</h3>
                    <p className="text-gray-600 mb-4">
                      Create your first dashboard to organize your NBA reports
                    </p>
                    <button
                      onClick={() => setShowCreateDashboard(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Dashboard
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboards.map((dashboard) => (
                      <div
                        key={dashboard.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => handleEnterDashboard(dashboard)}
                          >
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-medium text-gray-900">
                                {dashboard.name}
                              </h3>
                              {dashboard.isDefault && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <Star className="w-3 h-3 mr-1" />
                                  Default
                                </span>
                              )}
                            </div>
                            {dashboard.description && (
                              <p className="text-gray-600 text-sm mt-1">
                                {dashboard.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <span>{dashboard.stats?.reportCount || 0} reports</span>
                              <span>{dashboard.stats?.favoriteCount || 0} favorites</span>
                              {dashboard.stats?.lastActivity && (
                                <span>
                                  Last used {new Date(dashboard.stats.lastActivity).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingDashboard(dashboard);
                                setNewDashboardName(dashboard.name);
                                setNewDashboardDescription(dashboard.description || '');
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-100"
                              title="Edit dashboard"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {dashboards.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDashboard(dashboard.id);
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-100"
                                title="Delete dashboard"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Recent Reports */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
                </div>
              </div>

              <div className="p-6">
                {recentReports.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">No recent reports</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentReports.map((report) => (
                      <div
                        key={report.id}
                        className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {report.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {report.dashboardName}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {report.measure}
                              </span>
                              {report.isFavorite && (
                                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          {new Date(report.lastViewedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* User Stats */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Users className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Your Stats</h2>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dashboards</span>
                    <span className="font-medium">{dashboards.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Reports</span>
                    <span className="font-medium">
                      {dashboards.reduce((sum, d) => sum + (d.stats?.reportCount || 0), 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member Since</span>
                    <span className="font-medium">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create/Edit Dashboard Modal */}
        {(showCreateDashboard || editingDashboard) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingDashboard ? 'Edit Dashboard' : 'Create New Dashboard'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="dashboardName" className="block text-sm font-medium text-gray-700 mb-2">
                    Dashboard Name
                  </label>
                  <input
                    id="dashboardName"
                    type="text"
                    value={newDashboardName}
                    onChange={(e) => setNewDashboardName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter dashboard name"
                    maxLength={255}
                  />
                </div>

                <div>
                  <label htmlFor="dashboardDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    id="dashboardDescription"
                    value={newDashboardDescription}
                    onChange={(e) => setNewDashboardDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter description"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateDashboard(false);
                    setEditingDashboard(null);
                    setNewDashboardName('');
                    setNewDashboardDescription('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingDashboard) {
                      handleEditDashboard(editingDashboard.id, {
                        name: newDashboardName.trim(),
                        description: newDashboardDescription.trim() || null
                      });
                    } else {
                      handleCreateDashboard();
                    }
                  }}
                  disabled={!newDashboardName.trim() || isCreating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingDashboard ? 'Updating...' : 'Creating...'}
                    </div>
                  ) : (
                    editingDashboard ? 'Update Dashboard' : 'Create Dashboard'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;