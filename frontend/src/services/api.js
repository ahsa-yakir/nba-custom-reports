// API service for communicating with NBA Analytics backend
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
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
        database: dbTest
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }
};

export default apiService;