/**
 * Career data API service with dynamic URL resolution
 */

// Function to get the API URL from multiple sources (same as main api.js)
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

export const careerApiService = {
  getPlayerCareerData: async (playerId) => {
    try {
      const apiBaseUrl = getApiUrl();
      const response = await fetch(`${apiBaseUrl}/api/career/player/${playerId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch career data');
      }
      
      return data;
    } catch (error) {
      console.error('Career data fetch error:', error);
      throw new Error(`Failed to fetch career data: ${error.message}`);
    }
  },

  searchPlayersByName: async (name) => {
    try {
      if (!name || name.length < 2) {
        return { success: true, players: [] };
      }

      const apiBaseUrl = getApiUrl();
      const response = await fetch(`${apiBaseUrl}/api/career/search?name=${encodeURIComponent(name)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to search players');
      }
      
      return data;
    } catch (error) {
      console.error('Player search error:', error);
      throw new Error(`Failed to search players: ${error.message}`);
    }
  }
};