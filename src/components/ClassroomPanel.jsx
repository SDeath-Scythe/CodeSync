import React, { useState, useRef, useEffect } from 'react';
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
        PhoneOff
} from 'lucide-react';
import { useToast } from './ToastProvider';
import { useNavigate } from 'react-router-dom';

// --- MOCK DATA ---
const PARTICIPANTS = [
        { id: 1, name: "Mr. Davis", role: "Instructor", isSpeaking: true, isMuted: false, camOn: true, avatar: "https://i.pravatar.cc/150?u=davis" },
        { id: 2, name: "Sarah K.", role: "Student", isSpeaking: false, isMuted: true, camOn: true, avatar: "https://i.pravatar.cc/150?u=sarah" },
        { id: 3, name: "Mike T.", role: "Student", isSpeaking: false, isMuted: false, camOn: false, avatar: "https://i.pravatar.cc/150?u=mike" },
        { id: 4, name: "Alex R.", role: "Student", isSpeaking: false, isMuted: true, camOn: true, avatar: "https://i.pravatar.cc/150?u=alex" },
];

const INITIAL_MESSAGES = [
        { id: 1, sender: "Mike T.", text: "Line 24 is confusing...", time: "10:42 AM", avatar: "https://i.pravatar.cc/150?u=mike" },
        { id: 2, sender: "Mr. Davis", text: "Check the props being passed. The state isn't updating because you're not spreading the previous state.", time: "10:43 AM", isInstructor: true, avatar: "https://i.pravatar.cc/150?u=davis" },
        { id: 3, sender: "Sarah K.", text: "Oh, I see it now! Thanks!", time: "10:44 AM", avatar: "https://i.pravatar.cc/150?u=sarah" },
        { id: 4, sender: "Mr. Davis", text: "```jsx\nsetState(prev => ({...prev, count: prev.count + 1}))\n```", time: "10:45 AM", isInstructor: true, avatar: "https://i.pravatar.cc/150?u=davis" },
];

const EMOJIS = ['👍', '❤️', '😊', '🎉', '🤔', '👏', '🔥', '💡', '✅', '👀'];

// --- SUB-COMPONENTS ---

const VideoTile = ({ user }) => (
        <div className={`relative aspect-video bg-zinc-900/50 rounded-xl overflow-hidden border-2 transition-all duration-300 ${user.isSpeaking ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/20 scale-[1.02]' : 'border-zinc-700/30 hover:border-zinc-600/50'}`}>
                {user.camOn ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover opacity-90" />
                ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 backdrop-blur-sm">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                        <span className="text-lg font-bold text-white">{user.name.charAt(0)}</span>
                                </div>
                        </div>
                )}

                {user.isSpeaking && (
                        <div className="absolute inset-0 border-2 border-indigo-500 rounded-xl pointer-events-none" />
                )}

                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] font-medium text-white flex items-center gap-2">
                        {user.isMuted ? <MicOff className="w-3 h-3 text-red-400" /> : <Mic className="w-3 h-3 text-emerald-400" />}
                        <span className="truncate max-w-[80px]">{user.name}</span>
                        {user.role === "Instructor" && (
                                <span className="text-indigo-300 text-[9px] uppercase font-bold tracking-wide px-1.5 py-0.5 bg-indigo-500/20 rounded">HOST</span>
                        )}
                </div>

                {user.id === 2 && (
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 p-1.5 rounded-lg text-white shadow-lg animate-bounce">
                                <Hand className="w-4 h-4" />
                        </div>
                )}
        </div>
);

const ChatBubble = ({ msg, isNew }) => {
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
                <div className={`flex gap-3 mb-4 ${isNew ? 'animate-fade-in-up' : ''} ${msg.isInstructor ? 'flex-row-reverse' : ''}`}>
                        <img
                                src={msg.avatar}
                                alt={msg.sender}
                                className="w-8 h-8 rounded-full border-2 border-zinc-700/50 shrink-0"
                        />
                        <div className={`flex flex-col gap-1 ${msg.isInstructor ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                <div className="flex items-baseline gap-2">
                                        <span className={`text-[11px] font-bold ${msg.isInstructor ? 'text-indigo-400' : 'text-zinc-300'}`}>
                                                {msg.sender}
                                        </span>
                                        <span className="text-[9px] text-zinc-500">{msg.time}</span>
                                </div>
                                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${msg.isInstructor
                                                ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-100 border border-indigo-500/30 rounded-tr-sm'
                                                : 'bg-zinc-800/60 text-zinc-200 border border-zinc-700/40 rounded-tl-sm'
                                        }`}>
                                        {renderMessage(msg.text)}
                                </div>
                        </div>
                </div>
        );
};

const TypingIndicator = ({ users }) => (
        <div className="flex items-center gap-2 text-xs text-zinc-500 px-3 py-2">
                <div className="flex gap-1">
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>{users.join(', ')} {users.length === 1 ? 'is' : 'are'} typing...</span>
        </div>
);

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

// --- MAIN COMPONENT ---

const ClassroomPanel = () => {
        const [activeTab, setActiveTab] = useState('stream');
        const [micOn, setMicOn] = useState(false);
        const [camOn, setCamOn] = useState(true);
        const [isScreenSharing, setIsScreenSharing] = useState(false);
        const [chatInput, setChatInput] = useState("");
        const [messages, setMessages] = useState(INITIAL_MESSAGES);
        const [showEmoji, setShowEmoji] = useState(false);
        const [typingUsers, setTypingUsers] = useState(['Sarah K.']);
        const chatEndRef = useRef(null);
        const toast = useToast();
        const navigate = useNavigate();

        useEffect(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, [messages]);

        useEffect(() => {
                const timer = setTimeout(() => setTypingUsers([]), 5000);
                return () => clearTimeout(timer);
        }, []);

        const handleSendMessage = () => {
                if (!chatInput.trim()) return;

                const newMessage = {
                        id: Date.now(),
                        sender: "You",
                        text: chatInput,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        avatar: "https://i.pravatar.cc/150?u=you",
                        isNew: true
                };

                setMessages(prev => [...prev, newMessage]);
                setChatInput("");
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
                setMicOn(!micOn);
                toast.info(
                        micOn ? 'Microphone Off' : 'Microphone On',
                        micOn ? 'Your microphone is now muted' : 'Others can now hear you'
                );
        };

        const handleCamToggle = () => {
                setCamOn(!camOn);
                toast.info(
                        camOn ? 'Camera Off' : 'Camera On',
                        camOn ? 'Your camera is now off' : 'Others can now see you'
                );
        };

        const handleScreenShare = () => {
                setIsScreenSharing(!isScreenSharing);
                toast.info(
                        isScreenSharing ? 'Stopped Sharing' : 'Screen Sharing',
                        isScreenSharing ? 'You stopped sharing your screen' : 'You are now sharing your screen'
                );
        };

        const handleLeaveCall = () => {
                toast.warning('Leaving Session', 'Disconnecting from the call...');
                setTimeout(() => navigate('/'), 1000);
        };

        const unreadCount = 3;

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
                                        <span className="text-[11px] text-zinc-500 font-mono">{PARTICIPANTS.length}/25</span>
                                </div>
                        </div>

                        {/* SCROLLABLE CONTENT */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3">
                                {activeTab === 'stream' && (
                                        <>
                                                <div className="mb-2">
                                                        <span className="text-[10px] text-zinc-500 font-bold mb-2 block uppercase tracking-wider flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                                Active Speaker
                                                        </span>
                                                        <VideoTile user={PARTICIPANTS[0]} />
                                                </div>

                                                <span className="text-[10px] text-zinc-500 font-bold mb-1 block uppercase tracking-wider">Participants</span>
                                                <div className="grid grid-cols-2 gap-2">
                                                        {PARTICIPANTS.slice(1).map(user => (
                                                                <VideoTile key={user.id} user={user} />
                                                        ))}
                                                </div>
                                        </>
                                )}

                                {activeTab === 'chat' && (
                                        <div className="flex flex-col h-full">
                                                <div className="flex-1">
                                                        {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}
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
                                                                onChange={(e) => setChatInput(e.target.value)}
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
                                                        className={`p-2.5 rounded-xl transition-all duration-200 border ${micOn
                                                                        ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border-indigo-500/30'
                                                                        : 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border-red-500/30'
                                                                }`}
                                                        title={micOn ? "Mute" : "Unmute"}
                                                >
                                                        {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                                </button>
                                                <button
                                                        onClick={handleCamToggle}
                                                        className={`p-2.5 rounded-xl transition-all duration-200 border ${camOn
                                                                        ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border-indigo-500/30'
                                                                        : 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border-red-500/30'
                                                                }`}
                                                        title={camOn ? "Stop Video" : "Start Video"}
                                                >
                                                        {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                                                </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                                <button
                                                        onClick={handleScreenShare}
                                                        className={`p-2.5 rounded-xl transition-all border ${isScreenSharing
                                                                        ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border-emerald-500/30'
                                                                        : 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border-indigo-500/30'
                                                                }`}
                                                        title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                                                >
                                                        <MonitorUp className="w-4 h-4" />
                                                </button>
                                                <button
                                                        onClick={handleLeaveCall}
                                                        className="p-2.5 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all border border-red-500/30"
                                                        title="Leave Call"
                                                >
                                                        <PhoneOff className="w-4 h-4" />
                                                </button>
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