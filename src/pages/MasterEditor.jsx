import { useState, useCallback } from 'react'
import TopBar from '../components/TopBar'
import SideBar from '../components/SideBar'
import CodeEditor from '../components/CodeEdtor'
import ClassroomPanel from '../components/ClassroomPanel'
import StatusBar from '../components/StatusBar'
import ResizablePanel from '../components/ResizablePanel'
import { FileSystemProvider } from '../context/FileSystemContext'

function MasterEditor() {
        const [showClassroom, setShowClassroom] = useState(true);
        const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
        const [classroomCollapsed, setClassroomCollapsed] = useState(false);

        const handleSidebarCollapse = useCallback((collapsed) => {
                setSidebarCollapsed(collapsed);
        }, []);

        const handleClassroomCollapse = useCallback((collapsed) => {
                setClassroomCollapsed(collapsed);
        }, []);

        return (
                <FileSystemProvider>
                <div className="flex flex-col h-screen w-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 text-white overflow-hidden font-sans">
                        
                        {/* TopBar */}
                        <div className="shrink-0 z-50">
                                <TopBar />
                        </div>

                        {/* Main Content */}
                        <div className="flex flex-1 overflow-hidden relative group">
                                
                                {/* File Explorer Sidebar - Resizable */}
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
                                        <SideBar />
                                </ResizablePanel>

                                {/* Code Editor - Main Area */}
                                <div className="flex-1 h-full min-w-0 bg-zinc-900/50 backdrop-blur-sm relative">
                                        <CodeEditor />
                                        
                                        {/* Floating toggle for classroom panel */}
                                        {!showClassroom && (
                                                <button
                                                        onClick={() => setShowClassroom(true)}
                                                        className="absolute top-4 right-4 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 flex items-center gap-2 z-10"
                                                >
                                                        <span>Show Classroom</span>
                                                </button>
                                        )}
                                </div>

                                {/* Classroom Panel - Resizable Right Sidebar */}
                                {showClassroom && (
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
                                                <ClassroomPanel onClose={() => setShowClassroom(false)} />
                                        </ResizablePanel>
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