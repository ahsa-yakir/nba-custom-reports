/**
 * Authentication Context for NBA Analytics
 * Provides global auth state management with dynamic API URL resolution
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Function to get the API URL from multiple sources (same as other API services)
const getApiUrl = () => {
  // 1. Check if runtime config is available (for containerized environments)
  if (window.runtimeConfig && window.runtimeConfig.API_URL) {
    return window.runtimeConfig.API_URL;
  }
  
  // 2. Check build-time environment variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 3. For development/localhost, try to detect if we're in a container
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // 4. For production, use relative URL to the same domain (ALB will route /api/* to backend)
  return '';  // This makes requests relative to current domain
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Enhanced auth service with dynamic URL resolution
class SimpleAuthService {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.user = null;
    
    // Load from localStorage on init
    this.loadFromStorage();
  }

  // Get the current API base URL
  getApiBaseUrl() {
    const baseUrl = getApiUrl();
    console.log(`🔗 Auth API Base URL: ${baseUrl || 'relative'}/api`);
    return baseUrl ? `${baseUrl}/api` : '/api';
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
    const baseUrl = this.getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    
    console.log(`🔄 Auth API Request: ${options.method || 'GET'} ${url}`);
    
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
        console.error(`❌ Auth API Error: ${response.status} ${url}`, errorData);
        
        // Handle token expiration
        if (response.status === 401 && errorData.expired && this.refreshToken) {
          console.log('🔄 Token expired, attempting refresh...');
          const refreshResult = await this.refreshAccessToken();
          if (refreshResult.success) {
            // Retry the original request with new token
            finalOptions.headers.Authorization = `Bearer ${this.token}`;
            const retryResponse = await fetch(url, finalOptions);
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log(`✅ Auth API Success: ${response.status} ${url}`);
      return responseData;
    } catch (error) {
      console.error(`❌ Auth API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      console.warn('No refresh token available');
      return { success: false };
    }

    try {
      const baseUrl = this.getApiBaseUrl();
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Token refresh failed:', data);
        this.clearStorage();
        return { success: false };
      }

      if (data.success && data.tokens) {
        this.token = data.tokens.accessToken;
        localStorage.setItem('nba_access_token', this.token);
        console.log('✅ Token refreshed successfully');
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearStorage();
      return { success: false };
    }
  }

  async login(credentials) {
    try {
      const baseUrl = this.getApiBaseUrl();
      const url = `${baseUrl}/auth/login`;
      
      console.log(`🔑 Login attempt: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Login failed:', response.status, data);
        throw new Error(data.message || 'Login failed');
      }

      if (data.success && data.tokens) {
        this.saveToStorage(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          data.user
        );
        console.log('✅ Login successful:', data.user.username);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const baseUrl = this.getApiBaseUrl();
      const url = `${baseUrl}/auth/register`;
      
      console.log(`📝 Registration attempt: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Registration failed:', response.status, data);
        throw new Error(data.message || 'Registration failed');
      }

      if (data.success && data.tokens) {
        this.saveToStorage(
          data.tokens.accessToken,
          data.tokens.refreshToken,
          data.user
        );
        console.log('✅ Registration successful:', data.user.username);
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
        const baseUrl = this.getApiBaseUrl();
        await fetch(`${baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.token && { Authorization: `Bearer ${this.token}` }),
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
        console.log('✅ Logout API call completed');
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearStorage();
      console.log('🧹 Auth storage cleared');
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
        
        console.log('🔄 Initializing auth...');
        
        // Check if user is already authenticated
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          setUser(currentUser);
          console.log('✅ User authenticated from storage:', currentUser.username);
          
          // Verify token is still valid by fetching fresh profile
          try {
            const profileResponse = await authService.apiRequest('/auth/profile');
            if (profileResponse.success) {
              // Update user data if profile fetch was successful
              setUser(profileResponse.user);
              authService.saveToStorage(null, null, profileResponse.user);
              console.log('✅ Profile verified and updated');
            }
          } catch (error) {
            console.warn('Profile verification failed, clearing auth:', error);
            authService.clearStorage();
            setUser(null);
          }
        } else {
          console.log('ℹ️ No authenticated user found');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
        console.log('✅ Auth initialization complete');
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
          <p className="text-xs text-gray-400 mt-2">API: {getApiUrl() || 'relative'}</p>
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