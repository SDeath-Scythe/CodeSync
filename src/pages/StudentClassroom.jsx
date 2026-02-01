import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import CodeEditor from '../components/CodeEdtor';
import EditorBanner from '../components/Student.Components/EditorBanner';
import StudentVideoGrid from '../components/Student.Components/StudentViewGrid';
import StudentControls from '../components/Student.Components/StudentControls';
import StatusBar from '../components/StatusBar';

const StudentClassroom = () => {
  const [showBanner, setShowBanner] = useState(true);

  return (
    <div className="flex flex-col h-screen w-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 text-white overflow-hidden font-sans">

      {/* 1. Header */}
      <div className="shrink-0 z-50">
        <TopBar 
          sessionTitle="Intro to React - Student View" 
          user={{ name: "John Doe", role: "Student", avatarUrl: "https://i.pravatar.cc/150?u=johndoe" }}
        />
      </div>

      {/* 2. Main Workspace */}
      <div className="flex flex-1 overflow-hidden">

        {/* Center: Editor + Banner */}
        <div className="flex-1 h-full min-w-0 bg-zinc-900/50 backdrop-blur-sm flex flex-col relative">

          {/* A. Collaborative Mode Banner */}
          {showBanner && (
            <EditorBanner mode="student" onClose={() => setShowBanner(false)} />
          )}

          {/* B. The Code Editor */}
          <div className="flex-1 relative">
            <CodeEditor />

            {/* Collaborative Cursor Label (Example Overlay) */}
            <div className="absolute top-32 left-48 z-20 pointer-events-none">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                Mr. Davis
              </div>
              <div className="w-0.5 h-6 bg-gradient-to-b from-indigo-500 to-transparent ml-1"></div>
            </div>
          </div>
        </div>

        {/* Right: Classroom Panel (Customized for Student View) */}
        <div className="w-80 h-full shrink-0 border-l border-zinc-700/50 bg-zinc-900/80 backdrop-blur-sm flex flex-col">

          {/* Header */}
          <div className="h-11 min-h-[44px] flex items-center justify-between px-4 bg-zinc-800/50 border-b border-zinc-700/50">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Classroom Stream</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                4 online
              </div>
            </div>
          </div>

          {/* Video Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <StudentVideoGrid />
          </div>

          {/* Controls */}
          <div className="shrink-0">
            <StudentControls mode="student" />
          </div>

        </div>

      </div>

      {/* 3. Status Bar */}
      <div className="shrink-0 z-50">
        <StatusBar />
      </div>

    </div>
  );
};

export default StudentClassroom;