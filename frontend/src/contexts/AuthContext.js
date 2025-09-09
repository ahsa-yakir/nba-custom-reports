/**
 * Authentication Context for NBA Analytics
 * Provides global auth state management
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Simple auth service for now - we'll expand this later
class SimpleAuthService {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.user = null;
    
    // Load from localStorage on init
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      this.token = localStorage.getItem('nba_access_token');
      this.refreshToken = localStorage.getItem('nba_refresh_token');
      const userData = localStorage.getItem('nba_user_data');
      this.user = userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.warn('Failed to load auth data:', error);
      this.clearStorage();
    }
  }

  saveToStorage(accessToken, refreshToken, userData) {
    try {
      if (accessToken) {
        localStorage.setItem('nba_access_token', accessToken);
        this.token = accessToken;
      }
      
      if (refreshToken) {
        localStorage.setItem('nba_refresh_token', refreshToken);
        this.refreshToken = refreshToken;
      }
      
      if (userData) {
        localStorage.setItem('nba_user_data', JSON.stringify(userData));
        this.user = userData;
      }
    } catch (error) {
      console.error('Failed to save auth data:', error);
    }
  }

  clearStorage() {
    try {
      localStorage.removeItem('nba_access_token');
      localStorage.removeItem('nba_refresh_token');
      localStorage.removeItem('nba_user_data');
    } catch (error) {
      console.warn('Failed to clear auth data:', error);
    }
    
    this.token = null;
    this.refreshToken = null;
    this.user = null;
  }

  async apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add auth header if token exists
    if (this.token) {
      defaultOptions.headers.Authorization = `Bearer ${this.token}`;
    }

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, finalOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.success && data.tokens) {
        this.saveToStorage(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          data.user
        );
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (data.success && data.tokens) {
        this.saveToStorage(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          data.user
        );
      }

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      if (this.refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.token && { Authorization: `Bearer ${this.token}` }),
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearStorage();
    }
  }

  isAuthenticated() {
    return !!(this.token && this.user);
  }

  getCurrentUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }
}

// Create singleton instance
const authService = new SimpleAuthService();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Check if user is already authenticated
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          setUser(currentUser);
          
          // TODO: Verify token is still valid by fetching fresh profile
          // For now, we'll trust the stored data
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);
      
      if (response.success) {
        setUser(response.user);
        return { success: true, user: response.user };
      }
      
      return { success: false, message: response.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Login failed' 
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      setLoading(true);
      const response = await authService.register(userData);
      
      if (response.success) {
        setUser(response.user);
        return { success: true, user: response.user };
      }
      
      return { success: false, message: response.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Registration failed' 
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const isAuthenticated = useCallback(() => {
    return !!(user && authService.isAuthenticated());
  }, [user]);

  const value = {
    // State
    user,
    loading,
    initialized,
    
    // Methods
    login,
    register,
    logout,
    isAuthenticated,
    
    // Auth service access
    authService
  };

  // Don't render children until auth is initialized
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing NBA Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};