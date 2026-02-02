import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useFileSystem } from '../context/FileSystemContext';
import {
  X,
  MoreHorizontal,
  Play,
  Split,
  ChevronRight,
  Maximize2,
  Trash2,
  Plus,
  Minimize2
} from 'lucide-react';

/**
 * CodeEditor Component
 * Uses Monaco Editor for the editing surface and connects to FileSystemContext.
 */
const CodeEditor = () => {
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

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

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
  };

  // Handle content change
  const handleEditorChange = (value) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value);
    }
  };

  // --- TAB ACTIONS ---
  const handleTabClick = (id) => {
    setActiveFileId(id);
  };

  const handleCloseTab = (e, id) => {
    e.stopPropagation();
    closeFile(id);
  };

  // --- TERMINAL RESIZE LOGIC ---
  const startResizing = React.useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback((e) => {
    if (isResizing) {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 32 && newHeight < window.innerHeight * 0.8) {
        setTerminalHeight(newHeight);
        if (!terminalOpen && newHeight > 40) setTerminalOpen(true);
      }
    }
  }, [isResizing, terminalOpen]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

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
          <Play className="w-4 h-4 hover:text-green-400 cursor-pointer" />
          <Split className="w-4 h-4 hover:text-white cursor-pointer" />
          <MoreHorizontal className="w-4 h-4 hover:text-white cursor-pointer" />
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
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {activeFile ? (
          <Editor
            height="100%"
            language={getLanguage(activeFile.name)}
            theme="vs-dark"
            value={codeContent}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            path={'file:///' + activeFile.name}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              readOnly: false,
              automaticLayout: true,
              fontFamily: "'Fira Code', 'Droid Sans Mono', 'monospace'",
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              inlineSuggest: { enabled: true },
              quickSuggestions: {
                other: true,
                comments: false,
                strings: true,
              },
              suggest: {
                localityBonus: true,
                shareSuggestSelections: true,
              },
              acceptSuggestionOnCommitCharacter: true,
              acceptSuggestionOnEnter: 'on',
              tabSize: 2,
              useTabStops: true,
              wordBasedSuggestions: 'currentDocument',
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 select-none">
            <div className="text-4xl mb-4 text-zinc-700">⌘</div>
            <p>Select a file to start editing</p>
            <p className="text-xs mt-2 opacity-50">Use the explorer to open files</p>
          </div>
        )}
      </div>

      {/* 4. TERMINAL / BOTTOM PANEL (Resizable) */}
      <div
        className="border-t border-indigo-500/20 bg-zinc-900/80 flex flex-col relative shrink-0"
        style={{ height: terminalOpen ? terminalHeight + 'px' : '32px' }}
      >
        {/* Resizer Handle */}
        <div
          className="absolute -top-1 left-0 right-0 h-2 bg-transparent cursor-ns-resize z-20 hover:bg-indigo-600/30 transition-colors"
          onMouseDown={startResizing}
        ></div>

        {/* Panel Header */}
        <div className="h-8 flex items-center justify-between px-4 bg-zinc-900/80 border-b border-indigo-500/20 select-none shrink-0">
          <div className="flex items-center gap-6 text-xs font-medium uppercase tracking-wide">
            <button
              className={`h-full border-b-2 px-1 ${activeTab === 0 ? 'text-white border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
              onClick={() => { setActiveTab(0); setTerminalOpen(true); }}
            >
              Terminal
            </button>
            <button
              className={`h-full border-b-2 px-1 ${activeTab === 1 ? 'text-white border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
              onClick={() => { setActiveTab(1); setTerminalOpen(true); }}
            >
              Output
            </button>
            <button
              className={`h-full border-b-2 px-1 flex items-center gap-1 ${activeTab === 2 ? 'text-white border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
              onClick={() => { setActiveTab(2); setTerminalOpen(true); }}
            >
              Problems <span className="bg-green-500/20 text-green-400 px-1.5 rounded-full text-[10px]">0</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-zinc-400 hover:text-zinc-300 transition-colors">
            <Plus className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
            <Trash2 className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
            {terminalOpen ? (
              <Minimize2
                className="w-3.5 h-3.5 cursor-pointer hover:text-white"
                onClick={() => setTerminalOpen(false)}
              />
            ) : (
              <Maximize2
                className="w-3.5 h-3.5 cursor-pointer hover:text-white"
                onClick={() => setTerminalOpen(true)}
              />
            )}
            <X
              className="w-3.5 h-3.5 cursor-pointer hover:text-white"
              onClick={() => setTerminalOpen(false)}
            />
          </div>
        </div>

        {/* Panel Content */}
        {terminalOpen && (
          <div className="flex-1 p-3 font-mono text-xs overflow-y-auto custom-scrollbar bg-zinc-950/50">
            {activeTab === 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">user@codesync</span>
                  <span className="text-pink-400">MINGW64</span>
                  <span className="text-yellow-400">~/My_Project</span>
                  <span className="text-indigo-400">(main)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">$</span>
                  <span className="text-white">Ready</span>
                </div>
                <br />
                <div className="flex items-center gap-2 animate-pulse">
                  <span className="text-zinc-400">$</span>
                  <span className="w-2 h-4 bg-zinc-400 block"></span>
                </div>
              </div>
            )}

            {activeTab === 1 && (
              <div className="text-zinc-400">
                <p>No output yet.</p>
              </div>
            )}

            {activeTab === 2 && (
              <div className="text-zinc-400">
                <p>No problems found.</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default CodeEditor;
