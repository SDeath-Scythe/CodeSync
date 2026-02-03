// Real-time collaboration context for managing session state
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import socketService from '../services/socketService';
import sessionService from '../services/sessionService';
import { useAuth } from './AuthContext';

const CollaborationContext = createContext(null);

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};

export const CollaborationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // Session state
  const [currentSession, setCurrentSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Cursor state (other users' cursors)
  const [remoteCursors, setRemoteCursors] = useState(new Map());

  // Code changes from others
  const [pendingChanges, setPendingChanges] = useState([]);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Connect to socket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
      setIsConnected(socketService.isConnected());
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated]);

  // Set up socket event listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    // Session events
    socketService.onSessionJoined(({ sessionCode, participants: p }) => {
      console.log('✅ Joined session:', sessionCode);
      setParticipants(p);
      setIsConnected(true);
    });

    socketService.onUserJoined(({ user: joinedUser, participants: p }) => {
      console.log('👤 User joined:', joinedUser.name);
      setParticipants(p);
    });

    socketService.onUserLeft(({ userId, participants: p }) => {
      console.log('👤 User left:', userId);
      setParticipants(p);
      // Remove their cursor
      setRemoteCursors(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    // Code collaboration events
    socketService.onCodeUpdate(({ fileId, content, userId, userName, cursorPosition }) => {
      setPendingChanges(prev => [...prev, { fileId, content, userId, userName, cursorPosition }]);
    });

    socketService.onCursorUpdate(({ userId, userName, fileId, position, selection }) => {
      setRemoteCursors(prev => {
        const next = new Map(prev);
        next.set(userId, { userName, fileId, position, selection });
        return next;
      });
    });

    // Chat events
    socketService.onChatMessage((message) => {
      console.log('📩 Received chat message:', message);
      setMessages(prev => [...prev, message]);
    });

    socketService.onUserTyping(({ userId, userName }) => {
      setTypingUsers(prev => {
        if (prev.some(u => u.userId === userId)) return prev;
        return [...prev, { userId, userName }];
      });
    });

    socketService.onUserStoppedTyping(({ userId }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    });

    // File events
    socketService.onFileCreated(({ file, userId }) => {
      // This will be handled by FileSystemContext
      window.dispatchEvent(new CustomEvent('remote-file-created', { detail: { file, userId } }));
    });

    socketService.onFileDeleted(({ path, userId }) => {
      window.dispatchEvent(new CustomEvent('remote-file-deleted', { detail: { path, userId } }));
    });

    socketService.onFileRenamed(({ oldPath, newPath, newName, userId }) => {
      window.dispatchEvent(new CustomEvent('remote-file-renamed', { detail: { oldPath, newPath, newName, userId } }));
    });

    return () => {
      socketService.removeAllListeners();
    };
  }, [isAuthenticated]);

  // Join a session
  const joinSession = useCallback((sessionCode) => {
    setCurrentSession(sessionCode);
    socketService.joinSession(sessionCode);

    // Load existing messages from API
    loadMessages(sessionCode);
  }, []);

  // Leave the current session
  const leaveSession = useCallback(() => {
    socketService.leaveSession();
    setCurrentSession(null);
    setParticipants([]);
    setMessages([]);
    setTypingUsers([]);
    setRemoteCursors(new Map());
    setLastSaved(null);
  }, []);

  // Load chat messages from API
  const loadMessages = async (sessionCode) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/sessions/${sessionCode}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Save session workspace to database (entire file tree as JSON)
  const saveSessionToDb = useCallback(async (workspaceData) => {
    if (!currentSession || !user || isSaving) {
      console.log('Cannot save: no session, user, or already saving');
      return { success: false, error: 'Cannot save right now' };
    }

    setIsSaving(true);
    try {
      const result = await sessionService.saveSessionFiles(currentSession, workspaceData);
      setLastSaved(new Date());
      console.log(`💾 Workspace saved: ${result.count} items`);
      return { success: true, ...result };
    } catch (error) {
      console.error('Failed to save session:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSaving(false);
    }
  }, [currentSession, user, isSaving]);

  // Load session workspace from database
  const loadSessionFromDb = useCallback(async (sessionCode) => {
    try {
      const data = await sessionService.getSessionFiles(sessionCode || currentSession);
      console.log('📂 Raw workspace data from API:', {
        hasFiles: !!data.files,
        filesLength: data.files?.length,
        filesFirstItem: data.files?.[0],
        hasFileTree: !!data.fileTree,
        fileTreeLength: data.fileTree?.length,
        fileContentsKeys: Object.keys(data.fileContents || {})
      });

      // Prefer fileTree if files is empty or not a flat array
      let files = data.files || [];
      if (files.length === 0 && data.fileTree && data.fileTree.length > 0) {
        files = data.fileTree;
      }

      console.log(`📂 Loaded workspace with ${files.length} items from database`);
      return { ...data, files }; // Return the full workspace data with resolved files
    } catch (error) {
      console.error('Failed to load workspace:', error);
      return { files: [], fileContents: {} };
    }
  }, [currentSession]);

  // Load TEACHER's files from database (session owner's files - for students to view)
  const loadTeacherFilesFromDb = useCallback(async (sessionCode) => {
    try {
      const result = await sessionService.getTeacherFiles(sessionCode || currentSession);
      console.log(`📂 Loaded ${result.files.length} teacher files from database (${result.teacherName})`);
      return result;
    } catch (error) {
      console.error('Failed to load teacher files:', error);
      return { files: [], teacherId: null, teacherName: null };
    }
  }, [currentSession]);

  // Send a chat message
  const sendMessage = useCallback((content) => {
    const sent = socketService.sendChatMessage(content);
    if (!sent) {
      console.error('Message not sent - check socket connection');
    }
  }, []);

  // Send code change
  const sendCodeChange = useCallback((fileId, content, cursorPosition) => {
    socketService.sendCodeChange(fileId, content, cursorPosition);
  }, []);

  // Send cursor position
  const sendCursorMove = useCallback((fileId, position, selection) => {
    socketService.sendCursorMove(fileId, position, selection);
  }, []);

  // Consume pending changes (called by editor after applying)
  const consumePendingChanges = useCallback((fileId) => {
    setPendingChanges(prev => prev.filter(c => c.fileId !== fileId));
  }, []);

  // Typing indicators
  const startTyping = useCallback(() => {
    socketService.startTyping();
  }, []);

  const stopTyping = useCallback(() => {
    socketService.stopTyping();
  }, []);

  // File operations (notify others)
  const notifyFileCreated = useCallback((file) => {
    socketService.sendFileCreated(file);
  }, []);

  const notifyFileDeleted = useCallback((path) => {
    socketService.sendFileDeleted(path);
  }, []);

  const notifyFileRenamed = useCallback((oldPath, newPath, newName) => {
    socketService.sendFileRenamed(oldPath, newPath, newName);
  }, []);

  const value = useMemo(() => ({
    // Session
    currentSession,
    participants,
    isConnected,
    joinSession,
    leaveSession,

    // Chat
    messages,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,

    // Code collaboration
    remoteCursors,
    pendingChanges,
    sendCodeChange,
    sendCursorMove,
    consumePendingChanges,

    // File operations
    notifyFileCreated,
    notifyFileDeleted,
    notifyFileRenamed,

    // Session file persistence (CTRL+S)
    saveSessionToDb,
    loadSessionFromDb,
    loadTeacherFilesFromDb,
    isSaving,
    lastSaved
  }), [
    currentSession,
    participants,
    isConnected,
    joinSession,
    leaveSession,
    messages,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    remoteCursors,
    pendingChanges,
    sendCodeChange,
    sendCursorMove,
    consumePendingChanges,
    notifyFileCreated,
    notifyFileDeleted,
    notifyFileRenamed,
    saveSessionToDb,
    loadSessionFromDb,
    loadTeacherFilesFromDb,
    isSaving,
    lastSaved
  ]);

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

export default CollaborationContext;
