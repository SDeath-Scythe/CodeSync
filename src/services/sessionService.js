// Session service for creating and joining sessions

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Get token from localStorage
const getToken = () => localStorage.getItem('codesync_token');

export const sessionService = {
  // Create a new session (teachers only)
  async createSession(title, description = '') {
    const token = getToken();
    
    if (!token) {
      throw new Error('You must be logged in to create a session');
    }

    const response = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create session');
    }

    return data.session;
  },

  // Join a session by code
  async joinSession(code) {
    const token = getToken();
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add auth header if logged in
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/sessions/join`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code: code.toUpperCase() })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to join session');
    }

    return data.session;
  },

  // Get session by code
  async getSession(code) {
    const response = await fetch(`${API_URL}/sessions/${code.toUpperCase()}`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Session not found');
    }

    return data.session;
  },

  // Check if a session exists
  async sessionExists(code) {
    try {
      await this.getSession(code);
      return true;
    } catch {
      return false;
    }
  }
};

export default sessionService;
