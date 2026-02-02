import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';

const DashboardContext = createContext(null);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children, sessionCode }) => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // Track student activity
  const activityTimeouts = useRef(new Map());
  const typingTimeouts = useRef(new Map());

  // Initialize socket connection
  useEffect(() => {
    if (!sessionCode || !user) return;

    const socket = socketService.connect();
    
    // Join the session (token is used from localStorage)
    socketService.joinSession(sessionCode);
    setIsConnected(true);

    return () => {
      // Cleanup on unmount
      activityTimeouts.current.forEach(timeout => clearTimeout(timeout));
      typingTimeouts.current.forEach(timeout => clearTimeout(timeout));
    };
  }, [sessionCode, user]);

  // Session timer
  useEffect(() => {
    if (isSessionPaused) return;
    
    const timer = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isSessionPaused]);

  // Socket event handlers
  useEffect(() => {
    if (!socketService.socket) return;

    // Helper to get language from file extension
    const getLanguageFromFile = (fileName) => {
      const ext = fileName?.split('.').pop()?.toLowerCase();
      const langMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'py': 'python',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown'
      };
      return langMap[ext] || 'plaintext';
    };

    // Convert server file format to dashboard format
    const processUserFiles = (serverFiles) => {
      if (!serverFiles || typeof serverFiles !== 'object') return {};
      
      const processedFiles = {};
      Object.entries(serverFiles).forEach(([fileId, fileData]) => {
        const fileName = fileId?.split('/').pop() || 'untitled';
        processedFiles[fileId] = {
          name: fileName,
          path: fileId,
          content: fileData.content,
          language: getLanguageFromFile(fileName),
          lastModified: fileData.lastModified || Date.now()
        };
      });
      return processedFiles;
    };

    // Get current code from files
    const getCurrentCode = (files, currentFile) => {
      if (currentFile && files && files[currentFile]) {
        return files[currentFile].content || '';
      }
      // Return the most recently modified file's content
      const fileEntries = Object.entries(files || {});
      if (fileEntries.length > 0) {
        const sorted = fileEntries.sort((a, b) => 
          (b[1].lastModified || 0) - (a[1].lastModified || 0)
        );
        return sorted[0][1].content || '';
      }
      return '';
    };

    // Handle session joined
    const handleSessionJoined = ({ sessionCode, participants }) => {
      console.log('Dashboard: Session joined', { sessionCode, participants });
      
      // Filter out the teacher (current user) and map participants to student format
      const studentList = participants
        .filter(p => p.id !== user?.id)
        .map(p => {
          const processedFiles = processUserFiles(p.files);
          const currentCode = getCurrentCode(processedFiles, p.currentFile);
          
          return {
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            status: Object.keys(processedFiles).length > 0 ? 'active' : 'idle',
            matchPercentage: 0,
            code: currentCode,
            currentFile: p.currentFile || null,
            files: processedFiles,
            cursorPosition: null,
            muted: false,
            enlarged: false,
            lastActivity: Date.now()
          };
        });
      
      setStudents(studentList);
    };

    // Handle user joined
    const handleUserJoined = ({ user: joinedUser, participants }) => {
      console.log('Dashboard: User joined', joinedUser);
      
      // Don't add if it's the teacher
      if (joinedUser.id === user?.id) return;
      
      setStudents(prev => {
        // Check if student already exists
        const exists = prev.some(s => s.id === joinedUser.id);
        if (exists) {
          return prev.map(s => 
            s.id === joinedUser.id 
              ? { ...s, status: 'active', lastActivity: Date.now() }
              : s
          );
        }
        
        // Add new student
        return [...prev, {
          id: joinedUser.id,
          name: joinedUser.name,
          avatar: joinedUser.avatar,
          status: 'active',
          matchPercentage: 0,
          code: '',
          currentFile: null,
          files: {},
          cursorPosition: null,
          muted: false,
          enlarged: false,
          lastActivity: Date.now()
        }];
      });
    };

    // Handle user left
    const handleUserLeft = ({ userId, participants }) => {
      console.log('Dashboard: User left', userId);
      
      setStudents(prev => prev.filter(s => s.id !== userId));
      
      // Clear any activity timeouts
      if (activityTimeouts.current.has(userId)) {
        clearTimeout(activityTimeouts.current.get(userId));
        activityTimeouts.current.delete(userId);
      }
      if (typingTimeouts.current.has(userId)) {
        clearTimeout(typingTimeouts.current.get(userId));
        typingTimeouts.current.delete(userId);
      }
    };

    // Handle code updates from students
    const handleCodeUpdate = ({ userId, userName, content, fileId, cursorPosition }) => {
      console.log('Dashboard: Code update from', userName, 'file:', fileId);
      
      setStudents(prev => prev.map(student => {
        if (student.id !== userId) return student;
        
        // Extract file name from fileId (path)
        const fileName = fileId?.split('/').pop() || 'untitled';
        
        // Update files map
        const updatedFiles = {
          ...student.files,
          [fileId]: {
            name: fileName,
            path: fileId,
            content: content,
            language: getLanguageFromFile(fileName),
            lastModified: Date.now()
          }
        };
        
        // Set student as typing and update current file
        return {
          ...student,
          status: 'typing',
          code: content,
          currentFile: fileId,
          files: updatedFiles,
          cursorPosition,
          lastActivity: Date.now()
        };
      }));

      // Clear existing typing timeout
      if (typingTimeouts.current.has(userId)) {
        clearTimeout(typingTimeouts.current.get(userId));
      }
      
      // Set timeout to change status back to active after 2 seconds of no typing
      typingTimeouts.current.set(userId, setTimeout(() => {
        setStudents(prev => prev.map(s => 
          s.id === userId && s.status === 'typing' 
            ? { ...s, status: 'active' } 
            : s
        ));
        typingTimeouts.current.delete(userId);
      }, 2000));

      // Reset activity timeout
      resetActivityTimeout(userId);
    };

    // Handle cursor updates
    const handleCursorUpdate = ({ userId, userName, position, fileId }) => {
      setStudents(prev => prev.map(student => {
        if (student.id !== userId) return student;
        
        return {
          ...student,
          cursorPosition: { position, fileId },
          lastActivity: Date.now()
        };
      }));

      resetActivityTimeout(userId);
    };

    // Handle student errors (syntax errors, runtime errors)
    const handleStudentError = ({ userId, error }) => {
      setStudents(prev => prev.map(student => 
        student.id === userId 
          ? { ...student, status: 'error', errorMessage: error }
          : student
      ));
    };

    // Reset activity timeout for a student
    const resetActivityTimeout = (userId) => {
      if (activityTimeouts.current.has(userId)) {
        clearTimeout(activityTimeouts.current.get(userId));
      }
      
      // Set student to idle after 30 seconds of inactivity
      activityTimeouts.current.set(userId, setTimeout(() => {
        setStudents(prev => prev.map(s => 
          s.id === userId && s.status !== 'error' 
            ? { ...s, status: 'idle' } 
            : s
        ));
        activityTimeouts.current.delete(userId);
      }, 30000));
    };

    // Register socket listeners
    socketService.socket.on('session-joined', handleSessionJoined);
    socketService.socket.on('user-joined', handleUserJoined);
    socketService.socket.on('user-left', handleUserLeft);
    socketService.socket.on('code-update', handleCodeUpdate);
    socketService.socket.on('cursor-update', handleCursorUpdate);
    socketService.socket.on('student-error', handleStudentError);

    return () => {
      socketService.socket.off('session-joined', handleSessionJoined);
      socketService.socket.off('user-joined', handleUserJoined);
      socketService.socket.off('user-left', handleUserLeft);
      socketService.socket.off('code-update', handleCodeUpdate);
      socketService.socket.off('cursor-update', handleCursorUpdate);
      socketService.socket.off('student-error', handleStudentError);
    };
  }, [user]);

  // Actions the teacher can take
  const muteStudent = useCallback((studentId, muted) => {
    setStudents(prev => prev.map(s => 
      s.id === studentId ? { ...s, muted } : s
    ));
    
    // Emit to server to mute student
    socketService.socket?.emit('mute-student', { 
      sessionCode, 
      studentId, 
      muted 
    });
  }, [sessionCode]);

  const muteAllStudents = useCallback((muted) => {
    setStudents(prev => prev.map(s => ({ ...s, muted })));
    
    // Emit to server
    socketService.socket?.emit('mute-all', { 
      sessionCode, 
      muted 
    });
  }, [sessionCode]);

  const lockEditors = useCallback((locked) => {
    socketService.socket?.emit('lock-editors', { 
      sessionCode, 
      locked 
    });
  }, [sessionCode]);

  const broadcastMessage = useCallback((message) => {
    socketService.socket?.emit('broadcast-message', { 
      sessionCode, 
      message 
    });
  }, [sessionCode]);

  const focusStudent = useCallback((studentId) => {
    setStudents(prev => prev.map(s => ({
      ...s,
      enlarged: s.id === studentId ? !s.enlarged : false
    })));
  }, []);

  const pauseSession = useCallback(() => {
    setIsSessionPaused(prev => !prev);
  }, []);

  // Computed values
  const activeStudents = students.filter(s => s.status === 'active' || s.status === 'typing');
  const idleStudents = students.filter(s => s.status === 'idle');
  const errorStudents = students.filter(s => s.status === 'error');

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const value = {
    // State
    students,
    sessionInfo,
    sessionTime,
    formattedTime: formatTime(sessionTime),
    isSessionPaused,
    isConnected,
    
    // Computed
    activeCount: activeStudents.length,
    idleCount: idleStudents.length,
    errorCount: errorStudents.length,
    totalCount: students.length,
    
    // Actions
    muteStudent,
    muteAllStudents,
    lockEditors,
    broadcastMessage,
    focusStudent,
    pauseSession,
    setStudents
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export default DashboardContext;
