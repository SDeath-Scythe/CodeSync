// Video call context with WebRTC peer connections
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';
import { useCollaboration } from './CollaborationContext';

const CallContext = createContext(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

// ICE servers for WebRTC (STUN/TURN)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const { isConnected, currentSession } = useCollaboration();
  
  // Call state
  const [isInCall, setIsInCall] = useState(false);
  const [callParticipants, setCallParticipants] = useState(new Map()); // socketId -> { userId, userName, stream, audioEnabled, videoEnabled }
  const [localStream, setLocalStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  
  // Refs for peer connections
  const peerConnections = useRef(new Map()); // socketId -> RTCPeerConnection
  const localStreamRef = useRef(null);

  // Get local media stream
  const getLocalStream = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true
        } : false
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsAudioEnabled(audio);
      setIsVideoEnabled(video);
      
      return stream;
    } catch (error) {
      console.error('Error getting local media:', error);
      // Try audio only if video fails
      if (video) {
        return getLocalStream(false, audio);
      }
      throw error;
    }
  }, []);

  // Create peer connection for a remote user
  const createPeerConnection = useCallback((targetSocketId, targetUserId, targetUserName) => {
    console.log('🔗 Creating peer connection for:', targetUserName);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendIceCandidate(targetSocketId, event.candidate);
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${targetUserName}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Clean up failed connection
        removePeerConnection(targetSocketId);
      }
    };
    
    // Handle incoming tracks (remote stream)
    pc.ontrack = (event) => {
      console.log('📹 Received remote track from:', targetUserName);
      const [remoteStream] = event.streams;
      
      setCallParticipants(prev => {
        const next = new Map(prev);
        const existing = next.get(targetSocketId) || {};
        next.set(targetSocketId, {
          ...existing,
          userId: targetUserId,
          userName: targetUserName,
          stream: remoteStream,
          audioEnabled: true,
          videoEnabled: true
        });
        return next;
      });
    };
    
    peerConnections.current.set(targetSocketId, pc);
    return pc;
  }, []);

  // Remove peer connection
  const removePeerConnection = useCallback((socketId) => {
    const pc = peerConnections.current.get(socketId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(socketId);
    }
    
    setCallParticipants(prev => {
      const next = new Map(prev);
      next.delete(socketId);
      return next;
    });
  }, []);

  // Join the call
  const joinCall = useCallback(async () => {
    if (!isConnected) {
      console.error('Cannot join call: Not connected to session');
      return;
    }
    
    try {
      // Get local media
      await getLocalStream(true, true);
      
      setIsInCall(true);
      
      // Notify server
      socketService.joinCall();
      
      console.log('📞 Joined call');
    } catch (error) {
      console.error('Failed to join call:', error);
      throw error;
    }
  }, [isConnected, getLocalStream]);

  // Leave the call
  const leaveCall = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    
    // Stop screen share if active
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    }
    
    // Close all peer connections
    peerConnections.current.forEach((pc, socketId) => {
      pc.close();
    });
    peerConnections.current.clear();
    setCallParticipants(new Map());
    
    setIsInCall(false);
    
    // Notify server
    socketService.leaveCall();
    
    console.log('📞 Left call');
  }, [screenStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        socketService.toggleMedia('audio', audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      
      if (videoTrack) {
        // Toggle existing video track
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        socketService.toggleMedia('video', videoTrack.enabled);
        console.log('📹 Toggled video track:', videoTrack.enabled);
      } else {
        // No video track exists - need to get camera
        console.log('📹 No video track, requesting camera...');
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user'
            }
          });
          
          const newVideoTrack = videoStream.getVideoTracks()[0];
          if (newVideoTrack) {
            // Add the new video track to existing stream
            localStreamRef.current.addTrack(newVideoTrack);
            
            // Update state - need to create new stream reference to trigger re-render
            const updatedStream = new MediaStream(localStreamRef.current.getTracks());
            localStreamRef.current = updatedStream;
            setLocalStream(updatedStream);
            setIsVideoEnabled(true);
            socketService.toggleMedia('video', true);
            
            console.log('📹 Added new video track to stream');
          }
        } catch (error) {
          console.error('Failed to get camera:', error);
        }
      }
    }
  }, []);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      socketService.toggleScreenShare(false);
      
      // Replace screen track with camera track in all peer connections
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    } else {
      // Start screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });
        
        setScreenStream(stream);
        setIsScreenSharing(true);
        socketService.toggleScreenShare(true);
        
        // Replace camera track with screen track in all peer connections
        const screenTrack = stream.getVideoTracks()[0];
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });
        
        // Handle when user stops sharing via browser UI
        screenTrack.onended = () => {
          toggleScreenShare();
        };
      } catch (error) {
        console.error('Screen share error:', error);
      }
    }
  }, [isScreenSharing, screenStream]);

  // Set up WebRTC signaling listeners
  useEffect(() => {
    if (!isConnected) return;

    // New user joined the call
    socketService.onCallUserJoined(async ({ userId, userName, socketId }) => {
      console.log('📞 User joined call:', userName);
      
      if (!isInCall || !localStreamRef.current) return;
      
      // Create peer connection and send offer
      const pc = createPeerConnection(socketId, userId, userName);
      
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketService.sendOffer(socketId, offer);
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    });

    // User left the call
    socketService.onCallUserLeft(({ socketId }) => {
      console.log('📞 User left call');
      removePeerConnection(socketId);
    });

    // Received WebRTC offer
    socketService.onWebRTCOffer(async ({ fromUserId, fromUserName, fromSocketId, offer }) => {
      console.log('🔗 Received offer from:', fromUserName);
      
      if (!isInCall || !localStreamRef.current) return;
      
      const pc = createPeerConnection(fromSocketId, fromUserId, fromUserName);
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketService.sendAnswer(fromSocketId, answer);
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    // Received WebRTC answer
    socketService.onWebRTCAnswer(async ({ fromSocketId, answer }) => {
      console.log('🔗 Received answer');
      
      const pc = peerConnections.current.get(fromSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    });

    // Received ICE candidate
    socketService.onWebRTCIceCandidate(async ({ fromSocketId, candidate }) => {
      const pc = peerConnections.current.get(fromSocketId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    // Media toggle from remote user
    socketService.onCallMediaToggle(({ socketId, type, enabled }) => {
      setCallParticipants(prev => {
        const next = new Map(prev);
        const participant = next.get(socketId);
        if (participant) {
          next.set(socketId, {
            ...participant,
            [type === 'audio' ? 'audioEnabled' : 'videoEnabled']: enabled
          });
        }
        return next;
      });
    });

    // Screen share toggle from remote user
    socketService.onCallScreenShare(({ socketId, enabled }) => {
      setCallParticipants(prev => {
        const next = new Map(prev);
        const participant = next.get(socketId);
        if (participant) {
          next.set(socketId, {
            ...participant,
            isScreenSharing: enabled
          });
        }
        return next;
      });
    });

    return () => {
      // Clean up listeners
      socketService.removeListener('call-user-joined');
      socketService.removeListener('call-user-left');
      socketService.removeListener('webrtc-offer');
      socketService.removeListener('webrtc-answer');
      socketService.removeListener('webrtc-ice-candidate');
      socketService.removeListener('call-media-toggle');
      socketService.removeListener('call-screen-share');
    };
  }, [isConnected, isInCall, createPeerConnection, removePeerConnection]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isInCall) {
        leaveCall();
      }
    };
  }, []);

  const value = {
    // State
    isInCall,
    callParticipants,
    localStream,
    screenStream, // Expose screen stream for display
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    
    // Actions
    joinCall,
    leaveCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};

export default CallContext;
