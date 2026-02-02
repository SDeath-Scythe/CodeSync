import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
        Mic,
        MicOff,
        Video,
        Grid,
        Layout,
        Play,
        Pause,
        Clock,
        Volume2,
        VolumeX,
        Lock,
        Unlock,
        MessageCircle,
        Users,
        BarChart2,
        ChevronRight,
        Code2,
        Zap,
        Radio,
        Copy,
        Check,
        LogOut,
        UserPlus,
        ArrowLeft
} from 'lucide-react';
import StudentCard from '../components/StudentCard';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { DashboardProvider, useDashboard } from '../context/DashboardContext';

// Inner component that uses the dashboard context
const DashboardContent = () => {
        const navigate = useNavigate();
        const toast = useToast();
        const { user, logout } = useAuth();
        
        // Get session from localStorage
        const [session, setSession] = useState(null);
        
        useEffect(() => {
                const storedSession = localStorage.getItem('codesync_current_session');
                if (storedSession) {
                        setSession(JSON.parse(storedSession));
                } else {
                        // No session, redirect to hub
                        navigate('/hub');
                }
        }, [navigate]);

        // Dashboard context for real-time data
        const {
                students,
                formattedTime,
                isSessionPaused,
                isConnected,
                activeCount,
                idleCount,
                errorCount,
                totalCount,
                muteStudent,
                muteAllStudents,
                lockEditors,
                focusStudent,
                pauseSession
        } = useDashboard();

        // Local state
        const [allMuted, setAllMuted] = useState(false);
        const [editorsLocked, setEditorsLocked] = useState(false);
        const [layoutMode, setLayoutMode] = useState('grid');
        const [copiedCode, setCopiedCode] = useState(false);
        const [showBroadcastModal, setShowBroadcastModal] = useState(false);
        const [broadcastMessage, setBroadcastMessage] = useState('');

        const sessionCode = session?.code || 'Loading...';

        const handleCardClick = (id) => {
                focusStudent(id);
        };

        const handleCopyCode = () => {
                navigator.clipboard.writeText(sessionCode);
                setCopiedCode(true);
                toast.success('Copied!', `Session code ${sessionCode} copied to clipboard`);
                setTimeout(() => setCopiedCode(false), 2000);
        };

        const handleMuteAll = () => {
                const newMuted = !allMuted;
                setAllMuted(newMuted);
                muteAllStudents(newMuted);
                toast.info(
                        newMuted ? 'Students Muted' : 'Students Unmuted',
                        newMuted ? 'All student microphones are muted' : 'All students can now speak'
                );
        };

        const handleLockEditors = () => {
                const newLocked = !editorsLocked;
                setEditorsLocked(newLocked);
                lockEditors(newLocked);
                toast.warning(
                        newLocked ? 'Editors Locked' : 'Editors Unlocked',
                        newLocked ? 'Students cannot edit code until unlocked' : 'Students can now edit their code'
                );
        };

        const handleBroadcastMessage = () => {
                setShowBroadcastModal(true);
        };

        const sendBroadcast = () => {
                if (broadcastMessage.trim()) {
                        toast.success('Message Sent', 'Your message has been broadcast to all students');
                        setBroadcastMessage('');
                        setShowBroadcastModal(false);
                }
        };

        const handlePauseSession = () => {
                pauseSession();
                toast.info(
                        isSessionPaused ? 'Session Resumed' : 'Session Paused',
                        isSessionPaused ? 'The session timer is now running' : 'The session timer has been paused'
                );
        };

        const handleStudentClick = (id) => {
                const student = students.find(s => s.id === id);
                focusStudent(id);
                
                if (student && !student.enlarged) {
                        toast.info('Student Focused', `Now viewing ${student.name?.split("'")[0] || student.name}'s code`);
                }
        };

        const handleViewStudentCode = (student) => {
                toast.success('Opening Editor', `Loading ${student.name?.split("'")[0] || student.name}'s workspace...`);
                localStorage.setItem('codesync_view_student', JSON.stringify(student));
                setTimeout(() => navigate('/editor'), 500);
        };

        const handleMessageStudent = (student) => {
                toast.info('Direct Message', `Opening chat with ${student.name?.split("'")[0] || student.name}...`);
        };

        const handleMuteStudent = (student) => {
                const newMuted = !student.muted;
                muteStudent(student.id, newMuted);
                toast.info(
                        newMuted ? 'Student Muted' : 'Student Unmuted',
                        newMuted 
                                ? `${student.name?.split("'")[0] || student.name}'s microphone is muted` 
                                : `${student.name?.split("'")[0] || student.name} can now speak`
                );
        };

        const handleGoToEditor = () => {
                navigate('/editor');
        };

        const handleEndSession = () => {
                if (confirm('Are you sure you want to end this session?')) {
                        localStorage.removeItem('codesync_current_session');
                        toast.info('Session Ended', 'The coding session has been ended');
                        navigate('/hub');
                }
        };

        return (
                <div className="flex flex-col h-screen w-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 text-white font-sans overflow-hidden">

                        {/* HEADER */}
                        <header className="h-16 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-700/50 flex items-center justify-between px-6 shrink-0 relative z-50">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 via-transparent to-purple-600/5 pointer-events-none" />
                                
                                <div className="flex items-center gap-4 z-10">
                                        <button
                                                onClick={() => navigate('/hub')}
                                                className="p-2 hover:bg-zinc-800/50 rounded-lg transition-colors"
                                                title="Back to Hub"
                                        >
                                                <ArrowLeft className="w-5 h-5 text-zinc-400" />
                                        </button>
                                        <div className="flex items-center gap-3 cursor-pointer group" onClick={handleGoToEditor}>
                                                <div className="relative">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                                                <Code2 className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900">
                                                                <Zap className="w-1.5 h-1.5 text-white absolute top-0.5 left-0.5" />
                                                        </div>
                                                </div>
                                                <div>
                                                        <span className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors">
                                                                {session?.title || 'Teacher Dashboard'}
                                                        </span>
                                                        <p className="text-[10px] text-zinc-500">Click to open editor</p>
                                                </div>
                                        </div>
                                </div>

                                {/* Session Timer - Center */}
                                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
                                        <div className="flex items-center gap-3 bg-zinc-800/60 backdrop-blur-sm px-5 py-2.5 rounded-2xl border border-zinc-700/50">
                                                <div className="relative">
                                                        <div className={`w-3 h-3 rounded-full ${isSessionPaused ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                        {!isSessionPaused && <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping" />}
                                                </div>
                                                <Clock className="w-4 h-4 text-indigo-400" />
                                                <span className="font-mono text-xl font-bold text-white tabular-nums">{formattedTime}</span>
                                                <button
                                                        onClick={handlePauseSession}
                                                        className={`p-2 rounded-xl transition-all ${isSessionPaused ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30' : 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'}`}
                                                >
                                                        {isSessionPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                                                </button>
                                        </div>
                                </div>

                                {/* Right Actions */}
                                <div className="flex items-center gap-3 z-10">
                                        <div className="flex items-center gap-2 mr-2">
                                                <button
                                                        onClick={handleMuteAll}
                                                        className={`p-2.5 rounded-xl transition-all ${allMuted ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-indigo-400 hover:border-indigo-500/30'}`}
                                                        title={allMuted ? "Unmute All" : "Mute All"}
                                                >
                                                        {allMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                                </button>
                                                <button
                                                        onClick={handleLockEditors}
                                                        className={`p-2.5 rounded-xl transition-all ${editorsLocked ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-indigo-400 hover:border-indigo-500/30'}`}
                                                        title={editorsLocked ? "Unlock Editors" : "Lock Editors"}
                                                >
                                                        {editorsLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                                </button>
                                                <button
                                                        onClick={handleBroadcastMessage}
                                                        className="p-2.5 bg-zinc-800/50 rounded-xl text-zinc-400 hover:text-indigo-400 border border-zinc-700/50 hover:border-indigo-500/30 transition-all"
                                                        title="Broadcast Message"
                                                >
                                                        <MessageCircle className="w-4 h-4" />
                                                </button>
                                        </div>

                                        <div className="h-8 w-px bg-zinc-700/50" />

                                        <button
                                                onClick={() => setLayoutMode('grid')}
                                                className={`p-2.5 rounded-xl transition-all ${layoutMode === 'grid' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-indigo-400'}`}
                                        >
                                                <Grid className="w-4 h-4" />
                                        </button>
                                        <button
                                                onClick={() => setLayoutMode('list')}
                                                className={`p-2.5 rounded-xl transition-all ${layoutMode === 'list' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-indigo-400'}`}
                                        >
                                                <Layout className="w-4 h-4" />
                                        </button>

                                        <div className="h-8 w-px bg-zinc-700/50" />

                                        <button
                                                onClick={handleEndSession}
                                                className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-all"
                                                title="End Session"
                                        >
                                                <LogOut className="w-4 h-4" />
                                        </button>
                                </div>
                        </header>

                        {/* MAIN CONTENT */}
                        <div className="flex flex-1 overflow-hidden">

                                {/* LEFT SIDEBAR */}
                                <div className="w-72 bg-zinc-900/80 backdrop-blur-sm border-r border-zinc-700/50 flex flex-col shrink-0">

                                        {/* Instructor Cam */}
                                        <div className="p-4 border-b border-zinc-700/50">
                                                <div className="aspect-video bg-zinc-800/50 rounded-xl relative overflow-hidden border border-zinc-700/50 shadow-lg group">
                                                        {user?.avatar ? (
                                                                <img
                                                                        src={user.avatar}
                                                                        alt="Instructor"
                                                                        className="w-full h-full object-cover"
                                                                />
                                                        ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600">
                                                                        <span className="text-4xl font-bold text-white">
                                                                                {user?.name?.charAt(0) || 'T'}
                                                                        </span>
                                                                </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-[11px] text-white flex items-center gap-2">
                                                                <div className="relative">
                                                                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                                                                        <div className="absolute inset-0 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                                                </div>
                                                                {user?.name || 'Teacher'}
                                                                <span className="text-indigo-300 text-[9px] font-bold bg-indigo-500/30 px-1.5 py-0.5 rounded">YOU</span>
                                                        </div>
                                                        <div className="absolute top-2 right-2 flex gap-1">
                                                                <div className="bg-emerald-500 p-1.5 rounded-lg shadow-lg"><Mic className="w-3 h-3 text-white" /></div>
                                                                <div className="bg-indigo-500 p-1.5 rounded-lg shadow-lg"><Video className="w-3 h-3 text-white" /></div>
                                                        </div>
                                                </div>
                                        </div>

                                        {/* Session Code */}
                                        <div className="p-4 border-b border-zinc-700/50">
                                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                        <Radio className="w-3 h-3" /> Session Code
                                                </h3>
                                                <button
                                                        onClick={handleCopyCode}
                                                        className="w-full flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 hover:border-indigo-500/30 rounded-xl px-4 py-3 transition-all group"
                                                >
                                                        <span className="font-mono text-lg font-bold text-white tracking-widest">{sessionCode}</span>
                                                        {copiedCode ? (
                                                                <Check className="w-4 h-4 text-emerald-400" />
                                                        ) : (
                                                                <Copy className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                                                        )}
                                                </button>
                                        </div>

                                        {/* Session Stats */}
                                        <div className="p-4 border-b border-zinc-700/50">
                                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <BarChart2 className="w-3 h-3" /> Session Stats
                                                </h3>
                                                <div className="grid grid-cols-3 gap-2">
                                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center hover:bg-emerald-500/20 transition-all cursor-pointer">
                                                                <div className="text-2xl font-bold text-emerald-400">{activeCount}</div>
                                                                <div className="text-[9px] text-emerald-400/70 uppercase font-semibold">Active</div>
                                                        </div>
                                                        <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-3 text-center hover:bg-zinc-500/20 transition-all cursor-pointer">
                                                                <div className="text-2xl font-bold text-zinc-400">{idleCount}</div>
                                                                <div className="text-[9px] text-zinc-400/70 uppercase font-semibold">Idle</div>
                                                        </div>
                                                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center hover:bg-red-500/20 transition-all cursor-pointer">
                                                                <div className="text-2xl font-bold text-red-400">{errorCount}</div>
                                                                <div className="text-[9px] text-red-400/70 uppercase font-semibold">Errors</div>
                                                        </div>
                                                </div>
                                        </div>

                                        {/* Student List */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                                                <div className="p-4">
                                                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                                                                <span className="flex items-center gap-2">
                                                                        <Users className="w-3 h-3" /> Students ({totalCount})
                                                                </span>
                                                        </h3>
                                                        {students.length === 0 ? (
                                                                <div className="text-center py-8">
                                                                        <UserPlus className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                                                                        <p className="text-sm text-zinc-500 mb-1">No students yet</p>
                                                                        <p className="text-xs text-zinc-600">Share the session code</p>
                                                                </div>
                                                        ) : (
                                                                <div className="space-y-1">
                                                                        {students.map((student) => (
                                                                                <div
                                                                                        key={student.id}
                                                                                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer group transition-all ${student.enlarged ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-zinc-800/50 border border-transparent hover:border-zinc-700/50'}`}
                                                                                        onClick={() => handleStudentClick(student.id)}
                                                                                        onDoubleClick={() => handleViewStudentCode(student)}
                                                                                >
                                                                                        <div className="flex items-center gap-3">
                                                                                                <div className={`w-2.5 h-2.5 rounded-full ${student.status === 'active' ? 'bg-emerald-500' :
                                                                                                                student.status === 'typing' ? 'bg-blue-500 animate-pulse' :
                                                                                                                        student.status === 'error' ? 'bg-red-500' :
                                                                                                                                'bg-zinc-600'
                                                                                                        }`} />
                                                                                                <span className="text-sm text-zinc-300 group-hover:text-white truncate max-w-[140px] font-medium">
                                                                                                        {student.name?.split("'")[0] || student.name}
                                                                                                </span>
                                                                                        </div>
                                                                                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                                                                                </div>
                                                                        ))}
                                                                </div>
                                                        )}
                                                </div>
                                        </div>
                                </div>

                                {/* CENTER: Student Cards Grid */}
                                <div className="flex-1 bg-zinc-950/30 p-6 overflow-y-auto custom-scrollbar">
                                        {editorsLocked && (
                                                <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                                                        <Lock className="w-5 h-5 text-amber-400" />
                                                        <span className="text-sm text-amber-200 font-medium">Student editors are currently locked. Students cannot edit their code.</span>
                                                </div>
                                        )}
                                        
                                        {students.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full text-center">
                                                        <div className="w-20 h-20 bg-zinc-800/50 rounded-2xl flex items-center justify-center mb-4">
                                                                <Users className="w-10 h-10 text-zinc-600" />
                                                        </div>
                                                        <h3 className="text-xl font-bold text-zinc-400 mb-2">Waiting for Students</h3>
                                                        <p className="text-zinc-500 mb-6 max-w-md">
                                                                Share the session code <span className="font-mono text-indigo-400 font-bold">{sessionCode}</span> with your students to get started.
                                                        </p>
                                                        <button
                                                                onClick={handleCopyCode}
                                                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl transition-colors"
                                                        >
                                                                <Copy className="w-4 h-4" />
                                                                Copy Session Code
                                                        </button>
                                                </div>
                                        ) : (
                                                <div className={`grid gap-4 pb-10 ${layoutMode === 'grid'
                                                                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                                                : 'grid-cols-1 lg:grid-cols-2'
                                                        }`}>
                                                        {students.map(student => (
                                                                <StudentCard
                                                                        key={student.id}
                                                                        student={student}
                                                                        onClick={handleCardClick}
                                                                        onViewCode={handleViewStudentCode}
                                                                        onMessage={handleMessageStudent}
                                                                        onMute={handleMuteStudent}
                                                                />
                                                        ))}
                                                </div>
                                        )}
                                </div>

                        </div>

                        {/* FOOTER */}
                        <div className="h-10 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 border-t border-indigo-500/50 flex items-center px-6 justify-between shrink-0 shadow-lg relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                                
                                <div className="flex items-center gap-4 text-xs text-indigo-100 relative z-10">
                                        <span className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                                                {isConnected ? `Connected: ${totalCount}/25` : 'Connecting...'}
                                        </span>
                                        <span className="opacity-50">|</span>
                                        <span>Session: <span className="font-mono font-bold">{sessionCode}</span></span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-indigo-200 relative z-10">
                                        <span className="flex items-center gap-2">
                                                <Clock className="w-3 h-3" />
                                                Duration: {formattedTime}
                                        </span>
                                        {isSessionPaused && (
                                                <span className="bg-amber-500/30 text-amber-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase">Paused</span>
                                        )}
                                </div>
                                
                                <style>{`
                                        @keyframes shimmer {
                                                100% { transform: translateX(100%); }
                                        }
                                `}</style>
                        </div>

                        {/* Broadcast Message Modal */}
                        {showBroadcastModal && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                                        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                                        <MessageCircle className="w-5 h-5 text-indigo-400" />
                                                        Broadcast Message
                                                </h3>
                                                <textarea
                                                        value={broadcastMessage}
                                                        onChange={(e) => setBroadcastMessage(e.target.value)}
                                                        placeholder="Type your message to all students..."
                                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none h-32"
                                                />
                                                <div className="flex gap-3 mt-4">
                                                        <button
                                                                onClick={() => setShowBroadcastModal(false)}
                                                                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors"
                                                        >
                                                                Cancel
                                                        </button>
                                                        <button
                                                                onClick={sendBroadcast}
                                                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors"
                                                        >
                                                                Send to All
                                                        </button>
                                                </div>
                                        </div>
                                </div>
                        )}

                </div>
        );
};

// Main component that wraps with DashboardProvider
const MasterDashboard = () => {
        const [sessionCode, setSessionCode] = useState(null);
        const navigate = useNavigate();
        
        useEffect(() => {
                const storedSession = localStorage.getItem('codesync_current_session');
                if (storedSession) {
                        const session = JSON.parse(storedSession);
                        setSessionCode(session.code);
                } else {
                        navigate('/hub');
                }
        }, [navigate]);

        if (!sessionCode) {
                return (
                        <div className="flex items-center justify-center h-screen bg-zinc-950">
                                <div className="text-center">
                                        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-zinc-400">Loading session...</p>
                                </div>
                        </div>
                );
        }

        return (
                <DashboardProvider sessionCode={sessionCode}>
                        <DashboardContent />
                </DashboardProvider>
        );
};

export default MasterDashboard;