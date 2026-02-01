import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
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

// --- MOCK CONTENT FOR DIFFERENT FILES ---
const FILE_CONTENTS = {
        'App.js': `// Simple Counter Application in JavaScript

let count = 0;
let name = "Developer";

// DOM Elements
const nameInput = document.getElementById('name-input');
const countDisplay = document.getElementById('count-display');
const incrementBtn = document.getElementById('increment-btn');
const decrementBtn = document.getElementById('decrement-btn');
const resetBtn = document.getElementById('reset-btn');

// Event Listeners
incrementBtn.addEventListener('click', () => {
  count++;
  updateDisplay();
});

decrementBtn.addEventListener('click', () => {
  count--;
  updateDisplay();
});

resetBtn.addEventListener('click', () => {
  count = 0;
  updateDisplay();
});

nameInput.addEventListener('input', (e) => {
  name = e.target.value;
  updateDisplay();
});

// Update Display Function
function updateDisplay() {
  countDisplay.textContent = 'Count: ' + count;
  document.getElementById('greeting').textContent = 'Welcome, ' + name + '!';
}

// Initialize
updateDisplay();`,
        'styles.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.app-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  padding: 2rem;
  max-width: 600px;
  width: 100%;
}

header {
  text-align: center;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 1rem;
}

header h1 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 2rem;
}

header p {
  color: #666;
  font-size: 1.1rem;
}

main {
  margin-top: 2rem;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

input[type="text"] {
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

input[type="text"]:focus {
  outline: none;
  border-color: #667eea;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

button {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

button:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

button:active {
  transform: translateY(0);
}`,
        'utils.js': `// Utility functions for the application

export const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const calculateSum = (arr) => {
  return arr.reduce((acc, val) => acc + val, 0);
};

export const calculateAverage = (arr) => {
  if (arr.length === 0) return 0;
  return calculateSum(arr) / arr.length;
};

export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const fetchUserData = async (userId) => {
  try {
    const response = await fetch('/api/users/' + userId);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

export const validateEmail = (email) => {
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return regex.test(email);
};`
};

/**
 * CodeEditor Component
 * Uses Monaco Editor for the editing surface.
 */
const CodeEditor = ({

        initialFiles = [
                { id: '1', name: 'App.js', type: 'jsx', unsaved: true },
                { id: '2', name: 'styles.css', type: 'css', unsaved: false },
                { id: '3', name: 'utils.js', type: 'javascript', unsaved: false },
        ],
        collaborators = []
}) => {
        const [files, setFiles] = useState(initialFiles);
        const [activeFileId, setActiveFileId] = useState('1');

        // Terminal State
        const [terminalOpen, setTerminalOpen] = useState(true);
        const [terminalHeight, setTerminalHeight] = useState(192); // ~12rem
        const [isResizing, setIsResizing] = useState(false);
        const [activeTab, setActiveTab] = useState(0);

        const activeFile = files.find(f => f.id === activeFileId);
        const codeContent = activeFile ? (FILE_CONTENTS[activeFile.name] || '// No content') : '// No open files';

        // Monaco Refs
        const editorRef = useRef(null);
        const monacoRef = useRef(null);

        const handleEditorDidMount = (editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;

                // Register JSX language
                monaco.languages.register({ id: 'jsx' });

                // Define JavaScript tokenizer without JSX
                monaco.languages.setMonarchTokensProvider('javascript', {
                        tokenizer: {
                                root: [
                                        // Comments
                                        [/\/\/.*$/, 'comment'],
                                        [/\/\*[\s\S]*?\*\//, 'comment'],
                                        
                                        // Strings
                                        [/"([^"\\]|\\.)*"/, 'string'],
                                        [/'([^'\\]|\\.)*'/, 'string'],
                                        
                                        // Keywords - Blue/Indigo
                                        [/\b(import|export|default|from|as|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|typeof|instanceof|in|of|class|extends|super|this|static|async|await|yield|null|undefined|true|false)\b/, 'keyword'],
                                        
                                        // React/JS keywords - Light blue
                                        [/\b(useState|useEffect|useRef|useContext|useCallback|useMemo|useReducer|Fragment|React|ReactDOM)\b/, 'keyword.react'],
                                        
                                        // Function definitions - Yellow
                                        [/\bfunction\s+([a-zA-Z_]\w*)/, ['keyword', 'function.definition']],
                                        
                                        // Arrow function / named function assignments - Yellow
                                        [/\b([a-zA-Z_]\w*)\s*=\s*(function|\([^)]*\)\s*=>)/, ['function.definition', 'keyword']],
                                        
                                        // Function calls - Yellow
                                        [/\b([a-zA-Z_]\w*)\s*(?=\()/, 'function.call'],
                                        
                                        // Built-in event handlers and methods - Yellow
                                        [/\b(onClick|onChange|onSubmit|onFocus|onBlur|onMouseEnter|onMouseLeave|onKeyDown|onKeyUp|onKeyPress|onLoad|onError|onScroll|onWheel|onDrag|onDrop|onPaste|onCopy|onCut|onDoubleClick|onContextMenu|onInput|onInvalid|onReset|onToggle)\b/, 'function.builtin'],
                                        
                                        // Components - Orange (capitalized)
                                        [/\b([A-Z]\w*)\s*(?=[({]|<)/, 'identifier.component'],
                                        
                                        // Numbers - White
                                        [/\b\d+(\.\d+)?\b/, 'number'],
                                        
                                        // Curly braces - Teal
                                        [/[{}]/, 'bracket.curly'],
                                        
                                        // Square brackets - Teal
                                        [/[\[\]]/, 'bracket.square'],
                                        
                                        // Parentheses - Teal
                                        [/[()]/, 'bracket.round'],
                                        
                                        // Operators
                                        [/[+\-*/%=<>!&|^~?:;]/, 'operator'],
                                        
                                        // Punctuation
                                        [/[,.@]/, 'punctuation'],
                                        
                                        // Arrow functions
                                        [/=>/, 'operator.arrow'],
                                        
                                        // Spread operator
                                        [/\.\.\./, 'operator.spread'],
                                        
                                        // Whitespace
                                        [/\s+/, 'white'],
                                ]
                        }
                });

                // Use built-in Dracula theme (close to our custom dark theme)
                monaco.editor.setTheme('vs-dark');

                // JSX Tag Completion - Type tag name directly without < and it suggests HTML elements
                monaco.languages.registerCompletionItemProvider('javascript', {
                        triggerCharacters: ['<', 'd', 's', 'p', 'a', 'b', 'i', 'f', 'h', 'u', 'o', 'l', 't', 'n', 'm', 'e', 'v', 'c', 'r'],
                        provideCompletionItems: (model, position) => {
                                const lineContent = model.getLineContent(position.lineNumber);
                                const beforeCursor = lineContent.substring(0, position.column);
                                
                                // Check if we're inside JSX context (after < or typing tag name)
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
                                                { name: 'h4', snippet: '<h4>$0</h4>' },
                                                { name: 'h5', snippet: '<h5>$0</h5>' },
                                                { name: 'h6', snippet: '<h6>$0</h6>' },
                                                { name: 'ul', snippet: '<ul>\n  <li>$0</li>\n</ul>' },
                                                { name: 'ol', snippet: '<ol>\n  <li>$0</li>\n</ol>' },
                                                { name: 'li', snippet: '<li>$0</li>' },
                                                { name: 'form', snippet: '<form onSubmit={$0}></form>' },
                                                { name: 'label', snippet: '<label>$0</label>' },
                                                { name: 'textarea', snippet: '<textarea $0></textarea>' },
                                                { name: 'select', snippet: '<select>\n  <option>$0</option>\n</select>' },
                                                { name: 'option', snippet: '<option>$0</option>' },
                                                { name: 'header', snippet: '<header>$0</header>' },
                                                { name: 'footer', snippet: '<footer>$0</footer>' },
                                                { name: 'nav', snippet: '<nav>$0</nav>' },
                                                { name: 'main', snippet: '<main>$0</main>' },
                                                { name: 'section', snippet: '<section>$0</section>' },
                                                { name: 'article', snippet: '<article>$0</article>' },
                                                { name: 'aside', snippet: '<aside>$0</aside>' },
                                                { name: 'table', snippet: '<table>\n  <tr>\n    <td>$0</td>\n  </tr>\n</table>' },
                                                { name: 'tr', snippet: '<tr>\n  <td>$0</td>\n</tr>' },
                                                { name: 'td', snippet: '<td>$0</td>' },
                                                { name: 'th', snippet: '<th>$0</th>' },
                                                { name: 'thead', snippet: '<thead>$0</thead>' },
                                                { name: 'tbody', snippet: '<tbody>$0</tbody>' },
                                                { name: 'video', snippet: '<video src="$0"></video>' },
                                                { name: 'audio', snippet: '<audio src="$0"></audio>' },
                                                { name: 'canvas', snippet: '<canvas>$0</canvas>' },
                                                { name: 'svg', snippet: '<svg>$0</svg>' },
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
                                                                sortText: '0_' + el.name,
                                                        }))
                                        };
                                }
                                return { suggestions: [] };
                        }
                });

                // JSX Attribute Completion - Triggered by space after tag name
                monaco.languages.registerCompletionItemProvider('javascript', {
                        triggerCharacters: [' ', ':'],
                        provideCompletionItems: (model, position) => {
                                const lineContent = model.getLineContent(position.lineNumber);
                                const beforeCursor = lineContent.substring(0, position.column - 1);
                                
                                // Check if inside JSX tag
                                const tagMatch = beforeCursor.match(/<(\w+)[^>]*$/);
                                if (tagMatch) {
                                        const commonAttributes = [
                                                { name: 'className', snippet: 'className="$1"' },
                                                { name: 'id', snippet: 'id="$1"' },
                                                { name: 'style', snippet: 'style={{ $1 }}' },
                                                { name: 'onClick', snippet: 'onClick={$1}' },
                                                { name: 'onChange', snippet: 'onChange={$1}' },
                                                { name: 'onSubmit', snippet: 'onSubmit={$1}' },
                                                { name: 'onFocus', snippet: 'onFocus={$1}' },
                                                { name: 'onBlur', snippet: 'onBlur={$1}' },
                                                { name: 'onMouseEnter', snippet: 'onMouseEnter={$1}' },
                                                { name: 'onMouseLeave', snippet: 'onMouseLeave={$1}' },
                                                { name: 'disabled', snippet: 'disabled' },
                                                { name: 'placeholder', snippet: 'placeholder="$1"' },
                                                { name: 'value', snippet: 'value="$1"' },
                                                { name: 'type', snippet: 'type="$1"' },
                                                { name: 'href', snippet: 'href="$1"' },
                                                { name: 'src', snippet: 'src="$1"' },
                                                { name: 'alt', snippet: 'alt="$1"' },
                                                { name: 'title', snippet: 'title="$1"' },
                                                { name: 'target', snippet: 'target="$1"' },
                                                { name: 'rel', snippet: 'rel="$1"' },
                                                { name: 'required', snippet: 'required' },
                                                { name: 'readonly', snippet: 'readonly' },
                                                { name: 'autoFocus', snippet: 'autoFocus' },
                                                { name: 'data-testid', snippet: 'data-testid="$1"' },
                                        ];
                                        
                                        return {
                                                suggestions: commonAttributes.map(attr => ({
                                                        label: attr.name,
                                                        kind: monaco.languages.CompletionItemKind.Property,
                                                        insertText: attr.snippet,
                                                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                                        documentation: 'Insert ' + attr.name + ' attribute',
                                                        detail: 'JSX Attribute',
                                                        sortText: '1_' + attr.name,
                                                }))
                                        };
                                }
                                return { suggestions: [] };
                        }
                });

                // React Hooks & Functions Completion
                monaco.languages.registerCompletionItemProvider('javascript', {
                        provideCompletionItems: (model, position) => {
                                const lineContent = model.getLineContent(position.lineNumber);
                                const beforeCursor = lineContent.substring(0, position.column);
                                const word = beforeCursor.match(/[\w]+$/)?.[0] || '';
                                
                                if (word.length === 0) return { suggestions: [] };
                                
                                const items = [
                                        // React Hooks
                                        { label: 'useState', detail: 'React Hook', kind: 'Function', snippet: 'useState($1)' },
                                        { label: 'useEffect', detail: 'React Hook', kind: 'Function', snippet: 'useEffect(() => {\n  $1\n}, [])' },
                                        { label: 'useRef', detail: 'React Hook', kind: 'Function', snippet: 'useRef($1)' },
                                        { label: 'useContext', detail: 'React Hook', kind: 'Function', snippet: 'useContext($1)' },
                                        { label: 'useCallback', detail: 'React Hook', kind: 'Function', snippet: 'useCallback(() => {\n  $1\n}, [])' },
                                        { label: 'useMemo', detail: 'React Hook', kind: 'Function', snippet: 'useMemo(() => {\n  return $1\n}, [])' },
                                        { label: 'useReducer', detail: 'React Hook', kind: 'Function', snippet: 'useReducer($1, {})' },
                                        
                                        // Common JS functions
                                        { label: 'console.log', detail: 'Log to console', kind: 'Function', snippet: 'console.log($1)' },
                                        { label: 'console.error', detail: 'Log error', kind: 'Function', snippet: 'console.error($1)' },
                                        { label: 'JSON.stringify', detail: 'Convert to JSON', kind: 'Function', snippet: 'JSON.stringify($1)' },
                                        { label: 'JSON.parse', detail: 'Parse JSON', kind: 'Function', snippet: 'JSON.parse($1)' },
                                        { label: 'Array.map', detail: 'Map array', kind: 'Function', snippet: 'map(($1) => {})' },
                                        { label: 'Array.filter', detail: 'Filter array', kind: 'Function', snippet: 'filter(($1) => {})' },
                                        { label: 'Array.reduce', detail: 'Reduce array', kind: 'Function', snippet: 'reduce(($1, item) => {}, [])' },
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
                                                        sortText: '2_' + item.label,
                                                }))
                                };
                        }
                });

                // CSS Property Completion
                monaco.languages.registerCompletionItemProvider('css', {
                        triggerCharacters: [':'],
                        provideCompletionItems: (model, position) => {
                                const cssProperties = [
                                        { name: 'background-color', value: '#000000' },
                                        { name: 'color', value: '#000000' },
                                        { name: 'font-size', value: '16px' },
                                        { name: 'padding', value: '10px' },
                                        { name: 'margin', value: '10px' },
                                        { name: 'border', value: '1px solid #000' },
                                        { name: 'display', value: 'block' },
                                        { name: 'width', value: '100%' },
                                        { name: 'height', value: 'auto' },
                                        { name: 'flex', value: '1' },
                                        { name: 'justify-content', value: 'center' },
                                        { name: 'align-items', value: 'center' },
                                        { name: 'background', value: '#ffffff' },
                                        { name: 'font-weight', value: 'bold' },
                                        { name: 'text-align', value: 'center' },
                                        { name: 'cursor', value: 'pointer' },
                                        { name: 'transition', value: '0.3s' },
                                        { name: 'box-shadow', value: '0 0 10px rgba(0,0,0,0.1)' },
                                ];

                                return {
                                        suggestions: cssProperties.map(prop => ({
                                                label: prop.name,
                                                kind: monaco.languages.CompletionItemKind.Property,
                                                insertText: ' ' + prop.value,
                                                documentation: 'Set ' + prop.name + ' property',
                                                sortText: '0_' + prop.name,
                                        }))
                                };
                        }
                });

                // CSS Class/ID Selector Completion
                monaco.languages.registerCompletionItemProvider('css', {
                        triggerCharacters: ['.', '#'],
                        provideCompletionItems: (model, position) => {
                                const beforeCursor = model.getLineContent(position.lineNumber).substring(0, position.column - 1);
                                const isClassSelector = beforeCursor.endsWith('.');
                                const isIdSelector = beforeCursor.endsWith('#');

                                if (isClassSelector || isIdSelector) {
                                        const commonClasses = [
                                                'container', 'wrapper', 'header', 'footer', 'nav', 'main', 'sidebar',
                                                'button', 'input', 'form', 'modal', 'card', 'list', 'item',
                                                'active', 'disabled', 'hidden', 'visible', 'dark', 'light'
                                        ];

                                        return {
                                                suggestions: commonClasses.map(cls => ({
                                                        label: cls,
                                                        kind: monaco.languages.CompletionItemKind.Class,
                                                        insertText: cls,
                                                        documentation: 'CSS ' + (isIdSelector ? 'ID' : 'class') + ' selector: ' + (isIdSelector ? '#' : '.') + cls,
                                                        sortText: '0_' + cls,
                                                }))
                                        };
                                }
                                return { suggestions: [] };
                        }
                });
        };

        // --- TAB ACTIONS ---

        const handleTabClick = (id) => {
                setActiveFileId(id);
        };

        const handleCloseTab = (e, id) => {
                e.stopPropagation();
                const newFiles = files.filter(f => f.id !== id);
                setFiles(newFiles);
                if (id === activeFileId && newFiles.length > 0) {
                        const indexObj = files.findIndex(f => f.id === id);
                        const newIndex = indexObj > 0 ? indexObj - 1 : 0;
                        setActiveFileId(newFiles[newIndex].id);
                } else if (newFiles.length === 0) {
                        setActiveFileId(null);
                }
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
                        // Constraints: Min 32px (header height), Max 80% of screen
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

        return (
                <div className="flex flex-col h-full w-full bg-zinc-900/80 backdrop-blur-sm overflow-hidden">

                        {/* 1. TABS BAR */}
                        <div className="flex bg-zinc-900/80 h-9 border-b border-indigo-500/20 overflow-x-auto custom-scrollbar-hide shrink-0">
                                {files.map((file) => (
                                        <div
                                                key={file.id}
                                                onClick={() => handleTabClick(file.id)}
                                                className={'group flex items-center gap-2 px-3 min-w-[120px] max-w-[200px] text-xs cursor-pointer border-r border-zinc-800 select-none transition-colors duration-75 ' + (file.id === activeFileId ? 'bg-zinc-800/50 text-white border-t-2 border-t-indigo-500' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/30')}
                                        >
                                                <span className={file.name.endsWith('css') ? 'text-blue-300' : file.name.endsWith('js') ? 'text-yellow-400' : 'text-blue-400'}>
                                                        {file.name.endsWith('css') ? '#' : 'JS'}
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
                                ))}
                                <div className="flex-1 flex justify-end items-center pr-2 gap-2 text-zinc-400 bg-zinc-900/80">
                                        <Play className="w-4 h-4 hover:text-green-400 cursor-pointer" />
                                        <Split className="w-4 h-4 hover:text-white cursor-pointer" />
                                        <MoreHorizontal className="w-4 h-4 hover:text-white cursor-pointer" />
                                </div>
                        </div>

                        {/* 2. BREADCRUMBS */}
                        <div className="h-6 flex items-center px-4 bg-zinc-900/50 text-[11px] text-zinc-500 border-b border-indigo-500/20 select-none shrink-0">
                                {activeFile ? (
                                        <>
                                                <span className="hover:text-zinc-300 cursor-pointer">src</span>
                                                <ChevronRight className="w-3 h-3 mx-1" />
                                                <span className="hover:text-zinc-300 cursor-pointer">components</span>
                                                <ChevronRight className="w-3 h-3 mx-1" />
                                                <span className="text-zinc-300">{activeFile.name}</span>
                                        </>
                                ) : (
                                        <span className="text-gray-500 italic">No file open</span>
                                )}
                        </div>

                        {/* 3. EDITOR AREA (MONACO) */}
                        <div className="flex-1 relative overflow-hidden flex flex-col">
                                {activeFile ? (
                                        <Editor
                                                height="100%"
                                                language={activeFile.name.endsWith('.css') ? 'css' : 'javascript'}
                                                theme="vs-dark"
                                                value={codeContent}
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
                                                        wordBasedSuggestions: true,
                                                }}
                                        />
                                ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 select-none">
                                                <div className="text-4xl mb-4 text-zinc-700">⌘</div>
                                                <p>Select a file to start editing</p>
                                                <p className="text-xs mt-2 opacity-50">Use Ctrl+P to search files</p>
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
                                                        className={'h-full border-b-2 px-1 ' + (activeTab === 0 ? 'text-white border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300')}
                                                        onClick={() => { setActiveTab(0); setTerminalOpen(true); }}
                                                >
                                                        Terminal
                                                </button>
                                                <button
                                                        className={'h-full border-b-2 px-1 ' + (activeTab === 1 ? 'text-white border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300')}
                                                        onClick={() => { setActiveTab(1); setTerminalOpen(true); }}
                                                >
                                                        Output
                                                </button>
                                                <button
                                                        className={'h-full border-b-2 px-1 flex items-center gap-1 ' + (activeTab === 2 ? 'text-white border-indigo-500' : 'text-zinc-500 border-transparent hover:text-zinc-300')}
                                                        onClick={() => { setActiveTab(2); setTerminalOpen(true); }}
                                                >
                                                        Problems <span className="bg-red-500/20 text-red-400 px-1.5 rounded-full text-[10px]">1</span>
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
                                                                <div className="text-zinc-400">Microsoft Windows [Version 10.0.19045.3693]</div>
                                                                <div className="text-zinc-400">(c) Microsoft Corporation. All rights reserved.</div>
                                                                <br />
                                                                <div className="flex items-center gap-2">
                                                                        <span className="text-green-400">user@codesync</span>
                                                                        <span className="text-pink-400">MINGW64</span>
                                                                        <span className="text-yellow-400">~/projects/react-app</span>
                                                                        <span className="text-indigo-400">(main)</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                        <span className="text-zinc-400">$</span>
                                                                        <span className="text-white">npm start</span>
                                                                </div>
                                                                <div className="text-indigo-300">
                                                                        {'>'} react-app@0.1.0 start<br />
                                                                        {'>'} react-scripts start
                                                                </div>
                                                                <br />
                                                                <div className="text-green-400">Compiled successfully!</div>
                                                                <div className="text-zinc-400">
                                                                        You can now view react-app in the browser.<br />
                                                                        Local:            http://localhost:3000<br />
                                                                        On Your Network:  [http://192.168.1.105:3000](http://192.168.1.105:3000)
                                                                </div>
                                                                <br />
                                                                <div className="flex items-center gap-2 animate-pulse">
                                                                        <span className="text-zinc-400">$</span>
                                                                        <span className="w-2 h-4 bg-zinc-400 block"></span>
                                                                </div>
                                                        </div>
                                                )}

                                                {activeTab === 2 && (
                                                        <div className="text-zinc-300">
                                                                <div className="flex items-start gap-2 hover:bg-indigo-600/20 p-1 cursor-pointer rounded transition-colors border border-transparent hover:border-indigo-500/30">
                                                                        <X className="w-3.5 h-3.5 text-red-500 mt-0.5" />
                                                                        <div>
                                                                                <span className="text-zinc-400">src/App.js:16:35</span>
                                                                                <div className="text-zinc-300">'handleIncrement' is assigned a value but never used.</div>
                                                                        </div>
                                                                </div>
                                                        </div>
                                                )}
                                        </div>
                                )}
                        </div>

                </div>
        );
};

export default CodeEditor;
