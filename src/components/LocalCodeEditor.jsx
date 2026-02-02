import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useLocalFileSystem } from '../context/LocalFileSystemContext';
import {
  X,
  MoreHorizontal,
  Play,
  Split,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';

/**
 * LocalCodeEditor Component
 * A standalone editor for student's local practice files.
 * Completely independent from the teacher's synced code.
 */
const LocalCodeEditor = ({ isFullscreen = false, onToggleFullscreen }) => {
  const {
    openFiles,
    activeFileId,
    setActiveFileId,
    closeFile,
    getFileContent,
    updateFileContent,
    getFilePath,
    findItemById,
    fileStructure
  } = useLocalFileSystem();

  // Terminal State
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(192);
  const [isResizing, setIsResizing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Monaco Refs
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Get active file details
  const activeFile = activeFileId ? findItemById(fileStructure, activeFileId) : null;
  const codeContent = activeFileId ? getFileContent(activeFileId) : '';

  // Get language from file extension
  const getLanguage = (fileName) => {
    if (!fileName) return 'plaintext';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const langMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      css: 'css',
      html: 'html',
      json: 'json',
      md: 'markdown',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      txt: 'plaintext',
    };
    return langMap[ext] || 'plaintext';
  };

  // Get file icon indicator
  const getFileIcon = (fileName) => {
    if (!fileName) return 'JS';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap = {
      css: { icon: '#', color: 'text-blue-300' },
      js: { icon: 'JS', color: 'text-yellow-400' },
      jsx: { icon: 'JSX', color: 'text-cyan-400' },
      ts: { icon: 'TS', color: 'text-blue-500' },
      tsx: { icon: 'TSX', color: 'text-blue-400' },
      json: { icon: '{ }', color: 'text-yellow-300' },
      html: { icon: '<>', color: 'text-orange-400' },
      md: { icon: 'MD', color: 'text-zinc-400' },
      py: { icon: 'PY', color: 'text-green-400' },
      txt: { icon: 'TXT', color: 'text-zinc-400' },
    };
    return iconMap[ext] || { icon: '?', color: 'text-zinc-400' };
  };

  // Build breadcrumbs
  const breadcrumbs = activeFile ? getFilePath(activeFileId)?.split('/') || [] : [];

  // Handle editor change
  const handleEditorChange = (value) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value);
    }
  };

  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.editor.setTheme('vs-dark');
  };

  // Tab close handler
  const handleCloseTab = (e, fileId) => {
    e.stopPropagation();
    closeFile(fileId);
  };

  // Resizing
  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const container = document.querySelector('.editor-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newHeight = rect.bottom - e.clientY;
      setTerminalHeight(Math.max(100, Math.min(400, newHeight)));
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0d14] editor-container border-l border-green-500/20">
      {/* 1. TABS BAR */}
      <div className="h-9 flex items-center bg-zinc-900/80 border-b border-green-500/20 select-none shrink-0 overflow-x-auto">
        {openFiles.map((file) => {
          const isActive = file.id === activeFileId;
          const iconInfo = getFileIcon(file.name);
          return (
            <div
              key={file.id}
              onClick={() => setActiveFileId(file.id)}
              className={`group relative flex items-center gap-2 px-3 h-full text-[13px] cursor-pointer border-r border-green-500/10 min-w-[100px] max-w-[180px] ${
                isActive
                  ? 'bg-zinc-800/60 text-green-300 border-t-2 border-t-green-500'
                  : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
              }`}
            >
              <span className={`text-[10px] font-bold ${iconInfo.color}`}>{iconInfo.icon}</span>
              <span className="truncate">{file.name}</span>
              <div
                className="ml-auto p-0.5 rounded hover:bg-green-500/30 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleCloseTab(e, file.id)}
              >
                <X className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
        <div className="flex-1 flex justify-end items-center pr-2 gap-2 text-zinc-400 bg-zinc-900/80">
          <Play className="w-4 h-4 hover:text-green-400 cursor-pointer" title="Run Code" />
          <Split className="w-4 h-4 hover:text-white cursor-pointer" title="Split Editor" />
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1 hover:bg-green-500/20 rounded transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Editor"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 hover:text-green-400 cursor-pointer" />
              ) : (
                <Maximize2 className="w-4 h-4 hover:text-green-400 cursor-pointer" />
              )}
            </button>
          )}
          <MoreHorizontal className="w-4 h-4 hover:text-white cursor-pointer" title="More Actions" />
        </div>
      </div>

      {/* 2. BREADCRUMBS */}
      <div className="h-6 flex items-center px-4 bg-zinc-900/50 text-[11px] text-zinc-500 border-b border-green-500/20 select-none shrink-0">
        {breadcrumbs.length > 0 ? (
          breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="w-3 h-3 mx-1" />}
              <span className={index === breadcrumbs.length - 1 ? 'text-green-300' : 'hover:text-zinc-300 cursor-pointer'}>
                {crumb}
              </span>
            </React.Fragment>
          ))
        ) : (
          <span className="text-gray-500 italic">No file open</span>
        )}
      </div>

      {/* 3. EDITOR AREA */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {activeFile ? (
          <Editor
            height="100%"
            language={getLanguage(activeFile.name)}
            theme="vs-dark"
            value={codeContent}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            path={'local:///' + activeFile.name}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontFamily: "'Fira Code', 'Droid Sans Mono', 'monospace'",
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              tabSize: 2,
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 select-none">
            <div className="text-4xl mb-4 text-green-700">✏️</div>
            <p className="text-green-400">My Practice Space</p>
            <p className="text-xs mt-2 opacity-50">Select a file to start coding</p>
          </div>
        )}
      </div>

      {/* 4. TERMINAL / OUTPUT */}
      <div
        className="border-t border-green-500/20 bg-zinc-900/80 flex flex-col relative shrink-0"
        style={{ height: terminalOpen ? terminalHeight + 'px' : '32px' }}
      >
        {/* Resizer Handle */}
        <div
          className="absolute -top-1 left-0 right-0 h-2 bg-transparent cursor-ns-resize z-20 hover:bg-green-600/30 transition-colors"
          onMouseDown={startResizing}
        ></div>

        {/* Panel Header */}
        <div className="h-8 flex items-center justify-between px-4 bg-zinc-900/80 border-b border-green-500/20 select-none shrink-0">
          <div className="flex items-center gap-6 text-xs font-medium uppercase tracking-wide">
            <button
              className={`h-full border-b-2 px-1 ${activeTab === 0 ? 'text-white border-green-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
              onClick={() => { setActiveTab(0); setTerminalOpen(true); }}
            >
              Output
            </button>
            <button
              className={`h-full border-b-2 px-1 ${activeTab === 1 ? 'text-white border-green-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
              onClick={() => { setActiveTab(1); setTerminalOpen(true); }}
            >
              Console
            </button>
          </div>
          <button
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            onClick={() => setTerminalOpen(!terminalOpen)}
          >
            {terminalOpen ? '▼' : '▲'}
          </button>
        </div>

        {/* Panel Content */}
        {terminalOpen && (
          <div className="flex-1 p-3 font-mono text-xs text-green-400/80 overflow-auto">
            <div className="opacity-50">// Your output will appear here...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalCodeEditor;
