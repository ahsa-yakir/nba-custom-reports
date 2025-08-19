/**
 * Career data API service
 * Create this file at: frontend/src/services/careerApi.js
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const careerApiService = {
  getPlayerCareerData: async (playerId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/career/player/${playerId}`);
      
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

      const response = await fetch(`${API_BASE_URL}/api/career/search?name=${encodeURIComponent(name)}`);
      
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