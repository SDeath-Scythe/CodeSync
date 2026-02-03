import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import SideBar from '../components/SideBar';
import LocalSideBar from '../components/LocalSideBar';
import CodeEditor from '../components/CodeEdtor';
import LocalCodeEditor from '../components/LocalCodeEditor';
import EditorBanner from '../components/Student.Components/EditorBanner';
import ClassroomPanel from '../components/ClassroomPanel';
import StatusBar from '../components/StatusBar';
import ResizablePanel from '../components/ResizablePanel';
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
  const { joinSession, currentSession, isConnected, loadSessionFromDb, loadTeacherFilesFromDb } = useCollaboration();
  const { loadFromSession: loadTeacherFiles } = useFileSystem(); // For teacher's code (read-only)
  const { loadFromSession: loadStudentFiles } = useLocalFileSystem(); // For student's own workspace
  const { isSaving, lastSaved } = useLocalSaveSession(); // Use LOCAL save session hook

  const [showBanner, setShowBanner] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeEditorTab, setActiveEditorTab] = useState('teacher'); // 'teacher' or 'student'

  // Loading states for files
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [filesReady, setFilesReady] = useState(false);
  const [teacherName, setTeacherName] = useState('');

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
            console.log(`📂 Loaded ${teacherFiles.length} teacher files (${teacherResult.teacherName})`);
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
        <div className="flex-1 h-full min-w-0 bg-zinc-900/50 backdrop-blur-sm flex flex-col relative">

          {/* A. Collaborative Mode Banner */}
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
            <span className={`text-[10px] px-2 py-1 rounded ${activeEditorTab === 'teacher'
              ? 'bg-indigo-500/20 text-indigo-300'
              : 'bg-green-500/20 text-green-300'
              }`}>
              {activeEditorTab === 'teacher' ? '👁 Read Only - Synced with Teacher' : '✏️ Your Own Code (Ctrl+S to Save)'}
            </span>
          </div>

          {/* B. Dual Code Editors */}
          <div className="flex-1 relative">
            {/* Teacher's Editor (Read-Only, synced with teacher's code) */}
            <div className={`absolute inset-0 transition-opacity duration-200 ${activeEditorTab === 'teacher' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <CodeEditor readOnly={true} showCursors={true} />
            </div>

            {/* Student's Own Editor (Editable, completely separate) */}
            <div className={`absolute inset-0 transition-opacity duration-200 ${activeEditorTab === 'student' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <LocalCodeEditor />
            </div>

            {/* Sidebar restore button when hidden */}
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