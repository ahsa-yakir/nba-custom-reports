// API service for communicating with NBA Analytics backend
import axios from 'axios';

// Function to get the API URL from multiple sources
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

// Create axios instance with dynamic base configuration
const api = axios.create({
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dynamically set baseURL before each request
api.interceptors.request.use(
  (config) => {
    const baseURL = getApiUrl();
    config.baseURL = baseURL;
    
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    
    // Handle different error types
    if (error.response?.status === 404) {
      throw new Error('API endpoint not found');
    } else if (error.response?.status === 500) {
      throw new Error('Server error - please try again later');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to server - is the backend running?');
    }
    
    throw error;
  }
);

// API service methods
export const apiService = {
  // Health check
  async healthCheck() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error.message);
      throw error;
    }
  },

  // Test database connection
  async testDatabase() {
    try {
      const response = await api.get('/api/reports/test');
      return response.data;
    } catch (error) {
      console.error('Database test failed:', error.message);
      throw error;
    }
  },

  // Get list of teams
  async getTeams() {
    try {
      const response = await api.get('/api/reports/teams');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch teams:', error.message);
      throw error;
    }
  },

  // Generate custom report
  async generateReport(reportConfig) {
    try {
      console.log('📊 Generating report with config:', reportConfig);
      
      const response = await api.post('/api/reports/generate', reportConfig);
      return response.data;
    } catch (error) {
      console.error('Report generation failed:', error.message);
      throw error;
    }
  },

  // Test connection method
  async testConnection() {
    try {
      const health = await this.healthCheck();
      const dbTest = await this.testDatabase();
      
      return {
        status: 'connected',
        health,
        database: dbTest,
        apiUrl: getApiUrl()
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        apiUrl: getApiUrl()
      };
    }
  }
};

export default apiService;