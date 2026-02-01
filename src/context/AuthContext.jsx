import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = authService.getUser();
        const token = authService.getToken();
        
        if (storedUser && token) {
          // Verify token is still valid
          try {
            const freshUser = await authService.fetchUser();
            setUser(freshUser);
          } catch (e) {
            // Token expired or invalid
            authService.clearAuth();
          }
        }
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login with GitHub
  const loginWithGitHub = () => {
    authService.loginWithGitHub();
  };

  // Login with Google
  const loginWithGoogle = () => {
    authService.loginWithGoogle();
  };

  // Register with email/password
  const register = async (name, email, password, role = 'student') => {
    setLoading(true);
    setError(null);
    
    try {
      const newUser = await authService.register(name, email, password, role);
      setUser(newUser);
      return newUser;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // Login with email/password
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const loggedInUser = await authService.login(email, password);
      setUser(loggedInUser);
      return loggedInUser;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth callback
  const handleAuthCallback = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { user: authUser } = await authService.handleCallback();
      setUser(authUser);
      return authUser;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // Update user role
  const updateRole = async (role) => {
    try {
      const updatedUser = await authService.updateRole(role);
      setUser(updatedUser);
      return updatedUser;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };

  // Logout
  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  // Computed properties
  const isAuthenticated = !!user;
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    isTeacher,
    isStudent,
    loginWithGitHub,
    loginWithGoogle,
    register,
    login,
    handleAuthCallback,
    updateRole,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
