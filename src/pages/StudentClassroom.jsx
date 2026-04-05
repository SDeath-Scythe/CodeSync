import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SideBar from '../components/SideBar';
import LocalSideBar from '../components/LocalSideBar';
import CodeEditor from '../components/CodeEdtor';
// import LocalCodeEditor from '../components/LocalCodeEditor'; // Unused
import EditorBanner from '../components/Student.Components/EditorBanner';
import ClassroomPanel from '../components/ClassroomPanel';
import StatusBar from '../components/StatusBar';
import ResizablePanel from '../components/ResizablePanel';
import Terminal from '../components/Terminal'; // Import Terminal
import { FileSystemProvider, useFileSystem } from '../context/FileSystemContext';
import { LocalFileSystemProvider, useLocalFileSystem } from '../context/LocalFileSystemContext';
import { useCollaboration } from '../context/CollaborationContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import useLocalSaveSession from '../hooks/useLocalSaveSession';

// Inner content component that uses the save hook (must be inside LocalFileSystemProvider)
function StudentClassroomContent({ sessionInfo }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinSession, currentSession, participants, isConnected, sessionError, loadSessionFromDb, loadTeacherFilesFromDb, socket } = useCollaboration();
  const globalFS = useFileSystem();
  const { loadFromSession: loadTeacherFiles } = globalFS; // For teacher's code (read-only)
  const localFS = useLocalFileSystem();
  const { loadFromSession: loadStudentFiles } = localFS; // For student's own workspace
  const { isSaving, lastSaved } = useLocalSaveSession(); // Use LOCAL save session hook

  const [showBanner, setShowBanner] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeEditorTab, setActiveEditorTab] = useState('teacher'); // 'teacher' or 'student'

  // Loading states for files
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [filesReady, setFilesReady] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherId, setTeacherId] = useState(null); // Teacher's user ID for terminal broadcast filtering
  const [showTerminal, setShowTerminal] = useState(false); // Terminal toggle state
  const [pendingRunCommand, setPendingRunCommand] = useState(null);
  const [showCursors, setShowCursors] = useState(true); // Synced with teacher's toggle
  const [snapshotInfo, setSnapshotInfo] = useState(null); // { timestamp, teacherName }

  // Helper to get student files for terminal sync
  // Uses localFS fileStructure and fileContents
  const getStudentFilesForSync = useCallback(() => {
    return {
      files: localFS.fileStructure,
      fileContents: localFS.fileContents
    };
  }, [localFS.fileStructure, localFS.fileContents]);

  // Handle workspace updates from the server (full replace - import from workspace)
  // This replaces the file explorer when "Import from workspace" is clicked
  const handleWorkspaceUpdate = useCallback((data) => {
    console.log('📂 Student: replacing editor files with workspace:', data.stats);
    if (loadStudentFiles) {
      loadStudentFiles(data.files, data.fileContents);
    }
  }, [loadStudentFiles]);

  // Handle Run Code - syncs files to workspace, then runs
  const handleRunCode = useCallback(() => {
    const { activeFileId, findItemById, fileStructure, getFilePath } = localFS;
    if (!activeFileId || !socket) return;

    // Get file info
    const file = findItemById(fileStructure, activeFileId);
    if (!file) return;

    // Get path and extract directory + filename
    const filePath = getFilePath(activeFileId) || file.name;
    const lastSlash = filePath.lastIndexOf('/');
    const fileDir = lastSlash > 0 ? filePath.substring(0, lastSlash) : '';
    const fileName = lastSlash > 0 ? filePath.substring(lastSlash + 1) : filePath;
    const ext = file.name.split('.').pop()?.toLowerCase();

    const commandMap = {
      'js': `node "${fileName}"`,
      'jsx': `node "${fileName}"`,
      'ts': `npx ts-node "${fileName}"`,
      'tsx': `npx ts-node "${fileName}"`,
      'py': `python "${fileName}"`,
      'java': `javac "${fileName}"; if ($?) { java "${fileName.replace('.java', '')}" }`,
      'cpp': `g++ "${fileName}" -o out.exe; if ($?) { .\\out.exe }`,
      'c': `gcc "${fileName}" -o out.exe; if ($?) { .\\out.exe }`,
      'go': `go run "${fileName}"`,
      'rs': `rustc "${fileName}"; if ($?) { .\\${fileName.replace('.rs', '.exe')} }`,
      'rb': `ruby "${fileName}"`,
      'php': `php "${fileName}"`,
      'sh': `sh "${fileName}"`,
    };

    let cmd = commandMap[ext];
    if (cmd) {
      // Prefix with cd to file's directory if it's in a subfolder
      if (fileDir) {
        cmd = `cd "${fileDir}" ; ${cmd}`;
      }

      // Sync files to workspace before running
      const syncData = getStudentFilesForSync();
      if (syncData) {
        console.log('📁 Student: syncing files before run');
        socket.emit('terminal-sync', { files: syncData.files, fileContents: syncData.fileContents });
      }

      setPendingRunCommand(cmd);
      setShowTerminal(true);
      setTimeout(() => setPendingRunCommand(null), 2000);
    }
  }, [localFS, socket, getStudentFilesForSync]);

  // Track and send syntax-error status to the teacher's dashboard
  const lastErrorStateRef = useRef(false);
  const handleDiagnosticsChange = useCallback(({ hasErrors, errorCount, errors }) => {
    if (!socket) return;
    // Only emit when the state actually changes
    if (hasErrors && !lastErrorStateRef.current) {
      lastErrorStateRef.current = true;
      const firstError = errors[0];
      socket.emit('student-error', {
        error: firstError ? `Line ${firstError.startLineNumber}: ${firstError.message}` : 'Syntax error',
        errorCount
      });
    } else if (!hasErrors && lastErrorStateRef.current) {
      lastErrorStateRef.current = false;
      socket.emit('student-error-cleared');
    }
  }, [socket]);

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

  // Listen for teacher's remote cursor toggle
  useEffect(() => {
    if (!socket) return;

    const handleToggleCursors = ({ enabled }) => {
      console.log('👁️ Teacher toggled remote cursors:', enabled);
      setShowCursors(enabled);
    };

    socket.on('toggle-remote-cursors', handleToggleCursors);
    return () => socket.off('toggle-remote-cursors', handleToggleCursors);
  }, [socket]);

  // Snapshot: listen for availability and check on join
  useEffect(() => {
    if (!socket) return;

    const handleSnapshotAvailable = ({ timestamp, teacherName }) => {
      console.log('📸 Snapshot available:', timestamp, teacherName);
      setSnapshotInfo({ timestamp, teacherName });
    };

    socket.on('snapshot-available', handleSnapshotAvailable);

    // Check if a snapshot already exists when we join
    socket.emit('check-snapshot');

    return () => socket.off('snapshot-available', handleSnapshotAvailable);
  }, [socket]);

  // Copy teacher's snapshot into student's local workspace
  const handleCopySnapshot = useCallback(() => {
    if (!socket) return;

    const handleSnapshotData = (data) => {
      if (data && data.files) {
        console.log('📸 Copying teacher snapshot into local workspace');
        // Use loadFromSession with the tree structure to replace all files
        loadStudentFiles(data.files, data.fileContents);
      }
      socket.off('snapshot-data', handleSnapshotData);
    };

    socket.on('snapshot-data', handleSnapshotData);
    socket.emit('get-snapshot');
  }, [socket, loadStudentFiles]);

  // Format snapshot time for display
  const formatSnapshotTime = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Load BOTH teacher's files and student's files after joining session
  useEffect(() => {
    if (currentSession && !filesLoadedRef.current) {
      filesLoadedRef.current = true;

      const loadAllFiles = async () => {
        setIsLoadingFiles(true);

        try {
          // 1. Load TEACHER's files (session owner's files - for read-only view)
          setLoadingMessage('Loading teacher\'s code...');
          const teacherResult = await loadTeacherFilesFromDb(currentSession);
          console.log('📦 Teacher result:', teacherResult);
          const teacherFiles = teacherResult.files || [];
          const teacherFileContents = teacherResult.fileContents || {};
          console.log('📂 Teacher files to load:', teacherFiles);
          console.log('📂 Teacher fileContents keys:', Object.keys(teacherFileContents));

          if (teacherFiles.length > 0) {
            // Pass both files and fileContents to handle tree structure
            loadTeacherFiles(teacherFiles, teacherFileContents);
            setTeacherName(teacherResult.teacherName || 'Teacher');
            setTeacherId(teacherResult.teacherId || null);
            console.log(`📂 Loaded ${teacherFiles.length} teacher files (${teacherResult.teacherName}) [id: ${teacherResult.teacherId}]`);
          } else {
            console.log('📂 No teacher files found yet');
          }

          // Small delay between loading operations
          await new Promise(resolve => setTimeout(resolve, 200));

          // 2. Load STUDENT's own files (their workspace)
          setLoadingMessage('Loading your workspace...');
          const studentWorkspace = await loadSessionFromDb(currentSession);
          const studentFiles = studentWorkspace.files || [];
          const studentFileContents = studentWorkspace.fileContents || {};

          if (studentFiles.length > 0) {
            // Pass both files and fileContents to handle tree structure
            loadStudentFiles(studentFiles, studentFileContents);
            console.log(`📂 Loaded ${studentFiles.length} files into student's workspace`);
            setLoadingMessage(`✓ Restored your ${studentFiles.length} file${studentFiles.length > 1 ? 's' : ''}`);
            await new Promise(resolve => setTimeout(resolve, 400));
          } else {
            console.log('📂 No saved files found for student workspace');
            setLoadingMessage('');
          }

        } catch (error) {
          console.error('Failed to load session files:', error);
          setLoadingMessage('');
        } finally {
          setIsLoadingFiles(false);
          setFilesReady(true);
        }
      };

      loadAllFiles();
    } else if (!currentSession) {
      // No session yet, mark as ready (will load when session connects)
      setFilesReady(true);
    }
  }, [currentSession]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-screen w-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 text-white overflow-hidden font-sans">

      {/* Session Full Overlay */}
      {sessionError && (
        <div className="absolute inset-0 z-[110] bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-zinc-900/80 border border-red-500/30 shadow-2xl max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Session Full</h3>
              <p className="text-sm text-zinc-400">{sessionError}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 rounded-lg text-sm font-medium transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* File Loading Overlay */}
      {isLoadingFiles && (
        <div className="absolute inset-0 z-[100] bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-zinc-900/80 border border-zinc-700/50 shadow-2xl max-w-md">
            {/* Animated folder icon - green for student */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white animate-pulse">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              {/* Loading spinner around the icon */}
              <div className="absolute -inset-2 border-2 border-green-500/30 border-t-green-500 rounded-3xl animate-spin" />
            </div>

            {/* Loading message */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Loading Session</h3>
              <p className="text-sm text-zinc-400">{loadingMessage || 'Syncing with classroom...'}</p>
            </div>

            {/* Progress dots */}
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* 1. Header */}
      <div className="shrink-0 z-50">
        <TopBar
          sessionTitle={sessionInfo?.name || currentSession || 'Classroom'}
          isSaving={isSaving}
          lastSaved={lastSaved}
          participantCount={participants.length}
          maxParticipants={21}
        />
      </div>

      {/* 2. Main Workspace */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar - Changes based on active tab */}
        {showSidebar && (
          <ResizablePanel
            side="right"
            defaultSize={256}
            minSize={180}
            maxSize={400}
            collapsible={true}
            defaultCollapsed={false}
            title="Explorer"
            className="h-full"
          >
            {activeEditorTab === 'teacher' ? (
              <SideBar onClose={() => setShowSidebar(false)} readOnly={true} />
            ) : (
              <LocalSideBar onClose={() => setShowSidebar(false)} />
            )}
          </ResizablePanel>
        )}

        {/* Center: Editor + Banner */}
        {/* Collaborative Mode Banner */}
        <div className="flex-1 h-full min-w-0 bg-zinc-900/50 backdrop-blur-sm flex flex-col relative">

          {showBanner && (
            <EditorBanner mode="student" onClose={() => setShowBanner(false)} />
          )}

          {/* Editor Tabs */}
          <div className="flex items-center bg-zinc-900/80 border-b border-indigo-500/20 px-2">
            <button
              onClick={() => setActiveEditorTab('teacher')}
              className={`px-4 py-2 text-xs font-medium transition-all relative ${activeEditorTab === 'teacher'
                ? 'text-indigo-400 bg-zinc-800/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {teacherName ? `${teacherName}'s Code` : "Teacher's Code"}
              </span>
              {activeEditorTab === 'teacher' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
              )}
            </button>
            <button
              onClick={() => setActiveEditorTab('student')}
              className={`px-4 py-2 text-xs font-medium transition-all relative ${activeEditorTab === 'student'
                ? 'text-green-400 bg-zinc-800/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                My Workspace
              </span>
              {activeEditorTab === 'student' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
              )}
            </button>
            <div className="flex-1" />

            {/* Copy Snapshot Button */}
            {snapshotInfo && (
              <button
                onClick={handleCopySnapshot}
                className="flex items-center gap-2 px-3 py-1 mr-2 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-lg text-[11px] font-semibold transition-all"
                title={`Copy ${snapshotInfo.teacherName}'s workspace snapshot into your workspace (replaces your current files)`}
              >
                <div className="relative">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                </div>
                Copy Teacher's Files
                <span className="text-[9px] text-amber-400/70 font-normal">
                  {formatSnapshotTime(snapshotInfo.timestamp)}
                </span>
              </button>
            )}

            <span className={`text-[10px] px-2 py-1 rounded ${activeEditorTab === 'teacher'
              ? 'bg-indigo-500/20 text-indigo-300'
              : 'bg-green-500/20 text-green-300'
              }`}>
              {activeEditorTab === 'teacher' ? '👁 Read Only - Synced with Teacher' : '✏️ Your Own Code (Ctrl+S to Save)'}
            </span>
          </div>

          {/* B. Dual Code Editors Area */}
          <div className="flex-1 relative flex flex-col min-h-0 bg-zinc-900/50">

            {/* Editors Container */}
            <div className="flex-1 relative min-h-0">
              {/* Teacher's Editor (Read-Only) */}
              <div className={`absolute inset-0 transition-opacity duration-200 ${activeEditorTab === 'teacher' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <CodeEditor
                  fileSystem={globalFS}
                  color="indigo"
                  readOnly={true}
                  showCursors={showCursors}
                  showTerminal={showTerminal}
                  onToggleTerminal={() => setShowTerminal(prev => !prev)}
                />
              </div>

              {/* Student's Own Editor (Editable) */}
              <div className={`absolute inset-0 transition-opacity duration-200 ${activeEditorTab === 'student' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <CodeEditor
                  fileSystem={localFS}
                  color="green"
                  showTerminal={showTerminal}
                  onToggleTerminal={() => setShowTerminal(prev => !prev)}
                  onRunCode={handleRunCode}
                  onDiagnosticsChange={handleDiagnosticsChange}
                />
              </div>

              {/* Sidebar restore button */}
              {!showSidebar && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 border border-l-0 px-2 py-3 rounded-r-lg text-xs font-semibold shadow-lg transition-all duration-200 hover:scale-105 flex flex-col items-center gap-1.5 z-20 ${activeEditorTab === 'teacher'
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 hover:border-indigo-500 text-zinc-400 hover:text-indigo-400'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 hover:border-green-500 text-zinc-400 hover:text-green-400'
                    }`}
                  title="Show Explorer"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14.5 3H7.71l-1-1H1.5l-.5.5v11l.5.5h13l.5-.5v-10l-.5-.5zm-.51 8.49V13H2V5h12v6.49z" />
                  </svg>
                  <span className="text-[10px]" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                    {activeEditorTab === 'teacher' ? 'Teacher Files' : 'My Files'}
                  </span>
                </button>
              )}
            </div>

            {/* Terminal Panel */}
            {showTerminal && (
              <div className="shrink-0 border-t border-zinc-800 bg-[#1e1e2e]" style={{ height: '260px' }}>
                {/* Terminal label bar - fixed 30px */}
                <div className="flex items-center gap-2 px-3 border-b border-zinc-800 bg-zinc-900/70" style={{ height: '30px' }}>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                  </div>
                  {activeEditorTab === 'teacher' ? (
                    <span className="text-[10px] text-indigo-400 font-medium flex items-center gap-1.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5zm0 8a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm9 11v-1a7 7 0 0 0-7-7h-4a7 7 0 0 0-7 7v1h2v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1z"/></svg>
                      {teacherName ? `${teacherName}'s Terminal` : "Teacher's Terminal"}
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">👁 View Only</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-green-400 font-medium flex items-center gap-1.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                      My Terminal
                      <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">Interactive</span>
                    </span>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => setShowTerminal(false)}
                    className="text-zinc-500 hover:text-white transition-colors p-0.5 rounded"
                    title="Close Terminal"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                {/* Teacher Terminal View - explicit pixel height = 260 - 30 = 230px */}
                <div style={{ display: activeEditorTab === 'teacher' ? 'block' : 'none', height: '230px' }}>
                  <Terminal
                    socket={socket}
                    sessionCode={currentSession}
                    readOnly={true}
                    ownerId={teacherId}
                    className="h-full"
                  />
                </div>

                {/* Student Terminal View - explicit pixel height = 260 - 30 = 230px */}
                <div style={{ display: activeEditorTab === 'student' ? 'block' : 'none', height: '230px' }}>
                  <Terminal
                    socket={socket}
                    sessionCode={currentSession}
                    onSync={getStudentFilesForSync}
                    onWorkspaceUpdate={handleWorkspaceUpdate}
                    className="h-full"
                    runCommand={pendingRunCommand}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Classroom Panel */}
        <div className="w-80 h-full shrink-0">
          <ClassroomPanel />
        </div>

      </div>

      {/* 3. Status Bar */}
      <div className="shrink-0 z-50">
        <StatusBar isSaving={isSaving} lastSaved={lastSaved} />
      </div>

    </div>
  );
}

// Main wrapper component that loads session and provides context
const StudentClassroom = () => {
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
      toast.warning('No Session', 'Please join a session first');
      navigate('/session');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render until we have session info
  if (!sessionInfo) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[#a6adc8]">Loading session...</span>
        </div>
      </div>
    );
  }

  return (
    <FileSystemProvider>
      <LocalFileSystemProvider>
        <StudentClassroomContent sessionInfo={sessionInfo} />
      </LocalFileSystemProvider>
    </FileSystemProvider>
  );
};

export default StudentClassroom;