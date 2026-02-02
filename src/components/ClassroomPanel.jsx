import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
        Mic,
        MicOff,
        Video,
        VideoOff,
        MonitorUp,
        Users,
        Send,
        Hand,
        Smile,
        PhoneOff,
        ChevronDown,
        ChevronRight,
        Phone
} from 'lucide-react';
import { useToast } from './ToastProvider';
import { useNavigate } from 'react-router-dom';
import { useCollaboration } from '../context/CollaborationContext';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';

// --- MOCK DATA (fallback for video) ---
const MOCK_VIDEO_USERS = [
        { id: 'mock1', name: "Demo User", role: "teacher", isSpeaking: false, isMuted: true, camOn: false, avatar: null },
];

const EMOJIS = ['👍', '❤️', '😊', '🎉', '🤔', '👏', '🔥', '💡', '✅', '👀'];

// --- SUB-COMPONENTS ---

// Video tile that can show real video stream or avatar fallback
const VideoTile = ({ user, stream, isLocal = false }) => {
        const videoRef = useRef(null);
        
        // Attach stream whenever it changes
        useEffect(() => {
                const video = videoRef.current;
                if (video && stream) {
                        video.srcObject = stream;
                        // Force play
                        video.play().catch(e => console.log('Autoplay blocked:', e));
                        
                        // Log stream info for debugging
                        console.log('🎥 VideoTile mounted with stream:', {
                                videoTracks: stream.getVideoTracks().length,
                                audioTracks: stream.getAudioTracks().length,
                                videoEnabled: stream.getVideoTracks()[0]?.enabled,
                                videoState: stream.getVideoTracks()[0]?.readyState
                        });
                }
                
                return () => {
                        if (video) {
                                video.srcObject = null;
                        }
                };
        }, [stream]);
        
        // Determine if we should show video or avatar
        const hasVideoTrack = stream?.getVideoTracks()?.length > 0;
        const showVideo = stream && hasVideoTrack && user?.videoEnabled !== false;
        
        return (
                <div className={`relative aspect-video bg-zinc-900/50 rounded-xl overflow-hidden border-2 transition-all duration-300 ${user?.isSpeaking ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/20 scale-[1.02]' : 'border-zinc-700/30 hover:border-zinc-600/50'}`}>
                        {/* Video element - always present when stream exists */}
                        {stream && (
                                <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted={isLocal}
                                        style={{ 
                                                display: showVideo ? 'block' : 'none',
                                                transform: isLocal ? 'scaleX(-1)' : 'none' // Mirror local video for natural look
                                        }}
                                        className="w-full h-full object-cover"
                                />
                        )}
                        
                        {/* Avatar fallback when no video */}
                        {!showVideo && (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 backdrop-blur-sm">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                                <span className="text-lg font-bold text-white">{(user?.name || user?.userName || 'U').charAt(0)}</span>
                                        </div>
                                </div>
                        )}

                        {user?.isSpeaking && (
                                <div className="absolute inset-0 border-2 border-indigo-500 rounded-xl pointer-events-none" />
                        )}

                        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] font-medium text-white flex items-center gap-2">
                                {user?.isScreenSharing ? (
                                        <MonitorUp className="w-3 h-3 text-emerald-400" />
                                ) : user?.audioEnabled === false || user?.isMuted ? (
                                        <MicOff className="w-3 h-3 text-red-400" />
                                ) : (
                                        <Mic className="w-3 h-3 text-emerald-400" />
                                )}
                                <span className="truncate max-w-[80px]">
                                        {user?.isScreenSharing ? 'Screen' : (isLocal ? 'You' : (user?.name || user?.userName || 'User'))}
                                </span>
                                {(user?.role === "teacher" || user?.isHost) && !user?.isScreenSharing && (
                                        <span className="text-indigo-300 text-[9px] uppercase font-bold tracking-wide px-1.5 py-0.5 bg-indigo-500/20 rounded">HOST</span>
                                )}
                        </div>

                        {user?.isScreenSharing && (
                                <div className="absolute top-2 right-2 bg-gradient-to-r from-indigo-500 to-purple-500 p-1.5 rounded-lg text-white shadow-lg">
                                        <MonitorUp className="w-4 h-4" />
                                </div>
                        )}
                </div>
        );
};

const ChatBubble = ({ msg, isNew, currentUserId }) => {
        // Handle both old format and new server format
        const senderName = msg.sender?.name || msg.sender || 'Unknown';
        const senderAvatar = msg.sender?.avatar || msg.avatar || null;
        const isInstructor = msg.sender?.role === 'teacher' || msg.isInstructor;
        const isOwnMessage = msg.sender?.id === currentUserId;
        const time = msg.timestamp 
                ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : msg.time || '';
        const text = msg.content || msg.text || '';
        
        const renderMessage = (text) => {
                if (!text.includes('```')) return text;

                const parts = text.split(/(```[\s\S]*?```)/);
                return parts.map((part, i) => {
                        if (part.startsWith('```')) {
                                const code = part.replace(/```\w*\n?/g, '').replace(/```/g, '');
                                return (
                                        <pre key={i} className="bg-zinc-900/80 rounded-lg p-2 mt-2 overflow-x-auto border border-zinc-700/50">
                                                <code className="text-xs font-mono text-emerald-400">{code}</code>
                                        </pre>
                                );
                        }
                        return <span key={i}>{part}</span>;
                });
        };

        return (
                <div className={`flex gap-3 mb-4 ${isNew ? 'animate-fade-in-up' : ''} ${isOwnMessage || isInstructor ? 'flex-row-reverse' : ''}`}>
                        {senderAvatar ? (
                                <img
                                        src={senderAvatar}
                                        alt={senderName}
                                        className="w-8 h-8 rounded-full border-2 border-zinc-700/50 shrink-0"
                                />
                        ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-bold text-white">{senderName.charAt(0)}</span>
                                </div>
                        )}
                        <div className={`flex flex-col gap-1 ${isOwnMessage || isInstructor ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                <div className="flex items-baseline gap-2">
                                        <span className={`text-[11px] font-bold ${isInstructor ? 'text-indigo-400' : isOwnMessage ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                                {isOwnMessage ? 'You' : senderName}
                                        </span>
                                        <span className="text-[9px] text-zinc-500">{time}</span>
                                </div>
                                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                        isOwnMessage 
                                                ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-100 border border-emerald-500/30 rounded-tr-sm'
                                                : isInstructor
                                                        ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-100 border border-indigo-500/30 rounded-tr-sm'
                                                        : 'bg-zinc-800/60 text-zinc-200 border border-zinc-700/40 rounded-tl-sm'
                                        }`}>
                                        {renderMessage(text)}
                                </div>
                        </div>
                </div>
        );
};

const TypingIndicator = ({ users }) => {
        const userNames = users.map(u => u.userName || u).filter(Boolean);
        if (userNames.length === 0) return null;
        
        return (
                <div className="flex items-center gap-2 text-xs text-zinc-500 px-3 py-2">
                        <div className="flex gap-1">
                                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span>{userNames.join(', ')} {userNames.length === 1 ? 'is' : 'are'} typing...</span>
                </div>
        );
};

const EmojiPicker = ({ onSelect, onClose }) => (
        <div className="absolute bottom-full left-0 mb-2 bg-zinc-800/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-2 shadow-2xl">
                <div className="grid grid-cols-5 gap-1">
                        {EMOJIS.map(emoji => (
                                <button
                                        key={emoji}
                                        onClick={() => { onSelect(emoji); onClose(); }}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-zinc-700/50 rounded-lg transition-colors text-lg"
                                >
                                        {emoji}
                                </button>
                        ))}
                </div>
        </div>
);

// Collapsible Section for Stream content
const StreamSection = ({ title, icon, defaultExpanded = true, children, badge }) => {
        const [isExpanded, setIsExpanded] = useState(defaultExpanded);
        
        return (
                <div className="mb-2">
                        <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="w-full flex items-center gap-2 py-1 hover:bg-zinc-800/30 rounded transition-colors group"
                        >
                                {isExpanded ? (
                                        <ChevronDown className="w-3 h-3 text-zinc-500" />
                                ) : (
                                        <ChevronRight className="w-3 h-3 text-zinc-500" />
                                )}
                                {icon}
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider group-hover:text-zinc-400 transition-colors">
                                        {title}
                                </span>
                                {badge && <span className="ml-auto text-[10px] text-zinc-600">{badge}</span>}
                        </button>
                        <div className={`overflow-hidden transition-all duration-200 ease-out ${isExpanded ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                                {children}
                        </div>
                </div>
        );
};

// --- MAIN COMPONENT ---

const ClassroomPanel = ({ onClose, isFullscreen = false, onToggleFullscreen }) => {
        const { user } = useAuth();
        const { 
                participants, 
                messages, 
                typingUsers, 
                sendMessage, 
                startTyping, 
                stopTyping,
                isConnected 
        } = useCollaboration();
        
        // Video call state from CallContext
        const {
                isInCall,
                callParticipants,
                localStream,
                screenStream,
                isAudioEnabled,
                isVideoEnabled,
                isScreenSharing,
                joinCall,
                leaveCall,
                toggleAudio,
                toggleVideo,
                toggleScreenShare
        } = useCall();
        
        const [activeTab, setActiveTab] = useState('stream');
        const [chatInput, setChatInput] = useState("");
        const [showEmoji, setShowEmoji] = useState(false);
        const chatEndRef = useRef(null);
        const typingTimeoutRef = useRef(null);
        const toast = useToast();
        const navigate = useNavigate();

        // Auto-scroll to new messages
        useEffect(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, [messages]);

        // Handle typing indicator with debounce
        const handleInputChange = (e) => {
                setChatInput(e.target.value);
                
                // Clear existing timeout
                if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                }
                
                // Start typing indicator
                startTyping();
                
                // Stop typing after 2 seconds of no input
                typingTimeoutRef.current = setTimeout(() => {
                        stopTyping();
                }, 2000);
        };

        const handleSendMessage = () => {
                if (!chatInput.trim()) return;
                
                console.log('💬 Attempting to send message:', chatInput.trim());
                console.log('🔗 Is connected:', isConnected);
                
                // Send via WebSocket
                sendMessage(chatInput.trim());
                setChatInput("");
                stopTyping();
                
                if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current);
                }
        };

        const handleEmojiSelect = (emoji) => {
                setChatInput(prev => prev + emoji);
        };

        const handleKeyPress = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                }
        };

        const handleMicToggle = () => {
                toggleAudio();
                toast.info(
                        isAudioEnabled ? 'Microphone Off' : 'Microphone On',
                        isAudioEnabled ? 'Your microphone is now muted' : 'Others can now hear you'
                );
        };

        const handleCamToggle = () => {
                toggleVideo();
                toast.info(
                        isVideoEnabled ? 'Camera Off' : 'Camera On',
                        isVideoEnabled ? 'Your camera is now off' : 'Others can now see you'
                );
        };

        const handleScreenShare = async () => {
                await toggleScreenShare();
                toast.info(
                        isScreenSharing ? 'Stopped Sharing' : 'Screen Sharing',
                        isScreenSharing ? 'You stopped sharing your screen' : 'You are now sharing your screen'
                );
        };

        const handleJoinCall = async () => {
                try {
                        await joinCall();
                        toast.success('Joined Call', 'You are now in the video call');
                } catch (error) {
                        toast.error('Call Error', 'Failed to join call. Check camera/mic permissions.');
                }
        };

        const handleLeaveCall = () => {
                if (isInCall) {
                        leaveCall();
                        toast.info('Left Call', 'You have left the video call');
                }
        };

        const handleLeaveSession = () => {
                if (isInCall) {
                        leaveCall();
                }
                toast.warning('Leaving Session', 'Disconnecting from the session...');
                localStorage.removeItem('codesync_current_session');
                setTimeout(() => navigate('/session'), 1000);
        };

        // Track unread messages when not on chat tab
        const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);
        const unreadCount = activeTab === 'chat' ? 0 : Math.max(0, messages.length - lastSeenMessageCount);
        
        // Reset unread count when switching to chat tab
        useEffect(() => {
                if (activeTab === 'chat') {
                        setLastSeenMessageCount(messages.length);
                }
        }, [activeTab, messages.length]);

        return (
                <div className="flex flex-col h-full bg-zinc-900/80 backdrop-blur-sm border-l border-indigo-500/20">

                        {/* PANEL HEADER */}
                        <div className="h-10 flex items-center justify-between px-3 bg-gradient-to-r from-zinc-800/50 to-indigo-900/20 border-b border-indigo-500/20 select-none">
                                <div className="flex gap-1">
                                        <button
                                                onClick={() => setActiveTab('stream')}
                                                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-lg transition-all ${activeTab === 'stream'
                                                                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                                                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/30'
                                                        }`}
                                        >
                                                Stream
                                        </button>
                                        <button
                                                onClick={() => setActiveTab('chat')}
                                                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'chat'
                                                                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                                                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/30'
                                                        }`}
                                        >
                                                Chat
                                                {unreadCount > 0 && activeTab !== 'chat' && (
                                                        <span className="w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                                                                {unreadCount}
                                                        </span>
                                                )}
                                        </button>
                                </div>
                                <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-zinc-400" />
                                        <span className="text-[11px] text-zinc-500 font-mono">
                                                {participants.length > 0 ? participants.length : '0'}/25
                                                {isConnected && <span className="ml-1 w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>}
                                        </span>
                                        {onToggleFullscreen && (
                                                <button
                                                        onClick={onToggleFullscreen}
                                                        className="p-1 hover:bg-indigo-500/20 rounded text-zinc-500 hover:text-indigo-400 transition-all duration-150"
                                                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Chat"}
                                                >
                                                        {isFullscreen ? (
                                                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                                                        <path d="M3 5v9h9V5H3zm8 8H4V6h7v7z"/>
                                                                        <path d="M5 5h1V4h7v7h-1v1h2V3H5v2z"/>
                                                                </svg>
                                                        ) : (
                                                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                                                        <path d="M3 3v10h10V3H3zm9 9H4V4h8v8z"/>
                                                                </svg>
                                                        )}
                                                </button>
                                        )}
                                        {onClose && !isFullscreen && (
                                                <button
                                                        onClick={onClose}
                                                        className="p-1 hover:bg-red-500/20 rounded text-zinc-500 hover:text-red-400 transition-all duration-150"
                                                        title="Close Classroom"
                                                >
                                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                                                <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/>
                                                        </svg>
                                                </button>
                                        )}
                                </div>
                        </div>

                        {/* SCROLLABLE CONTENT */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-1">
                                {activeTab === 'stream' && (
                                        <>
                                                {/* Join Call Button if not in call */}
                                                {!isInCall && (
                                                        <div className="mb-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/30">
                                                                <p className="text-zinc-400 text-sm mb-3 text-center">
                                                                        Join the video call to collaborate with others
                                                                </p>
                                                                <button
                                                                        onClick={handleJoinCall}
                                                                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                                                                >
                                                                        <Phone className="w-5 h-5" />
                                                                        Join Call
                                                                </button>
                                                        </div>
                                                )}

                                                {/* Your Video (Local Stream) */}
                                                {isInCall && localStream && (
                                                        <StreamSection 
                                                                title="Your Camera" 
                                                                icon={<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                                                                defaultExpanded={true}
                                                        >
                                                                <VideoTile 
                                                                        user={{
                                                                                name: user?.name || 'You',
                                                                                role: user?.role,
                                                                                audioEnabled: isAudioEnabled,
                                                                                videoEnabled: isVideoEnabled,
                                                                                isHost: true
                                                                        }}
                                                                        stream={localStream}
                                                                        isLocal={true}
                                                                />
                                                        </StreamSection>
                                                )}

                                                {/* Screen Share Preview */}
                                                {isInCall && isScreenSharing && screenStream && (
                                                        <StreamSection 
                                                                title="Your Screen Share" 
                                                                icon={<MonitorUp className="w-3 h-3 text-emerald-500" />}
                                                                defaultExpanded={true}
                                                        >
                                                                <VideoTile 
                                                                        user={{
                                                                                name: 'Screen Share',
                                                                                isScreenSharing: true,
                                                                                videoEnabled: true
                                                                        }}
                                                                        stream={screenStream}
                                                                        isLocal={true}
                                                                />
                                                        </StreamSection>
                                                )}

                                                {/* Remote Participants in Call */}
                                                {isInCall && callParticipants.size > 0 && (
                                                        <StreamSection 
                                                                title="In Call" 
                                                                icon={<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                                                                defaultExpanded={true}
                                                                badge={`${callParticipants.size}`}
                                                        >
                                                                <div className="grid grid-cols-2 gap-2">
                                                                        {Array.from(callParticipants.entries()).map(([socketId, participant]) => (
                                                                                <VideoTile 
                                                                                        key={socketId}
                                                                                        user={participant}
                                                                                        stream={participant.stream}
                                                                                />
                                                                        ))}
                                                                </div>
                                                        </StreamSection>
                                                )}

                                                {/* Session Participants (not necessarily in call) */}
                                                <StreamSection 
                                                        title="Session Participants" 
                                                        icon={<Users className="w-3 h-3 text-zinc-500" />}
                                                        defaultExpanded={!isInCall}
                                                        badge={`${participants.length}`}
                                                >
                                                        <div className="space-y-2">
                                                                {participants.length > 0 ? (
                                                                        participants.map(p => (
                                                                                <div key={p.id} className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded-lg">
                                                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                                                                                <span className="text-xs font-bold text-white">{(p.name || 'U').charAt(0)}</span>
                                                                                        </div>
                                                                                        <div className="flex-1 min-w-0">
                                                                                                <div className="text-sm text-zinc-300 truncate">{p.name || 'Unknown'}</div>
                                                                                                <div className="text-xs text-zinc-500">{p.role === 'teacher' ? 'Host' : 'Student'}</div>
                                                                                        </div>
                                                                                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
                                                                                </div>
                                                                        ))
                                                                ) : (
                                                                        <div className="text-center py-4 text-zinc-500 text-xs">
                                                                                No participants yet
                                                                        </div>
                                                                )}
                                                        </div>
                                                </StreamSection>
                                        </>
                                )}

                                {activeTab === 'chat' && (
                                        <div className="flex flex-col h-full">
                                                <div className="flex-1">
                                                        {messages.length === 0 ? (
                                                                <div className="flex flex-col items-center justify-center h-32 text-zinc-500">
                                                                        <span className="text-sm">No messages yet</span>
                                                                        <span className="text-xs">Start the conversation!</span>
                                                                </div>
                                                        ) : (
                                                                messages.map(msg => <ChatBubble key={msg.id} msg={msg} currentUserId={user?.id} />)
                                                        )}
                                                        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
                                                        <div ref={chatEndRef} />
                                                </div>
                                        </div>
                                )}
                        </div>

                        {/* BOTTOM CONTROLS */}
                        <div className="p-3 bg-zinc-800/30 border-t border-indigo-500/20">
                                {activeTab === 'chat' && (
                                        <div className="relative mb-3">
                                                {showEmoji && (
                                                        <EmojiPicker
                                                                onSelect={handleEmojiSelect}
                                                                onClose={() => setShowEmoji(false)}
                                                        />
                                                )}
                                                <div className="flex items-center gap-2 bg-zinc-800/50 border border-indigo-500/20 focus-within:border-indigo-500 rounded-xl transition-colors">
                                                        <button
                                                                onClick={() => setShowEmoji(!showEmoji)}
                                                                className="p-2 text-zinc-400 hover:text-amber-400 transition-colors"
                                                        >
                                                                <Smile className="w-4 h-4" />
                                                        </button>
                                                        <input
                                                                type="text"
                                                                value={chatInput}
                                                                onChange={handleInputChange}
                                                                onKeyPress={handleKeyPress}
                                                                placeholder="Type a message..."
                                                                className="flex-1 bg-transparent text-sm text-white py-2.5 focus:outline-none placeholder-zinc-500"
                                                        />
                                                        <button
                                                                onClick={handleSendMessage}
                                                                disabled={!chatInput.trim()}
                                                                className="p-2 text-indigo-400 hover:text-indigo-300 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                                <Send className="w-4 h-4" />
                                                        </button>
                                                </div>
                                        </div>
                                )}

                                <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                                <button
                                                        onClick={handleMicToggle}
                                                        disabled={!isInCall}
                                                        className={`p-2.5 rounded-xl transition-all duration-200 border ${
                                                                !isInCall 
                                                                        ? 'bg-zinc-700/20 text-zinc-500 border-zinc-700/30 cursor-not-allowed'
                                                                        : isAudioEnabled
                                                                                ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border-indigo-500/30'
                                                                                : 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border-red-500/30'
                                                                }`}
                                                        title={!isInCall ? 'Join call first' : isAudioEnabled ? "Mute" : "Unmute"}
                                                >
                                                        {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                                </button>
                                                <button
                                                        onClick={handleCamToggle}
                                                        disabled={!isInCall}
                                                        className={`p-2.5 rounded-xl transition-all duration-200 border ${
                                                                !isInCall 
                                                                        ? 'bg-zinc-700/20 text-zinc-500 border-zinc-700/30 cursor-not-allowed'
                                                                        : isVideoEnabled
                                                                                ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border-indigo-500/30'
                                                                                : 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border-red-500/30'
                                                                }`}
                                                        title={!isInCall ? 'Join call first' : isVideoEnabled ? "Stop Video" : "Start Video"}
                                                >
                                                        {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                                                </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                                <button
                                                        onClick={handleScreenShare}
                                                        disabled={!isInCall}
                                                        className={`p-2.5 rounded-xl transition-all border ${
                                                                !isInCall 
                                                                        ? 'bg-zinc-700/20 text-zinc-500 border-zinc-700/30 cursor-not-allowed'
                                                                        : isScreenSharing
                                                                                ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border-emerald-500/30'
                                                                                : 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border-indigo-500/30'
                                                                }`}
                                                        title={!isInCall ? 'Join call first' : isScreenSharing ? "Stop Sharing" : "Share Screen"}
                                                >
                                                        <MonitorUp className="w-4 h-4" />
                                                </button>
                                                {isInCall ? (
                                                        <button
                                                                onClick={handleLeaveCall}
                                                                className="p-2.5 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all border border-red-500/30"
                                                                title="Leave Call"
                                                        >
                                                                <PhoneOff className="w-4 h-4" />
                                                        </button>
                                                ) : (
                                                        <button
                                                                onClick={handleLeaveSession}
                                                                className="p-2.5 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all border border-red-500/30"
                                                                title="Leave Session"
                                                        >
                                                                <PhoneOff className="w-4 h-4" />
                                                        </button>
                                                )}
                                        </div>
                                </div>
                        </div>

                        <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
                </div>
        );
};

export default ClassroomPanel;