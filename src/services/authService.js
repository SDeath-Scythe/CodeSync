// Auth service for OAuth and Email/Password authentication

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Token storage
const TOKEN_KEY = 'codesync_token';
const USER_KEY = 'codesync_user';

export const authService = {
  // Get stored token
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Get stored user
  getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  // Store auth data
  setAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  // Clear auth data
  clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  // Check if authenticated
  isAuthenticated() {
    return !!this.getToken();
  },

  // Redirect to GitHub OAuth
  loginWithGitHub() {
    window.location.href = `${API_URL}/auth/github`;
  },

  // Redirect to Google OAuth
  loginWithGoogle() {
    window.location.href = `${API_URL}/auth/google`;
  },

  // Register with email/password
  async register(name, email, password, role = 'student') {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password, role })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Store auth data
    this.setAuth(data.token, data.user);
    return data.user;
  },

  // Login with email/password
  async login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store auth data
    this.setAuth(data.token, data.user);
    return data.user;
  },

  // Handle OAuth callback - extract token from URL
  async handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    const provider = params.get('provider');

    if (error) {
      throw new Error(`Authentication failed: ${error}`);
    }

    if (!token) {
      throw new Error('No authentication token received');
    }

    // Get user info with the token
    const user = await this.fetchUser(token);
    
    // Store auth data
    this.setAuth(token, user);

    return { user, provider };
  },

  // Fetch current user from API
  async fetchUser(token = null) {
    const authToken = token || this.getToken();
    
    if (!authToken) {
      throw new Error('No token available');
    }

    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearAuth();
        throw new Error('Session expired');
      }
      throw new Error('Failed to fetch user');
    }

    const data = await response.json();
    return data.user;
  },

  // Update user role
  async updateRole(role) {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/auth/role`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role })
    });

    if (!response.ok) {
      throw new Error('Failed to update role');
    }

    const data = await response.json();
    
    // Update stored auth with new token
    this.setAuth(data.token, data.user);
    
    return data.user;
  },

  // Logout
  async logout() {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (e) {
      // Ignore logout API errors
    }
    
    this.clearAuth();
  }
};

export default authService;
