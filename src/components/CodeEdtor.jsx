import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useFileSystem } from '../context/FileSystemContext';
import { useCollaboration } from '../context/CollaborationContext';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socketService';
import {
  X,
  MoreHorizontal,
  Play,
  Split,
  ChevronRight,
  Maximize2,
  Minimize2,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';

/**
 * CodeEditor Component
 * Uses Monaco Editor for the editing surface and connects to FileSystemContext.
 */
const CodeEditor = ({
  isFullscreen = false,
  onToggleFullscreen,
  readOnly = false,
  showCursors = true,
  onToggleCursors,
  onRunCode
}) => {
  const {
    openFiles,
    activeFileId,
    setActiveFileId,
    closeFile,
    getFileContent,
    updateFileContent,
    saveFile,
    getFilePath,
    findItemById,
    fileStructure
  } = useFileSystem();

  const { remoteCursors, isConnected, sendCodeChange, pendingChanges, consumePendingChanges } = useCollaboration();
  const { user } = useAuth();

  // Monaco Refs
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const editorContainerRef = useRef(null);
  const decorationsRef = useRef([]);
  const cursorThrottleRef = useRef(null);
  const codeChangeThrottleRef = useRef(null);

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
      go: 'go',
      rs: 'rust',
      sql: 'sql',
      sh: 'shell',
      yml: 'yaml',
      yaml: 'yaml',
      xml: 'xml',
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
      html: { icon: 'H', color: 'text-orange-400' },
      json: { icon: '{}', color: 'text-yellow-300' },
      md: { icon: 'MD', color: 'text-gray-300' },
      py: { icon: 'PY', color: 'text-green-400' },
    };
    return iconMap[ext] || { icon: '📄', color: 'text-gray-400' };
  };

  // Remote cursor labels state (for floating labels)
  const [cursorLabels, setCursorLabels] = useState([]);

  // Send cursor position to server (throttled for performance - 50ms)
  const sendCursorPosition = useCallback((position, selection) => {
    if (isConnected && activeFileId) {
      // Clear previous pending update
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }
      // Send immediately but prevent rapid successive updates
      cursorThrottleRef.current = setTimeout(() => {
        socketService.sendCursorMove(activeFileId, position, selection);
        cursorThrottleRef.current = null;
      }, 30); // 30ms throttle for smooth but not overwhelming updates
    }
  }, [isConnected, activeFileId]);

  // Update remote cursor decorations and labels
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !activeFileId) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Debug
    console.log('📍 Cursor effect - readOnly:', readOnly, 'showCursors:', showCursors);
    console.log('📍 remoteCursors:', Array.from(remoteCursors.entries()));
    console.log('📍 activeFileId:', activeFileId);

    // If cursors are hidden, clear all decorations
    if (!showCursors) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      setCursorLabels([]);
      return;
    }

    // Filter cursors for the current file
    // Only filter out own cursor if NOT in readOnly mode (teachers don't see their own cursor)
    // Students (readOnly) see ALL cursors including the teacher's
    const currentUserId = user?.id?.toString();
    const cursorsForFile = Array.from(remoteCursors.entries())
      .filter(([userId, data]) => {
        const matches = data.fileId === activeFileId;
        // In readOnly mode (student), show all cursors. Otherwise filter out own cursor.
        const shouldShow = readOnly || !currentUserId || userId.toString() !== currentUserId;
        console.log(`📍 Cursor ${userId}: fileId=${data.fileId}, matches=${matches}, readOnly=${readOnly}, shouldShow=${shouldShow}`);
        return matches && shouldShow;
      });

    console.log('📍 cursorsForFile after filter:', cursorsForFile);

    // Create decorations for each remote cursor
    const decorations = cursorsForFile.flatMap(([userId, data]) => {
      const { userName, position, selection } = data;
      const decos = [];

      if (position) {
        // Cursor line decoration - full line highlight
        decos.push({
          range: new monaco.Range(position.lineNumber, 1, position.lineNumber, 1),
          options: {
            isWholeLine: false,
            className: 'remote-cursor-marker',
            glyphMarginClassName: 'remote-cursor-glyph',
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        });

        // Cursor position indicator
        decos.push({
          range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
          options: {
            className: 'remote-cursor-position',
            beforeContentClassName: 'remote-cursor-line',
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        });
      }

      if (selection && (selection.startLineNumber !== selection.endLineNumber || selection.startColumn !== selection.endColumn)) {
        // Selection highlight
        decos.push({
          range: new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
          ),
          options: {
            className: 'remote-selection',
            hoverMessage: { value: `${userName}'s selection` }
          }
        });
      }

      return decos;
    });

    // Apply decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);

    // Calculate floating label positions using Monaco's coordinate conversion
    const updateCursorLabelPositions = () => {
      const labels = cursorsForFile.map(([userId, data]) => {
        const { userName, position } = data;
        if (!position) return null;

        try {
          // Use Monaco's built-in method to get the exact pixel position
          const targetPosition = { lineNumber: position.lineNumber, column: position.column };

          // Get the top position for the line
          const topForLine = editor.getTopForLineNumber(position.lineNumber);
          const scrollTop = editor.getScrollTop();
          const lineHeight = editor.getOption(monacoRef.current.editor.EditorOption.lineHeight);

          // Calculate left position using column
          const layoutInfo = editor.getLayoutInfo();
          const contentLeft = layoutInfo.contentLeft; // accounts for line numbers, glyph margin, etc.

          // Approximate character width (Monaco uses monospace font)
          const fontInfo = editor.getOption(monacoRef.current.editor.EditorOption.fontInfo);
          const charWidth = fontInfo.typicalHalfwidthCharacterWidth || 7.8;

          // Calculate pixel positions
          const top = topForLine - scrollTop;
          const left = contentLeft + (position.column - 1) * charWidth;

          // Only show if visible in viewport
          if (top < 0 || top > editor.getLayoutInfo().height) return null;

          return {
            id: userId,
            userName,
            top,
            left
          };
        } catch (e) {
          console.error('Error calculating cursor position:', e);
          return null;
        }
      }).filter(Boolean);

      setCursorLabels(labels);
    };

    updateCursorLabelPositions();
  }, [remoteCursors, activeFileId, showCursors]);

  // Update label positions on scroll
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !showCursors) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const updateLabels = () => {
      if (!showCursors) {
        setCursorLabels([]);
        return;
      }
      // In readOnly mode (student), show all cursors. Otherwise filter out own cursor.
      const currentUserId = user?.id?.toString();
      const cursorsForFile = Array.from(remoteCursors.entries())
        .filter(([userId, data]) => {
          const matches = data.fileId === activeFileId;
          const shouldShow = readOnly || (currentUserId && userId.toString() !== currentUserId);
          return matches && shouldShow;
        });

      const labels = cursorsForFile.map(([userId, data]) => {
        const { userName, position } = data;
        if (!position) return null;

        try {
          // Get the top position for the line
          const topForLine = editor.getTopForLineNumber(position.lineNumber);
          const scrollTop = editor.getScrollTop();
          const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);

          // Calculate left position using column
          const layoutInfo = editor.getLayoutInfo();
          const contentLeft = layoutInfo.contentLeft;

          // Get character width
          const fontInfo = editor.getOption(monaco.editor.EditorOption.fontInfo);
          const charWidth = fontInfo.typicalHalfwidthCharacterWidth || 7.8;

          // Calculate pixel positions
          const top = topForLine - scrollTop;
          const left = contentLeft + (position.column - 1) * charWidth;

          // Only show if visible in viewport
          if (top < 0 || top > layoutInfo.height) return null;

          return {
            id: userId,
            userName,
            top,
            left
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      setCursorLabels(labels);
    };

    const scrollDisposable = editor.onDidScrollChange(updateLabels);
    const layoutDisposable = editor.onDidLayoutChange(updateLabels);

    // Initial update
    updateLabels();

    return () => {
      scrollDisposable.dispose();
      layoutDisposable.dispose();
    };
  }, [remoteCursors, activeFileId, user?.id, showCursors, readOnly]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      const position = e.position;
      const selection = editor.getSelection();
      sendCursorPosition(position, selection);
    });

    // Track selection changes
    editor.onDidChangeCursorSelection((e) => {
      const position = editor.getPosition();
      const selection = e.selection;
      sendCursorPosition(position, selection);
    });

    // Add CSS for remote cursors
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      .remote-cursor-line {
        border-left: 2px solid #818cf8 !important;
        margin-left: -1px;
      }
      .remote-cursor-marker {
        background-color: rgba(129, 140, 248, 0.1);
      }
      .remote-selection {
        background-color: rgba(129, 140, 248, 0.25) !important;
      }
      .remote-cursor-glyph {
        background: linear-gradient(135deg, #818cf8, #a855f7);
        width: 3px !important;
        margin-left: 3px;
        border-radius: 2px;
      }
    `;
    document.head.appendChild(styleSheet);

    // Register JSX language
    monaco.languages.register({ id: 'jsx' });

    // Define JavaScript tokenizer
    monaco.languages.setMonarchTokensProvider('javascript', {
      tokenizer: {
        root: [
          // Comments
          [/\/\/.*$/, 'comment'],
          [/\/\*[\s\S]*?\*\//, 'comment'],

          // Strings
          [/"([^"\\]|\\.)*"/, 'string'],
          [/'([^'\\]|\\.)*'/, 'string'],
          [/`/, { token: 'string', next: '@template' }],

          // Keywords
          [/\b(import|export|default|from|as|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|typeof|instanceof|in|of|class|extends|super|this|static|async|await|yield|null|undefined|true|false)\b/, 'keyword'],

          // React Hooks
          [/\b(useState|useEffect|useRef|useContext|useCallback|useMemo|useReducer|Fragment|React|ReactDOM)\b/, 'keyword.react'],

          // Function calls
          [/\b([a-zA-Z_]\w*)\s*(?=\()/, 'function.call'],

          // Components (capitalized)
          [/\b([A-Z]\w*)\s*(?=[({]|<)/, 'identifier.component'],

          // Numbers
          [/\b\d+(\.\d+)?\b/, 'number'],

          // Brackets
          [/[{}]/, 'bracket.curly'],
          [/[\[\]]/, 'bracket.square'],
          [/[()]/, 'bracket.round'],

          // Operators
          [/[+\-*/%=<>!&|^~?:;]/, 'operator'],
          [/=>/, 'operator.arrow'],
          [/\.\.\./, 'operator.spread'],

          // Whitespace
          [/\s+/, 'white'],
        ],
        template: [
          [/\$\{/, { token: 'string.escape', next: '@templateExpression' }],
          [/`/, { token: 'string', next: '@pop' }],
          [/./, 'string'],
        ],
        templateExpression: [
          [/\}/, { token: 'string.escape', next: '@template' }],
          { include: 'root' },
        ],
      }
    });

    monaco.editor.setTheme('vs-dark');

    // JSX Tag Completion
    monaco.languages.registerCompletionItemProvider('javascript', {
      triggerCharacters: ['<', 'd', 's', 'p', 'a', 'b', 'i', 'f', 'h', 'u', 'o', 'l', 't', 'n', 'm', 'e', 'v', 'c', 'r'],
      provideCompletionItems: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.substring(0, position.column);
        const tagMatch = beforeCursor.match(/<(\w*)$/) || beforeCursor.match(/(\b[a-z]{1,20})$/);

        if (tagMatch) {
          const currentWord = tagMatch[1] || '';
          const htmlElements = [
            { name: 'div', snippet: '<div>$0</div>' },
            { name: 'span', snippet: '<span>$0</span>' },
            { name: 'p', snippet: '<p>$0</p>' },
            { name: 'a', snippet: '<a href="$0"></a>' },
            { name: 'button', snippet: '<button onClick={$0}></button>' },
            { name: 'input', snippet: '<input type="text" $0/>' },
            { name: 'img', snippet: '<img src="$0" alt="" />' },
            { name: 'h1', snippet: '<h1>$0</h1>' },
            { name: 'h2', snippet: '<h2>$0</h2>' },
            { name: 'h3', snippet: '<h3>$0</h3>' },
            { name: 'ul', snippet: '<ul>\n  <li>$0</li>\n</ul>' },
            { name: 'ol', snippet: '<ol>\n  <li>$0</li>\n</ol>' },
            { name: 'li', snippet: '<li>$0</li>' },
            { name: 'form', snippet: '<form onSubmit={$0}></form>' },
            { name: 'header', snippet: '<header>$0</header>' },
            { name: 'footer', snippet: '<footer>$0</footer>' },
            { name: 'nav', snippet: '<nav>$0</nav>' },
            { name: 'main', snippet: '<main>$0</main>' },
            { name: 'section', snippet: '<section>$0</section>' },
          ];

          return {
            suggestions: htmlElements
              .filter(el => el.name.startsWith(currentWord.toLowerCase()))
              .map(el => ({
                label: el.name,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: el.snippet,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Insert <' + el.name + '> element',
                detail: 'HTML Element',
              }))
          };
        }
        return { suggestions: [] };
      }
    });

    // React Hooks Completion
    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.substring(0, position.column);
        const word = beforeCursor.match(/[\w]+$/)?.[0] || '';

        if (word.length === 0) return { suggestions: [] };

        const items = [
          { label: 'useState', detail: 'React Hook', snippet: 'useState($1)' },
          { label: 'useEffect', detail: 'React Hook', snippet: 'useEffect(() => {\n  $1\n}, [])' },
          { label: 'useRef', detail: 'React Hook', snippet: 'useRef($1)' },
          { label: 'useContext', detail: 'React Hook', snippet: 'useContext($1)' },
          { label: 'useCallback', detail: 'React Hook', snippet: 'useCallback(() => {\n  $1\n}, [])' },
          { label: 'useMemo', detail: 'React Hook', snippet: 'useMemo(() => {\n  return $1\n}, [])' },
          { label: 'console.log', detail: 'Log to console', snippet: 'console.log($1)' },
          { label: 'console.error', detail: 'Log error', snippet: 'console.error($1)' },
        ];

        return {
          suggestions: items
            .filter(item => item.label.toLowerCase().includes(word.toLowerCase()))
            .map(item => ({
              label: item.label,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: item.snippet,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: item.detail,
              detail: item.detail,
            }))
        };
      }
    });

    // CSS Property Completion
    monaco.languages.registerCompletionItemProvider('css', {
      triggerCharacters: [':'],
      provideCompletionItems: () => {
        const cssProperties = [
          { name: 'background-color', value: '#000000' },
          { name: 'color', value: '#000000' },
          { name: 'font-size', value: '16px' },
          { name: 'padding', value: '10px' },
          { name: 'margin', value: '10px' },
          { name: 'border', value: '1px solid #000' },
          { name: 'display', value: 'flex' },
          { name: 'width', value: '100%' },
          { name: 'height', value: 'auto' },
          { name: 'justify-content', value: 'center' },
          { name: 'align-items', value: 'center' },
        ];

        return {
          suggestions: cssProperties.map(prop => ({
            label: prop.name,
            kind: monacoRef.current.languages.CompletionItemKind.Property,
            insertText: ' ' + prop.value,
            documentation: 'Set ' + prop.name + ' property',
          }))
        };
      }
    });

    // Save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeFileId) {
        saveFile(activeFileId);
      }
    });

    // Run code shortcut (Ctrl+Enter)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRunCode) {
        onRunCode();
      }
    });

    // Toggle line comment shortcut (Ctrl+/)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      editor.trigger('keyboard', 'editor.action.commentLine', null);
    });
  };

  // Handle content change - send to other users in real-time
  const handleEditorChange = (value) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value);
      // Send code change to other users with slight debounce (100ms)
      if (isConnected) {
        if (codeChangeThrottleRef.current) {
          clearTimeout(codeChangeThrottleRef.current);
        }
        codeChangeThrottleRef.current = setTimeout(() => {
          const position = editorRef.current?.getPosition();
          sendCodeChange(activeFileId, value, position);
          codeChangeThrottleRef.current = null;
        }, 100); // 100ms debounce for code changes
      }
    }
  };

  // Listen for incoming code changes from other users
  useEffect(() => {
    if (!activeFileId || !editorRef.current) return;

    // Find changes for the current file
    const changes = pendingChanges.filter(c => c.fileId === activeFileId);
    if (changes.length === 0) return;

    // Apply the latest change
    const latestChange = changes[changes.length - 1];
    const currentContent = getFileContent(activeFileId);

    // Only update if content is different (avoid infinite loop)
    if (latestChange.content !== currentContent) {
      updateFileContent(activeFileId, latestChange.content);
    }

    // Mark changes as consumed
    consumePendingChanges(activeFileId);
  }, [pendingChanges, activeFileId, getFileContent, updateFileContent, consumePendingChanges]);

  // --- TAB ACTIONS ---
  const handleTabClick = (id) => {
    setActiveFileId(id);
  };

  const handleCloseTab = (e, id) => {
    e.stopPropagation();
    closeFile(id);
  };

  // Build breadcrumb path
  const getBreadcrumbs = () => {
    if (!activeFileId) return [];
    const path = getFilePath(activeFileId);
    return path ? path.split('/') : [];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex flex-col h-full w-full bg-zinc-900/80 backdrop-blur-sm overflow-hidden">

      {/* 1. TABS BAR */}
      <div className="flex bg-zinc-900/80 h-9 border-b border-indigo-500/20 overflow-x-auto custom-scrollbar-hide shrink-0">
        {openFiles.map((file) => {
          const fileInfo = getFileIcon(file.name);
          return (
            <div
              key={file.id}
              onClick={() => handleTabClick(file.id)}
              className={`group flex items-center gap-2 px-3 min-w-[120px] max-w-[200px] text-xs cursor-pointer border-r border-zinc-800 select-none transition-colors duration-75 ${file.id === activeFileId ? 'bg-zinc-800/50 text-white border-t-2 border-t-indigo-500' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/30'}`}
            >
              <span className={fileInfo.color}>
                {fileInfo.icon}
              </span>
              <span className="flex-1 truncate">{file.name}</span>
              <div
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-indigo-500/30"
                onClick={(e) => handleCloseTab(e, file.id)}
              >
                {file.unsaved && (
                  <div className="w-2 h-2 bg-white rounded-full group-hover:hidden absolute"></div>
                )}
                <X className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
        <div className="flex-1 flex justify-end items-center pr-2 gap-2 text-zinc-400 bg-zinc-900/80">
          {/* Cursor visibility toggle - only show if callback is provided */}
          {onToggleCursors && (
            <button
              onClick={onToggleCursors}
              className={`p-1 rounded transition-colors flex items-center gap-1 ${showCursors ? 'hover:bg-indigo-500/20 text-indigo-400' : 'hover:bg-zinc-700/50 text-zinc-500'}`}
              title={showCursors ? "Hide Remote Cursors" : "Show Remote Cursors"}
            >
              {showCursors ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              <Users className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onRunCode}
            disabled={!activeFileId}
            className={`p-1.5 rounded flex items-center gap-1.5 transition-all ${activeFileId ? 'bg-green-600/20 hover:bg-green-500/30 text-green-400 border border-green-500/30' : 'opacity-40 cursor-not-allowed text-zinc-500'}`}
            title="Run Code (Ctrl+Enter)"
          >
            <Play className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Run</span>
          </button>
          <Split className="w-4 h-4 hover:text-white cursor-pointer" title="Split Editor" />
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1 hover:bg-indigo-500/20 rounded transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Editor"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 hover:text-indigo-400 cursor-pointer" />
              ) : (
                <Maximize2 className="w-4 h-4 hover:text-indigo-400 cursor-pointer" />
              )}
            </button>
          )}
          <MoreHorizontal className="w-4 h-4 hover:text-white cursor-pointer" title="More Actions" />
        </div>
      </div>

      {/* 2. BREADCRUMBS */}
      <div className="h-6 flex items-center px-4 bg-zinc-900/50 text-[11px] text-zinc-500 border-b border-indigo-500/20 select-none shrink-0">
        {breadcrumbs.length > 0 ? (
          breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="w-3 h-3 mx-1" />}
              <span className={index === breadcrumbs.length - 1 ? 'text-zinc-300' : 'hover:text-zinc-300 cursor-pointer'}>
                {crumb}
              </span>
            </React.Fragment>
          ))
        ) : (
          <span className="text-gray-500 italic">No file open</span>
        )}
      </div>

      {/* 3. EDITOR AREA (MONACO) */}
      <div className="flex-1 relative overflow-hidden flex flex-col" ref={editorContainerRef}>
        {activeFile ? (
          <>
            <div className="absolute inset-0">
              <Editor
                height="100%"
                language={getLanguage(activeFile.name)}
                theme="vs-dark"
                value={codeContent}
                onChange={readOnly ? undefined : handleEditorChange}
                onMount={handleEditorDidMount}
                path={'file:///' + activeFile.name}
                options={{
                  // VS Code-like features
                  minimap: { enabled: true, size: 'proportional', showSlider: 'mouseover' },
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: true,
                  scrollBeyondLastLine: true,
                  readOnly: readOnly,
                  automaticLayout: true,
                  fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                  fontLigatures: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  smoothScrolling: true,
                  glyphMargin: true,

                  // Bracket features
                  bracketPairColorization: { enabled: true },
                  guides: {
                    bracketPairs: true,
                    bracketPairsHorizontal: true,
                    indentation: true,
                    highlightActiveIndentation: true
                  },
                  matchBrackets: 'always',

                  // Code folding
                  folding: true,
                  foldingHighlight: true,
                  foldingStrategy: 'auto',
                  showFoldingControls: 'mouseover',

                  // Find & Replace
                  find: {
                    addExtraSpaceOnTop: false,
                    autoFindInSelection: 'multiline',
                    seedSearchStringFromSelection: 'always'
                  },

                  // Suggestions & IntelliSense
                  inlineSuggest: { enabled: !readOnly },
                  quickSuggestions: readOnly ? false : {
                    other: true,
                    comments: true,
                    strings: true,
                  },
                  suggest: {
                    localityBonus: true,
                    shareSuggestSelections: true,
                    showKeywords: true,
                    showSnippets: true,
                    showFunctions: true,
                    showVariables: true,
                    showClasses: true,
                    preview: true,
                    previewMode: 'subwordSmart'
                  },
                  acceptSuggestionOnCommitCharacter: !readOnly,
                  acceptSuggestionOnEnter: readOnly ? 'off' : 'on',

                  // Formatting
                  tabSize: 2,
                  useTabStops: true,
                  formatOnPaste: true,
                  formatOnType: true,
                  autoIndent: 'full',

                  // Word wrap
                  wordWrap: 'on',
                  wordWrapColumn: 120,
                  wrappingIndent: 'indent',

                  // Multi-cursor
                  multiCursorModifier: 'alt',

                  // Other enhancements
                  renderWhitespace: 'selection',
                  renderLineHighlight: 'all',
                  renderControlCharacters: true,
                  scrollbar: {
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                    useShadows: true,
                    verticalHasArrows: false,
                    horizontalHasArrows: false
                  },
                  wordBasedSuggestions: readOnly ? 'off' : 'allDocuments',
                  linkedEditing: true,
                  colorDecorators: true,
                  mouseWheelZoom: true,
                  stickyScroll: { enabled: true },
                }}
              />
            </div>

            {/* Floating Remote Cursor Labels - positioned relative to editor */}
            {showCursors && cursorLabels.map((label) => (
              <div
                key={label.id}
                className="absolute pointer-events-none z-50"
                style={{
                  top: label.top - 2, // position just above the line
                  left: label.left,
                  transform: 'translateY(-100%)', // move label above the cursor position
                }}
              >
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  {label.userName}
                </div>
                <div className="w-0.5 h-3 bg-gradient-to-b from-indigo-500 to-purple-500 ml-1"></div>
              </div>
            ))}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 select-none">
            <div className="text-4xl mb-4 text-zinc-700">⌘</div>
            <p>Select a file to start editing</p>
            <p className="text-xs mt-2 opacity-50">Use the explorer to open files</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
