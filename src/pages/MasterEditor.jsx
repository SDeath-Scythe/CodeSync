import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import SideBar from '../components/SideBar'
import CodeEditor from '../components/CodeEdtor'
import ClassroomPanel from '../components/ClassroomPanel'
import StatusBar from '../components/StatusBar'
import ResizablePanel from '../components/ResizablePanel'
import { FileSystemProvider } from '../context/FileSystemContext'
import { useCollaboration } from '../context/CollaborationContext'
import { useToast } from '../components/ToastProvider'

// Maximize icon
const MaximizeIcon = () => (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 3v10h10V3H3zm9 9H4V4h8v8z"/>
        </svg>
);

// Minimize/restore icon
const RestoreIcon = () => (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 5v9h9V5H3zm8 8H4V6h7v7z"/>
                <path d="M5 5h1V4h7v7h-1v1h2V3H5v2z"/>
        </svg>
);

// Close button component
const CloseButton = ({ onClick, title }) => (
        <button
                onClick={onClick}
                className="p-1 hover:bg-red-500/20 rounded text-[#6c7086] hover:text-red-400 transition-all duration-150"
                title={title}
        >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/>
                </svg>
        </button>
);

// Panel header wrapper with close button
const PanelHeader = ({ title, onClose, children, className = '' }) => (
        <div className={`flex items-center justify-between px-3 py-2 border-b border-[#313244] bg-[#181825]/50 ${className}`}>
                <span className="text-xs font-semibold text-[#89b4fa] uppercase tracking-wider">{title}</span>
                <div className="flex items-center gap-1">
                        {children}
                        <CloseButton onClick={onClose} title={`Close ${title}`} />
                </div>
        </div>
);

function MasterEditor() {
        const navigate = useNavigate();
        const toast = useToast();
        const { joinSession, currentSession, participants, isConnected } = useCollaboration();
        
        const [showSidebar, setShowSidebar] = useState(true);
        const [showClassroom, setShowClassroom] = useState(true);
        const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
        const [classroomCollapsed, setClassroomCollapsed] = useState(false);
        const [fullscreenMode, setFullscreenMode] = useState(null); // null, 'code', or 'classroom'
        const [sessionInfo, setSessionInfo] = useState(null);

        // Load session from localStorage and join
        useEffect(() => {
                const storedSession = localStorage.getItem('codesync_current_session');
                if (storedSession) {
                        try {
                                const session = JSON.parse(storedSession);
                                setSessionInfo(session);
                                joinSession(session.code);
                                toast.success('Connected', `Joined session: ${session.title}`);
                        } catch (err) {
                                console.error('Failed to parse session:', err);
                                toast.error('Error', 'Invalid session data');
                                navigate('/session');
                        }
                } else {
                        // No session, redirect to session hub
                        toast.warning('No Session', 'Please join or create a session first');
                        navigate('/session');
                }
        }, []);

        const handleSidebarCollapse = useCallback((collapsed) => {
                setSidebarCollapsed(collapsed);
        }, []);

        const handleClassroomCollapse = useCallback((collapsed) => {
                setClassroomCollapsed(collapsed);
        }, []);

        const toggleFullscreen = useCallback((mode) => {
                setFullscreenMode(prev => prev === mode ? null : mode);
        }, []);

        // Determine what to show based on fullscreen mode
        const showSidebarPanel = fullscreenMode === null && showSidebar;
        const showCodeEditor = fullscreenMode !== 'classroom';
        const showClassroomPanel = fullscreenMode === 'classroom' || (fullscreenMode === null && showClassroom);

        return (
                <FileSystemProvider>
                <div className="flex flex-col h-screen w-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 text-white overflow-hidden font-sans">
                        
                        {/* TopBar */}
                        <div className="shrink-0 z-50">
                                <TopBar />
                        </div>

                        {/* Main Content */}
                        <div className="flex flex-1 overflow-hidden relative">
                                
                                {/* File Explorer Sidebar - Resizable */}
                                {showSidebarPanel && (
                                        <ResizablePanel
                                                side="right"
                                                defaultSize={256}
                                                minSize={180}
                                                maxSize={400}
                                                collapsible={true}
                                                defaultCollapsed={false}
                                                title="Explorer"
                                                onCollapse={handleSidebarCollapse}
                                                className="h-full"
                                        >
                                                <SideBar onClose={() => setShowSidebar(false)} />
                                        </ResizablePanel>
                                )}

                                {/* Code Editor - Main Area */}
                                {showCodeEditor && (
                                        <div className={`${fullscreenMode === 'code' ? 'flex-1' : 'flex-1'} h-full min-w-0 bg-zinc-900/50 backdrop-blur-sm relative`}>
                                                <CodeEditor 
                                                        isFullscreen={fullscreenMode === 'code'}
                                                        onToggleFullscreen={() => toggleFullscreen('code')}
                                                />
                                                
                                                {/* Explorer restore button - positioned on the left edge, vertically centered */}
                                                {!showSidebar && fullscreenMode === null && (
                                                        <button
                                                                onClick={() => setShowSidebar(true)}
                                                                className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#1e1e2e] hover:bg-[#313244] border border-[#313244] border-l-0 hover:border-[#89b4fa] text-[#6c7086] hover:text-[#89b4fa] px-2 py-3 rounded-r-lg text-xs font-semibold shadow-lg transition-all duration-200 hover:scale-105 flex flex-col items-center gap-1.5 z-10"
                                                                title="Show Explorer"
                                                        >
                                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                                                        <path d="M14.5 3H7.71l-1-1H1.5l-.5.5v11l.5.5h13l.5-.5v-10l-.5-.5zm-.51 8.49V13H2V5h12v6.49z"/>
                                                                </svg>
                                                                <span className="text-[10px]" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>Explorer</span>
                                                        </button>
                                                )}
                                                
                                                {/* Classroom restore button - positioned on the right edge, vertically centered */}
                                                {!showClassroom && fullscreenMode === null && (
                                                        <button
                                                                onClick={() => setShowClassroom(true)}
                                                                className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#1e1e2e] hover:bg-[#313244] border border-[#313244] border-r-0 hover:border-[#89b4fa] text-[#6c7086] hover:text-[#89b4fa] px-2 py-3 rounded-l-lg text-xs font-semibold shadow-lg transition-all duration-200 hover:scale-105 flex flex-col items-center gap-1.5 z-10"
                                                                title="Show Classroom"
                                                        >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                                                        <circle cx="9" cy="7" r="4"/>
                                                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                                                </svg>
                                                                <span className="writing-vertical text-[10px]" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>Classroom</span>
                                                        </button>
                                                )}

                                                {/* Exit fullscreen button when in code fullscreen mode */}
                                                {fullscreenMode === 'code' && (
                                                        <button
                                                                onClick={() => setFullscreenMode(null)}
                                                                className="absolute bottom-4 right-4 bg-[#1e1e2e] hover:bg-[#313244] border border-[#313244] hover:border-[#89b4fa] text-[#6c7086] hover:text-[#89b4fa] px-4 py-2 rounded-lg text-xs font-semibold shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2 z-20"
                                                                title="Exit Fullscreen"
                                                        >
                                                                <RestoreIcon />
                                                                <span>Exit Fullscreen</span>
                                                        </button>
                                                )}
                                        </div>
                                )}

                                {/* Classroom Panel - Resizable Right Sidebar (or fullscreen) */}
                                {showClassroomPanel && (
                                        fullscreenMode === 'classroom' ? (
                                                <div className="flex-1 h-full bg-zinc-900/80 backdrop-blur-sm relative">
                                                        <ClassroomPanel 
                                                                onClose={() => {
                                                                        setFullscreenMode(null);
                                                                        setShowClassroom(false);
                                                                }}
                                                                isFullscreen={true}
                                                                onToggleFullscreen={() => toggleFullscreen('classroom')}
                                                        />
                                                        {/* Exit fullscreen button */}
                                                        <button
                                                                onClick={() => setFullscreenMode(null)}
                                                                className="absolute bottom-4 left-4 bg-[#1e1e2e] hover:bg-[#313244] border border-[#313244] hover:border-[#89b4fa] text-[#6c7086] hover:text-[#89b4fa] px-4 py-2 rounded-lg text-xs font-semibold shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-2 z-20"
                                                                title="Exit Fullscreen"
                                                        >
                                                                <RestoreIcon />
                                                                <span>Back to Code</span>
                                                        </button>
                                                </div>
                                        ) : (
                                                <ResizablePanel
                                                        side="left"
                                                        defaultSize={320}
                                                        minSize={280}
                                                        maxSize={500}
                                                        collapsible={true}
                                                        defaultCollapsed={false}
                                                        title="Classroom"
                                                        onCollapse={handleClassroomCollapse}
                                                        className="h-full border-l border-zinc-700/50 bg-zinc-900/80 backdrop-blur-sm"
                                                >
                                                        <ClassroomPanel 
                                                                onClose={() => setShowClassroom(false)}
                                                                isFullscreen={false}
                                                                onToggleFullscreen={() => toggleFullscreen('classroom')}
                                                        />
                                                </ResizablePanel>
                                        )
                                )}
                        </div>

                        {/* StatusBar */}
                        <div className="shrink-0 z-50">
                                <StatusBar />
                        </div>
                </div>
                </FileSystemProvider>
        )
}

export default MasterEditor