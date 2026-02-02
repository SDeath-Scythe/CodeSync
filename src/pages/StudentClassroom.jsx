import React, { useState, useEffect } from 'react';
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
import { FileSystemProvider } from '../context/FileSystemContext';
import { LocalFileSystemProvider } from '../context/LocalFileSystemContext';
import { useCollaboration } from '../context/CollaborationContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

const StudentClassroom = () => {
  const [showBanner, setShowBanner] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeEditorTab, setActiveEditorTab] = useState('teacher'); // 'teacher' or 'student'
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { joinSession, currentSession, isConnected } = useCollaboration();
  const [sessionInfo, setSessionInfo] = useState(null);

  // Load session from localStorage and join
  useEffect(() => {
    const storedSession = localStorage.getItem('codesync_current_session');
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        setSessionInfo(session);
        joinSession(session.code);
      } catch (err) {
        console.error('Failed to parse session:', err);
        toast.error('Error', 'Invalid session data');
        navigate('/session');
      }
    } else {
      toast.warning('No Session', 'Please join a session first');
      navigate('/session');
    }
  }, []);

  return (
    <FileSystemProvider>
    <LocalFileSystemProvider>
    <div className="flex flex-col h-screen w-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 text-white overflow-hidden font-sans">

      {/* 1. Header */}
      <div className="shrink-0 z-50">
        <TopBar 
          sessionTitle={sessionInfo?.name || currentSession?.name || 'Classroom'} 
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
              className={`px-4 py-2 text-xs font-medium transition-all relative ${
                activeEditorTab === 'teacher'
                  ? 'text-indigo-400 bg-zinc-800/50'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Teacher's Code
              </span>
              {activeEditorTab === 'teacher' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
              )}
            </button>
            <button
              onClick={() => setActiveEditorTab('student')}
              className={`px-4 py-2 text-xs font-medium transition-all relative ${
                activeEditorTab === 'student'
                  ? 'text-green-400 bg-zinc-800/50'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                My Workspace
              </span>
              {activeEditorTab === 'student' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
              )}
            </button>
            <div className="flex-1" />
            <span className={`text-[10px] px-2 py-1 rounded ${
              activeEditorTab === 'teacher' 
                ? 'bg-indigo-500/20 text-indigo-300' 
                : 'bg-green-500/20 text-green-300'
            }`}>
              {activeEditorTab === 'teacher' ? '👁 Read Only - Synced with Teacher' : '✏️ Your Own Code'}
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
                className={`absolute left-0 top-1/2 -translate-y-1/2 border border-l-0 px-2 py-3 rounded-r-lg text-xs font-semibold shadow-lg transition-all duration-200 hover:scale-105 flex flex-col items-center gap-1.5 z-20 ${
                  activeEditorTab === 'teacher'
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 hover:border-indigo-500 text-zinc-400 hover:text-indigo-400'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 hover:border-green-500 text-zinc-400 hover:text-green-400'
                }`}
                title="Show Explorer"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M14.5 3H7.71l-1-1H1.5l-.5.5v11l.5.5h13l.5-.5v-10l-.5-.5zm-.51 8.49V13H2V5h12v6.49z"/>
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
        <StatusBar />
      </div>

    </div>
    </LocalFileSystemProvider>
    </FileSystemProvider>
  );
};

export default StudentClassroom;