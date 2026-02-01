import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Default users for testing (stored in localStorage on first load)
const DEFAULT_USERS = [
  {
    id: '1',
    email: 'teacher@codesync.com',
    password: 'teacher123',
    name: 'Mr. Davis',
    role: 'teacher',
    avatar: 'https://i.pravatar.cc/150?u=davis'
  },
  {
    id: '2',
    email: 'student@codesync.com',
    password: 'student123',
    name: 'Alex Johnson',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?u=alex'
  }
];

// Session codes for testing
const DEFAULT_SESSIONS = [
  {
    code: 'CS-2024-A7B3',
    teacherId: '1',
    teacherName: 'Mr. Davis',
    title: 'React Fundamentals',
    students: [],
    createdAt: new Date().toISOString()
  }
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState(null);

  // Initialize localStorage with default data
  useEffect(() => {
    const initializeData = () => {
      if (!localStorage.getItem('codesync_users')) {
        localStorage.setItem('codesync_users', JSON.stringify(DEFAULT_USERS));
      }
      if (!localStorage.getItem('codesync_sessions')) {
        localStorage.setItem('codesync_sessions', JSON.stringify(DEFAULT_SESSIONS));
      }
    };

    const checkAuth = () => {
      initializeData();
      const savedUser = localStorage.getItem('codesync_current_user');
      const savedSession = localStorage.getItem('codesync_current_session');
      
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      if (savedSession) {
        setCurrentSession(JSON.parse(savedSession));
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Get all users from localStorage
  const getUsers = () => {
    return JSON.parse(localStorage.getItem('codesync_users') || '[]');
  };

  // Get all sessions from localStorage
  const getSessions = () => {
    return JSON.parse(localStorage.getItem('codesync_sessions') || '[]');
  };

  // Login with email/password
  const login = async (email, password) => {
    const users = getUsers();
    const foundUser = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!foundUser) {
      throw new Error('Invalid email or password');
    }

    const { password: _, ...userWithoutPassword } = foundUser;
    setUser(userWithoutPassword);
    localStorage.setItem('codesync_current_user', JSON.stringify(userWithoutPassword));
    
    return userWithoutPassword;
  };

  // Register new user
  const register = async (name, email, password, role = 'student') => {
    const users = getUsers();
    
    // Check if email already exists
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email already registered');
    }

    const newUser = {
      id: Date.now().toString(),
      email,
      password,
      name,
      role,
      avatar: `https://i.pravatar.cc/150?u=${email}`
    };

    users.push(newUser);
    localStorage.setItem('codesync_users', JSON.stringify(users));

    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    localStorage.setItem('codesync_current_user', JSON.stringify(userWithoutPassword));
    
    return userWithoutPassword;
  };

  // Logout
  const logout = () => {
    setUser(null);
    setCurrentSession(null);
    localStorage.removeItem('codesync_current_user');
    localStorage.removeItem('codesync_current_session');
  };

  // Create a new session (teacher only)
  const createSession = (title) => {
    if (!user || user.role !== 'teacher') {
      throw new Error('Only teachers can create sessions');
    }

    const sessions = getSessions();
    const code = `CS-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    const newSession = {
      code,
      teacherId: user.id,
      teacherName: user.name,
      title,
      students: [],
      createdAt: new Date().toISOString()
    };

    sessions.push(newSession);
    localStorage.setItem('codesync_sessions', JSON.stringify(sessions));
    
    setCurrentSession(newSession);
    localStorage.setItem('codesync_current_session', JSON.stringify(newSession));
    
    return newSession;
  };

  // Join a session with code (student)
  const joinSession = (sessionCode, studentName = null) => {
    const sessions = getSessions();
    const session = sessions.find(s => s.code.toUpperCase() === sessionCode.toUpperCase());

    if (!session) {
      throw new Error('Invalid session code');
    }

    // If user is logged in, use their info, otherwise create temp student
    let studentInfo;
    if (user) {
      studentInfo = { ...user };
    } else {
      studentInfo = {
        id: Date.now().toString(),
        name: studentName || 'Guest Student',
        role: 'student',
        isGuest: true,
        avatar: `https://i.pravatar.cc/150?u=${Date.now()}`
      };
      setUser(studentInfo);
      localStorage.setItem('codesync_current_user', JSON.stringify(studentInfo));
    }

    // Add student to session
    if (!session.students.find(s => s.id === studentInfo.id)) {
      session.students.push({
        id: studentInfo.id,
        name: studentInfo.name,
        joinedAt: new Date().toISOString()
      });
      
      const updatedSessions = sessions.map(s => 
        s.code === session.code ? session : s
      );
      localStorage.setItem('codesync_sessions', JSON.stringify(updatedSessions));
    }

    setCurrentSession(session);
    localStorage.setItem('codesync_current_session', JSON.stringify(session));
    
    return session;
  };

  // Leave current session
  const leaveSession = () => {
    if (currentSession && user) {
      const sessions = getSessions();
      const session = sessions.find(s => s.code === currentSession.code);
      
      if (session) {
        session.students = session.students.filter(s => s.id !== user.id);
        const updatedSessions = sessions.map(s => 
          s.code === session.code ? session : s
        );
        localStorage.setItem('codesync_sessions', JSON.stringify(updatedSessions));
      }
    }
    
    setCurrentSession(null);
    localStorage.removeItem('codesync_current_session');
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
    currentSession,
    login,
    register,
    logout,
    createSession,
    joinSession,
    leaveSession,
    getSessions
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
