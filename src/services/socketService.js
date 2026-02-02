// Socket.IO service for real-time collaboration
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.sessionCode = null;
  }

  // Connect to the server
  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket.id);
      
      // Rejoin session if we were in one
      if (this.sessionCode) {
        this.joinSession(this.sessionCode);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  // Disconnect from the server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.sessionCode = null;
    this.listeners.clear();
  }

  // Join a coding session
  joinSession(sessionCode) {
    const token = localStorage.getItem('codesync_token');
    if (!token) {
      console.error('❌ Cannot join session: No token');
      return;
    }
    if (!this.socket) {
      console.error('❌ Cannot join session: Socket not initialized');
      return;
    }

    this.sessionCode = sessionCode;
    console.log('🎯 Joining session:', sessionCode);
    
    // If socket is connected, join immediately
    if (this.socket.connected) {
      this.socket.emit('join-session', { sessionCode, token });
    } else {
      // Wait for connection then join
      this.socket.once('connect', () => {
        console.log('🔌 Socket connected, now joining session');
        this.socket.emit('join-session', { sessionCode, token });
      });
    }
  }

  // Leave the current session
  leaveSession() {
    this.sessionCode = null;
    // The server handles cleanup on disconnect
  }

  // ============================================
  // CODE COLLABORATION
  // ============================================

  // Send code change
  sendCodeChange(fileId, content, cursorPosition) {
    if (!this.socket) return;
    this.socket.emit('code-change', { fileId, content, cursorPosition });
  }

  // Send cursor position
  sendCursorMove(fileId, position, selection) {
    if (!this.socket) return;
    this.socket.emit('cursor-move', { fileId, position, selection });
  }

  // Listen for code updates from others
  onCodeUpdate(callback) {
    this.addListener('code-update', callback);
  }

  // Listen for cursor updates from others
  onCursorUpdate(callback) {
    this.addListener('cursor-update', callback);
  }

  // ============================================
  // FILE OPERATIONS
  // ============================================

  // Notify file created
  sendFileCreated(file) {
    if (!this.socket) return;
    this.socket.emit('file-created', { file });
  }

  // Notify file deleted
  sendFileDeleted(path) {
    if (!this.socket) return;
    this.socket.emit('file-deleted', { path });
  }

  // Notify file renamed
  sendFileRenamed(oldPath, newPath, newName) {
    if (!this.socket) return;
    this.socket.emit('file-renamed', { oldPath, newPath, newName });
  }

  onFileCreated(callback) {
    this.addListener('file-created', callback);
  }

  onFileDeleted(callback) {
    this.addListener('file-deleted', callback);
  }

  onFileRenamed(callback) {
    this.addListener('file-renamed', callback);
  }

  // ============================================
  // CHAT
  // ============================================

  // Send a chat message
  sendChatMessage(content) {
    if (!this.socket?.connected) {
      console.error('❌ Cannot send message: Socket not connected');
      return false;
    }
    if (!this.sessionCode) {
      console.error('❌ Cannot send message: Not in a session');
      return false;
    }
    console.log('📤 Sending chat message:', content);
    this.socket.emit('chat-message', { content });
    return true;
  }

  // Listen for chat messages
  onChatMessage(callback) {
    this.addListener('chat-message', callback);
  }

  // Typing indicators
  startTyping() {
    if (!this.socket) return;
    this.socket.emit('typing-start');
  }

  stopTyping() {
    if (!this.socket) return;
    this.socket.emit('typing-stop');
  }

  onUserTyping(callback) {
    this.addListener('user-typing', callback);
  }

  onUserStoppedTyping(callback) {
    this.addListener('user-stopped-typing', callback);
  }

  // ============================================
  // PARTICIPANTS
  // ============================================

  // Listen for session joined confirmation
  onSessionJoined(callback) {
    this.addListener('session-joined', callback);
  }

  // Listen for user joined
  onUserJoined(callback) {
    this.addListener('user-joined', callback);
  }

  // Listen for user left
  onUserLeft(callback) {
    this.addListener('user-left', callback);
  }

  // ============================================
  // VIDEO CALL / WEBRTC SIGNALING
  // ============================================

  // Join the call
  joinCall() {
    if (!this.socket?.connected) return;
    this.socket.emit('call-join');
  }

  // Leave the call
  leaveCall() {
    if (!this.socket?.connected) return;
    this.socket.emit('call-leave');
  }

  // Send WebRTC offer
  sendOffer(targetSocketId, offer) {
    if (!this.socket?.connected) return;
    this.socket.emit('webrtc-offer', { targetSocketId, offer });
  }

  // Send WebRTC answer
  sendAnswer(targetSocketId, answer) {
    if (!this.socket?.connected) return;
    this.socket.emit('webrtc-answer', { targetSocketId, answer });
  }

  // Send ICE candidate
  sendIceCandidate(targetSocketId, candidate) {
    if (!this.socket?.connected) return;
    this.socket.emit('webrtc-ice-candidate', { targetSocketId, candidate });
  }

  // Toggle media (audio/video)
  toggleMedia(type, enabled) {
    if (!this.socket?.connected) return;
    this.socket.emit('call-media-toggle', { type, enabled });
  }

  // Toggle screen share
  toggleScreenShare(enabled) {
    if (!this.socket?.connected) return;
    this.socket.emit('call-screen-share', { enabled });
  }

  // Listen for call events
  onCallUserJoined(callback) {
    this.addListener('call-user-joined', callback);
  }

  onCallUserLeft(callback) {
    this.addListener('call-user-left', callback);
  }

  onWebRTCOffer(callback) {
    this.addListener('webrtc-offer', callback);
  }

  onWebRTCAnswer(callback) {
    this.addListener('webrtc-answer', callback);
  }

  onWebRTCIceCandidate(callback) {
    this.addListener('webrtc-ice-candidate', callback);
  }

  onCallMediaToggle(callback) {
    this.addListener('call-media-toggle', callback);
  }

  onCallScreenShare(callback) {
    this.addListener('call-screen-share', callback);
  }

  // Get socket ID (needed for WebRTC targeting)
  getSocketId() {
    return this.socket?.id || null;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  addListener(event, callback) {
    if (!this.socket) return;
    
    // Remove existing listener if any
    if (this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event));
    }
    
    this.listeners.set(event, callback);
    this.socket.on(event, callback);
  }

  removeListener(event) {
    if (!this.socket || !this.listeners.has(event)) return;
    
    this.socket.off(event, this.listeners.get(event));
    this.listeners.delete(event);
  }

  removeAllListeners() {
    this.listeners.forEach((callback, event) => {
      this.socket?.off(event, callback);
    });
    this.listeners.clear();
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
