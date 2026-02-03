import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import SideBar from '../components/SideBar'
import CodeEditor from '../components/CodeEdtor'
import ClassroomPanel from '../components/ClassroomPanel'
import StatusBar from '../components/StatusBar'
import ResizablePanel from '../components/ResizablePanel'
import { FileSystemProvider, useFileSystem } from '../context/FileSystemContext'
import { useCollaboration } from '../context/CollaborationContext'
import { useToast } from '../components/ToastProvider'
import useSaveSession from '../hooks/useSaveSession'

// Maximize icon
const MaximizeIcon = () => (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 3v10h10V3H3zm9 9H4V4h8v8z" />
        </svg>
);

// Minimize/restore icon
const RestoreIcon = () => (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 5v9h9V5H3zm8 8H4V6h7v7z" />
                <path d="M5 5h1V4h7v7h-1v1h2V3H5v2z" />
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
                        <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" />
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

// Inner editor component that uses the save hook (must be inside FileSystemProvider)
function MasterEditorContent({ sessionInfo }) {
        const navigate = useNavigate();
        const { joinSession, currentSession, loadSessionFromDb } = useCollaboration();
        const { loadFromSession } = useFileSystem();
        const { isSaving, lastSaved } = useSaveSession();

        const [showSidebar, setShowSidebar] = useState(true);
        const [showClassroom, setShowClassroom] = useState(true);
        const [showCursors, setShowCursors] = useState(true);
        const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
        const [classroomCollapsed, setClassroomCollapsed] = useState(false);
        const [fullscreenMode, setFullscreenMode] = useState(null);

        // Loading states for files
        const [isLoadingFiles, setIsLoadingFiles] = useState(false);
        const [loadingMessage, setLoadingMessage] = useState('');
        const [filesReady, setFilesReady] = useState(false);

        // Use ref to track if files have been loaded (prevents re-running on each render)
        const filesLoadedRef = useRef(false);
        const sessionJoinedRef = useRef(false);

        // Join session when component mounts - use ref to run only once
        useEffect(() => {
                if (sessionInfo?.code && !sessionJoinedRef.current) {
                        sessionJoinedRef.current = true;
                        joinSession(sessionInfo.code);
                }
        }, [sessionInfo?.code, joinSession]);

        // Load files from database after joining session - use ref to run only once
        useEffect(() => {
                if (currentSession && !filesLoadedRef.current) {
                        filesLoadedRef.current = true;

                        const loadFiles = async () => {
                                try {
                                        // First, check if there are files
                                        const workspaceData = await loadSessionFromDb(currentSession);
                                        console.log('📦 Workspace data received:', workspaceData);
                                        const files = workspaceData.files || [];
                                        const fileContentsMap = workspaceData.fileContents || {};

                                        if (files.length > 0) {
                                                // Only show loading overlay if there are files to restore
                                                setIsLoadingFiles(true);
                                                setLoadingMessage(`Restoring ${files.length} file${files.length > 1 ? 's' : ''}...`);

                                                // Small delay to ensure the UI shows the message
                                                await new Promise(resolve => setTimeout(resolve, 200));

                                                console.log('📂 About to load files:', files);
                                                // Pass both files and fileContents to handle tree structure
                                                loadFromSession(files, fileContentsMap);
                                                console.log(`📂 Loaded ${files.length} files from session ${currentSession}`);

                                                setLoadingMessage(`✓ Restored ${files.length} file${files.length > 1 ? 's' : ''}`);
                                                await new Promise(resolve => setTimeout(resolve, 400));
                                        } else {
                                                console.log('📂 No saved files found for this session (workspaceData:', workspaceData, ')');
                                        }
                                } catch (error) {
                                        console.error('Failed to load session files:', error);
                                } finally {
                                        setIsLoadingFiles(false);
                                        setFilesReady(true);
                                }
                        };

                        loadFiles();
                } else if (!currentSession) {
                        // No session yet, mark as ready (will load when session connects)
                        setFilesReady(true);
                }
        }, [currentSession]); // eslint-disable-line react-hooks/exhaustive-deps

        const handleSidebarCollapse = useCallback((collapsed) => {
                setSidebarCollapsed(collapsed);
        }, []);

        const handleClassroomCollapse = useCallback((collapsed) => {
                setClassroomCollapsed(collapsed);
        }, []);

        const toggleFullscreen = useCallback((mode) => {
                setFullscreenMode(prev => prev === mode ? null : mode);
        }, []);

        const toggleCursors = useCallback(() => {
                setShowCursors(prev => !prev);
        }, []);

        // Determine what to show based on fullscreen mode
        const showSidebarPanel = fullscreenMode === null && showSidebar;
        const showCodeEditor = fullscreenMode !== 'classroom';
        const showClassroomPanel = fullscreenMode === 'classroom' || (fullscreenMode === null && showClassroom);

        return (
                <div className="flex flex-col h-screen w-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 text-white overflow-hidden font-sans">

                        {/* File Loading Overlay */}
                        {isLoadingFiles && (
                                <div className="absolute inset-0 z-[100] bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-zinc-900/80 border border-zinc-700/50 shadow-2xl max-w-md">
                                                {/* Animated folder icon */}
                                                <div className="relative">
                                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white animate-pulse">
                                                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                                                </svg>
                                                        </div>
                                                        {/* Loading spinner around the icon */}
                                                        <div className="absolute -inset-2 border-2 border-indigo-500/30 border-t-indigo-500 rounded-3xl animate-spin" />
                                                </div>

                                                {/* Loading message */}
                                                <div className="text-center">
                                                        <h3 className="text-lg font-semibold text-white mb-2">Restoring Your Work</h3>
                                                        <p className="text-sm text-zinc-400">{loadingMessage || 'Loading files...'}</p>
                                                </div>

                                                {/* Progress dots */}
                                                <div className="flex gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                        </div>
                                </div>
                        )}

                        {/* TopBar */}
                        <div className="shrink-0 z-50">
                                <TopBar
                                        sessionTitle={sessionInfo?.title || "CodeSync Session"}
                                        showDashboardButton={true}
                                        isSaving={isSaving}
                                        lastSaved={lastSaved}
                                />
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
                                                        showCursors={showCursors}
                                                        onToggleCursors={toggleCursors}
                                                />

                                                {/* Explorer restore button - positioned on the left edge, vertically centered */}
                                                {!showSidebar && fullscreenMode === null && (
                                                        <button
                                                                onClick={() => setShowSidebar(true)}
                                                                className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#1e1e2e] hover:bg-[#313244] border border-[#313244] border-l-0 hover:border-[#89b4fa] text-[#6c7086] hover:text-[#89b4fa] px-2 py-3 rounded-r-lg text-xs font-semibold shadow-lg transition-all duration-200 hover:scale-105 flex flex-col items-center gap-1.5 z-10"
                                                                title="Show Explorer"
                                                        >
                                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                                                        <path d="M14.5 3H7.71l-1-1H1.5l-.5.5v11l.5.5h13l.5-.5v-10l-.5-.5zm-.51 8.49V13H2V5h12v6.49z" />
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
                                                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                                        <circle cx="9" cy="7" r="4" />
                                                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
                                <StatusBar isSaving={isSaving} lastSaved={lastSaved} />
                        </div>
                </div>
        );
}

// Main component that wraps content in FileSystemProvider
function MasterEditor() {
        const navigate = useNavigate();
        const toast = useToast();
        const [sessionInfo, setSessionInfo] = useState(null);
        const hasCheckedSession = useRef(false);

        // Load session from localStorage - run only once
        useEffect(() => {
                if (hasCheckedSession.current) return;
                hasCheckedSession.current = true;

                const storedSession = localStorage.getItem('codesync_current_session');
                if (storedSession) {
                        try {
                                const session = JSON.parse(storedSession);
                                setSessionInfo(session);
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
        }, []); // eslint-disable-line react-hooks/exhaustive-deps

        // Don't render until we have session info
        if (!sessionInfo) {
                return (
                        <div className="flex items-center justify-center h-screen w-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 text-white">
                                <div className="flex flex-col items-center gap-4">
                                        <div className="w-8 h-8 border-2 border-[#89b4fa] border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-[#a6adc8]">Loading session...</span>
                                </div>
                        </div>
                );
        }

        return (
                <FileSystemProvider>
                        <MasterEditorContent sessionInfo={sessionInfo} />
                </FileSystemProvider>
        );
}

export default MasterEditor