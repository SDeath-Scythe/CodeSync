import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
        Files,
        Search,
        GitGraph,
        Users,
        Settings,
        ChevronDown,
        FilePlus,
        FolderPlus,
        Trash2,
        Edit2,
        X,
        CornerDownRight,
        MinusSquare // Icon for Collapse All
} from 'lucide-react';

// --- HELPER FUNCTIONS ---

const getMaterialIcon = (name, type, isOpen) => {
        const baseUrl = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons';
        const lowerName = name.toLowerCase();

        // 1. Folders
        if (type === 'folder') {
                let folderName = 'folder';
                const folderMappings = {
                        src: 'src', dist: 'dist', build: 'dist', out: 'dist', public: 'public',
                        app: 'app', components: 'components', pages: 'views', views: 'views',
                        screens: 'views', layouts: 'layout', assets: 'assets', images: 'images',
                        img: 'images', icons: 'images', styles: 'css', css: 'css', sass: 'sass',
                        scss: 'sass', fonts: 'fonts', utils: 'utils', helpers: 'utils', lib: 'lib',
                        hooks: 'hook', api: 'api', services: 'lib', controllers: 'controller',
                        models: 'model', routes: 'routes', routers: 'routes', middleware: 'middleware',
                        middlewares: 'middleware', config: 'config', configuration: 'config',
                        settings: 'config', tests: 'test', __tests__: 'test', specs: 'test',
                        db: 'database', database: 'database', prisma: 'prisma', graphql: 'graphql',
                        types: 'typescript', interfaces: 'typescript', store: 'redux', redux: 'redux',
                        context: 'react', contexts: 'react', server: 'server', functions: 'functions',
                        node_modules: 'node', git: 'git', github: 'github', vscode: 'vscode',
                        include: 'include', plugin: 'plugin', plugins: 'plugin', auth: 'auth',
                        authentication: 'auth', security: 'security', temp: 'temp', tmp: 'temp',
                        constants: 'constant', global: 'global', client: 'client', base: 'base',
                        environment: 'environment', env: 'environment'
                };

                if (folderMappings[lowerName]) folderName = `folder-${folderMappings[lowerName]}`;
                if (isOpen) folderName += '-open';
                return `${baseUrl}/${folderName}.svg`;
        }

        // 2. Files
        const fileMappings = {
                'package.json': 'nodejs', 'package-lock.json': 'nodejs', 'yarn.lock': 'yarn',
                'tsconfig.json': 'tsconfig', 'jsconfig.json': 'jsconfig', '.gitignore': 'git',
                '.env': 'tune', 'dockerfile': 'docker', 'readme.md': 'readme',
                'next.config.js': 'next', 'vite.config.js': 'vite', 'tailwind.config.js': 'tailwindcss'
        };
        if (fileMappings[lowerName]) return `${baseUrl}/${fileMappings[lowerName]}.svg`;

        const ext = lowerName.split('.').pop();
        const extensionMappings = {
                js: 'javascript', jsx: 'react', ts: 'typescript', tsx: 'react_ts',
                css: 'css', html: 'html', json: 'json', md: 'markdown', py: 'python',
                java: 'java', cpp: 'cpp', go: 'go', php: 'php', sql: 'sql', svg: 'svg',
                png: 'image', jpg: 'image', ico: 'favicon', txt: 'document', pdf: 'pdf',
                zip: 'zip', '7z': 'zip'
        };
        if (extensionMappings[ext]) return `${baseUrl}/${extensionMappings[ext]}.svg`;

        return `${baseUrl}/file.svg`;
};

// --- SUB-COMPONENTS ---

const FileTreeItem = ({
        item,
        depth = 0,
        selectedId,
        onSelect,
        onToggle,
        onDragStart,
        onDragOver,
        onDrop,
        onContextMenu
}) => {
        const paddingLeft = `${depth * 12 + 12}px`;
        const iconUrl = getMaterialIcon(item.name, item.type, item.isOpen);
        const isSelected = selectedId === item.id;

        // Clean text color logic (Git status removed)
        const textColor = isSelected ? 'text-white' : 'text-zinc-400';

        const handleImageError = (e) => {
                e.target.onerror = null;
                const baseUrl = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons';
                e.target.src = item.type === 'folder' ? `${baseUrl}/folder${item.isOpen ? '-open' : ''}.svg` : `${baseUrl}/file.svg`;
        };

        return (
                <div>
                        <div
                                draggable
                                onDragStart={(e) => onDragStart(e, item)}
                                onDragOver={(e) => onDragOver(e, item)}
                                onDrop={(e) => onDrop(e, item)}
                                onContextMenu={(e) => onContextMenu(e, item)}
                                className={`
          flex items-center gap-1.5 py-1 pr-2 cursor-pointer select-none text-sm group relative border border-transparent
          ${isSelected ? 'bg-indigo-600/20 border-indigo-500/30' : 'hover:bg-indigo-600/10 hover:border-indigo-500/20'}
          ${textColor}
        `}
                                style={{ paddingLeft }}
                                onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.type === 'folder') onToggle(item.id);
                                        onSelect(item);
                                }}
                        >
                                {/* Indent Guide */}
                                <div className="absolute left-0 top-0 bottom-0 w-px bg-transparent group-hover:bg-indigo-500/30" style={{ left: `${depth * 12 + 6}px` }}></div>

                                <span className="w-4 flex justify-center shrink-0">
                                        {item.type === 'folder' && (
                                                <ChevronDown
                                                        className={`w-3.5 h-3.5 transition-transform ${!item.isOpen && '-rotate-90'}`}
                                                />
                                        )}
                                </span>
                                <img src={iconUrl} alt={item.type} className="w-4 h-4 object-contain" onError={handleImageError} />
                                <span className="truncate ml-1 font-medium">{item.name}</span>
                        </div>

                        {item.type === 'folder' && item.isOpen && item.children && (
                                <div>
                                        {item.children.map(child => (
                                                <FileTreeItem
                                                        key={child.id}
                                                        item={child}
                                                        depth={depth + 1}
                                                        selectedId={selectedId}
                                                        onSelect={onSelect}
                                                        onToggle={onToggle}
                                                        onDragStart={onDragStart}
                                                        onDragOver={onDragOver}
                                                        onDrop={onDrop}
                                                        onContextMenu={onContextMenu}
                                                />
                                        ))}
                                </div>
                        )}
                </div>
        );
};

const Modal = ({ isOpen, title, message, type, inputValue, onConfirm, onCancel, setInputValue }) => {
        if (!isOpen) return null;
        return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
                        <div className="bg-zinc-900 border border-indigo-500/20 rounded-xl shadow-2xl w-80 overflow-hidden backdrop-blur-sm" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/50 border-b border-indigo-500/20">
                                        <span className="text-xs font-bold text-zinc-300 uppercase">{title}</span>
                                        <button onClick={onCancel} className="text-zinc-400 hover:text-indigo-300 transition-colors"><X className="w-4 h-4" /></button>
                                </div>
                                <div className="p-4">
                                        <p className="text-sm text-zinc-300 mb-3">{message}</p>
                                        {type === 'input' && (
                                                <input
                                                        autoFocus
                                                        type="text"
                                                        value={inputValue}
                                                        onChange={(e) => setInputValue(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
                                                        className="w-full bg-[#3c3c3c] border border-[#3c3c3c] focus:border-blue-500 text-white text-sm rounded px-2 py-1 outline-none"
                                                />
                                        )}
                                </div>
                                <div className="flex justify-end gap-2 px-4 py-2 bg-zinc-800/30 border-t border-indigo-500/20">
                                        <button onClick={onCancel} className="px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700/50 rounded transition-colors">Cancel</button>
                                        <button onClick={onConfirm} className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors shadow-lg shadow-indigo-500/20">Confirm</button>
                                </div>
                        </div>
                </div>
        );
};

// --- MAIN COMPONENT ---

const Sidebar = ({
        fileStructure = [
                {
                        id: 'folder-1', name: 'src', type: 'folder', isOpen: true,
                        children: [
                                {
                                        id: 'folder-2', name: 'components', type: 'folder', isOpen: true,
                                        children: [
                                                { id: 'file-1', name: 'Header.jsx', type: 'file', language: 'react' },
                                                { id: 'file-2', name: 'Sidebar.jsx', type: 'file', language: 'react' },
                                        ]
                                },
                                { id: 'folder-controllers', name: 'controllers', type: 'folder', isOpen: false, children: [] },
                                { id: 'folder-services', name: 'services', type: 'folder', isOpen: false, children: [] },
                                { id: 'file-3', name: 'App.js', type: 'file', language: 'js', active: true },
                                { id: 'file-4', name: 'index.css', type: 'file', language: 'css' },
                        ]
                },
                {
                        id: 'folder-3', name: 'public', type: 'folder', isOpen: false,
                        children: [
                                { id: 'file-5', name: 'index.html', type: 'file', language: 'html' },
                                { id: 'file-6', name: 'favicon.ico', type: 'file', language: 'image' },
                        ]
                },
                { id: 'file-7', name: 'package.json', type: 'file', language: 'json' },
                { id: 'file-8', name: '.env', type: 'file', language: 'env' },
                { id: 'file-9', name: 'README.md', type: 'file', language: 'markdown' },
        ],
        onFileSelect
}) => {
        const [activeTab, setActiveTab] = useState('files');
        const [files, setFiles] = useState(fileStructure);
        const [selectedId, setSelectedId] = useState(null);
        const [draggedItem, setDraggedItem] = useState(null);
        const [contextMenu, setContextMenu] = useState(null);

        const [modal, setModal] = useState({ isOpen: false, type: 'confirm', title: '', message: '', action: null, data: null });
        const [inputValue, setInputValue] = useState('');
        const wrapperRef = useRef(null);

        useEffect(() => {
                const handleClick = () => setContextMenu(null);
                window.addEventListener('click', handleClick);
                return () => window.removeEventListener('click', handleClick);
        }, []);

        const visibleItems = useMemo(() => {
                const flatten = (items) => {
                        let result = [];
                        items.forEach(item => {
                                result.push(item);
                                if (item.type === 'folder' && item.isOpen && item.children) {
                                        result = result.concat(flatten(item.children));
                                }
                        });
                        return result;
                };
                return flatten(files);
        }, [files]);

        useEffect(() => {
                const handleKeyDown = (e) => {
                        if (modal.isOpen) return;

                        if (selectedId) {
                                const currentIndex = visibleItems.findIndex(i => i.id === selectedId);

                                if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        if (currentIndex < visibleItems.length - 1) {
                                                const nextItem = visibleItems[currentIndex + 1];
                                                setSelectedId(nextItem.id);
                                                if (nextItem.type !== 'folder' && onFileSelect) onFileSelect(nextItem);
                                        }
                                } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        if (currentIndex > 0) {
                                                const prevItem = visibleItems[currentIndex - 1];
                                                setSelectedId(prevItem.id);
                                                if (prevItem.type !== 'folder' && onFileSelect) onFileSelect(prevItem);
                                        }
                                } else if (e.key === 'ArrowRight') {
                                        e.preventDefault();
                                        const item = visibleItems[currentIndex];
                                        if (item.type === 'folder') {
                                                if (!item.isOpen) handleToggle(item.id);
                                                else if (item.children && item.children.length > 0) {
                                                        setSelectedId(item.children[0].id);
                                                }
                                        }
                                } else if (e.key === 'ArrowLeft') {
                                        e.preventDefault();
                                        const item = visibleItems[currentIndex];
                                        if (item.type === 'folder' && item.isOpen) {
                                                handleToggle(item.id);
                                        } else {
                                                const parent = findParentFolder(files, item.id);
                                                if (parent) setSelectedId(parent.id);
                                        }
                                } else if (e.key === 'Enter') {
                                        const item = visibleItems[currentIndex];
                                        if (item.type === 'folder') handleToggle(item.id);
                                        else if (onFileSelect) onFileSelect(item);
                                }
                        }

                        if (selectedId) {
                                if (e.key === 'F2') {
                                        const item = findItemById(files, selectedId);
                                        if (item) handleRenameClick(item.id, item.name);
                                }
                                if (e.key === 'Delete') handleDeleteClick(selectedId);
                        }
                };

                window.addEventListener('keydown', handleKeyDown);
                return () => window.removeEventListener('keydown', handleKeyDown);
        }, [selectedId, files, visibleItems, modal.isOpen]);

        const handleCreateClick = (type, parentId = null) => {
                setContextMenu(null);
                setInputValue('');
                setModal({
                        isOpen: true, type: 'input', title: `New ${type}`,
                        message: parentId ? `Create ${type} inside folder?` : `Enter ${type} name:`,
                        action: 'create', data: { type, parentId }
                });
        };

        const handleCollapseAll = () => {
                const collapseRecursive = (items) => {
                        return items.map(item => {
                                if (item.type === 'folder') {
                                        return { ...item, isOpen: false, children: collapseRecursive(item.children || []) };
                                }
                                return item;
                        });
                };
                setFiles(collapseRecursive(files));
        };

        const handleDeleteClick = (itemId) => {
                setContextMenu(null);
                setModal({
                        isOpen: true, type: 'confirm', title: 'Delete Item',
                        message: 'Are you sure you want to delete this? This action cannot be undone.',
                        action: 'delete', data: { itemId }
                });
        };

        const handleRenameClick = (itemId, currentName) => {
                setContextMenu(null);
                setInputValue(currentName);
                setModal({
                        isOpen: true, type: 'input', title: 'Rename Item', message: 'Enter new name:',
                        action: 'rename', data: { itemId }
                });
        };

        const handleModalConfirm = () => {
                if (!modal.action) return;
                if (modal.action === 'create') handleCreateConfirm(modal.data.type, modal.data.parentId);
                else if (modal.action === 'delete') handleDeleteConfirm(modal.data.itemId);
                else if (modal.action === 'rename') handleRenameConfirm(modal.data.itemId);
                else if (modal.action === 'move') {
                        const { draggedId, destinationFolder, itemToMove } = modal.data;
                        executeMove(draggedId, destinationFolder, itemToMove);
                        setModal({ ...modal, isOpen: false });
                }
        };

        const handleCreateConfirm = (type, parentId) => {
                if (!inputValue.trim()) return;
                const newItem = {
                        id: `${type}-${Date.now()}`, name: inputValue, type: type, isOpen: false, children: type === 'folder' ? [] : undefined,
                };
                const addRecursive = (items) => {
                        if (!parentId) return [...items, newItem].sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1);
                        return items.map(item => {
                                if (item.id === parentId) {
                                        return {
                                                ...item, isOpen: true,
                                                children: [...(item.children || []), newItem].sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1)
                                        };
                                }
                                if (item.children) return { ...item, children: addRecursive(item.children) };
                                return item;
                        });
                };
                setFiles(addRecursive(files));
                setModal({ ...modal, isOpen: false });
        };

        const handleDeleteConfirm = (itemId) => {
                const deleteRecursive = (items) => items.filter(item => item.id !== itemId).map(item => {
                        if (item.children) return { ...item, children: deleteRecursive(item.children) };
                        return item;
                });
                setFiles(deleteRecursive(files));
                setModal({ ...modal, isOpen: false });
                if (selectedId === itemId) setSelectedId(null);
        };

        const handleRenameConfirm = (itemId) => {
                if (!inputValue.trim()) return;
                const renameRecursive = (items) => items.map(item => {
                        if (item.id === itemId) return { ...item, name: inputValue };
                        if (item.children) return { ...item, children: renameRecursive(item.children) };
                        return item;
                });
                setFiles(renameRecursive(files));
                setModal({ ...modal, isOpen: false });
        };

        const handleDragStart = (e, item) => {
                e.stopPropagation();
                setDraggedItem(item);
                e.dataTransfer.setData("text/plain", item.id);
                e.dataTransfer.effectAllowed = "move";
        };

        const handleDragOver = (e, targetItem) => {
                e.preventDefault(); e.stopPropagation();
                if (draggedItem && draggedItem.id !== targetItem.id) e.dataTransfer.dropEffect = "move";
        };

        const handleDrop = (e, targetItem) => {
                e.preventDefault(); e.stopPropagation();
                const draggedId = e.dataTransfer.getData("text/plain");
                if (!draggedId || draggedId === targetItem.id) return;
                const itemToMove = findItemById(files, draggedId);
                if (!itemToMove) return;

                let destinationFolder = null;
                let destName = 'Root';
                const findParent = (items, childId) => {
                        for (const item of items) {
                                if (item.children && item.children.some(c => c.id === childId)) return item;
                                if (item.children) { const found = findParent(item.children, childId); if (found) return found; }
                        }
                        return null;
                };

                if (targetItem.type === 'folder') { destinationFolder = targetItem; destName = targetItem.name; }
                else { destinationFolder = findParent(files, targetItem.id); destName = destinationFolder ? destinationFolder.name : 'Root'; }

                const isDescendant = (parentId, childId) => {
                        const parent = findItemById(files, parentId);
                        if (!parent || !parent.children) return false;
                        const checkRecursive = (items) => {
                                for (const item of items) {
                                        if (item.id === childId) return true;
                                        if (item.children && checkRecursive(item.children)) return true;
                                }
                                return false;
                        };
                        return checkRecursive(parent.children);
                };

                if (itemToMove.type === 'folder' && destinationFolder) {
                        if (itemToMove.id === destinationFolder.id || isDescendant(itemToMove.id, destinationFolder.id)) {
                                alert("Cannot move folder into itself"); return;
                        }
                }

                setModal({
                        isOpen: true, type: 'confirm', title: 'Move Item',
                        message: `Move '${itemToMove.name}' to '${destName}'?`,
                        action: 'move', data: { draggedId, destinationFolder, itemToMove }
                });
                setDraggedItem(null);
        };

        const executeMove = (draggedId, destinationFolder, itemToMove) => {
                const removeRecursive = (items) => items.filter(item => item.id !== draggedId).map(item => {
                        if (item.children) return { ...item, children: removeRecursive(item.children) };
                        return item;
                });
                const newStructure = removeRecursive(files);

                if (destinationFolder) {
                        const addRecursive = (items) => items.map(item => {
                                if (item.id === destinationFolder.id) {
                                        return { ...item, isOpen: true, children: [...(item.children || []), itemToMove].sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1) };
                                }
                                if (item.children) return { ...item, children: addRecursive(item.children) };
                                return item;
                        });
                        setFiles(addRecursive(newStructure));
                } else {
                        setFiles([...newStructure, itemToMove]);
                }
        };

        const findItemById = (items, id) => {
                for (const item of items) {
                        if (item.id === id) return item;
                        if (item.children) { const found = findItemById(item.children, id); if (found) return found; }
                }
                return null;
        };

        const findParentFolder = (items, childId) => {
                for (const item of items) {
                        if (item.children && item.children.some(c => c.id === childId)) return item;
                        if (item.children) {
                                const found = findParentFolder(item.children, childId);
                                if (found) return found;
                        }
                }
                return null;
        };

        const handleToggle = (folderId) => {
                const toggleRecursive = (items) => items.map(item => {
                        if (item.id === folderId) return { ...item, isOpen: !item.isOpen };
                        if (item.children) return { ...item, children: toggleRecursive(item.children) };
                        return item;
                });
                setFiles(toggleRecursive(files));
        };

        const handleSelect = (item) => {
                setSelectedId(item.id);
                if (onFileSelect) onFileSelect(item);
        };

        const handleContextMenu = (e, item) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, item });
        };

        return (
                <div className="flex h-full bg-zinc-900/80 border-r border-indigo-500/20 backdrop-blur-sm" ref={wrapperRef} onClick={() => setContextMenu(null)}>
                        <div className="w-12 flex flex-col items-center py-3 bg-linear-to-b from-zinc-800 to-zinc-900 border-r border-indigo-500/20 justify-between z-10">
                                <div className="flex flex-col gap-6 w-full">
                                        <ActivityIcon icon={Files} isActive={activeTab === 'files'} onClick={() => setActiveTab('files')} />
                                        <ActivityIcon icon={Search} isActive={activeTab === 'search'} onClick={() => setActiveTab('search')} />
                                        <ActivityIcon icon={GitGraph} isActive={activeTab === 'git'} onClick={() => setActiveTab('git')} />
                                        <ActivityIcon icon={Users} isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} badge={3} />
                                </div>
                                <div className="mb-2"><ActivityIcon icon={Settings} /></div>
                        </div>

                        <div className={`${activeTab === 'files' ? 'block' : 'hidden'} w-60 flex flex-col bg-zinc-900/80 backdrop-blur-sm relative`}>
                                <div className="h-9 px-4 flex items-center text-xs font-bold text-zinc-400 tracking-wider">EXPLORER</div>

                                <div className="group px-2 py-1 flex items-center justify-between font-bold text-xs text-indigo-400 cursor-pointer bg-indigo-600/10 hover:bg-indigo-600/20 transition-colors border border-transparent hover:border-indigo-500/30">
                                        <div className="flex items-center"><ChevronDown className="w-3.5 h-3.5 mr-1" /> CODESYNC-PROJECT</div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); handleCreateClick('file'); }} className="p-1 hover:bg-indigo-600/20 rounded text-zinc-400 hover:text-indigo-300 border border-transparent hover:border-indigo-500/30 transition-all" title="New File"><FilePlus className="w-3.5 h-3.5" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleCreateClick('folder'); }} className="p-1 hover:bg-indigo-600/20 rounded text-zinc-400 hover:text-indigo-300 border border-transparent hover:border-indigo-500/30 transition-all" title="New Folder"><FolderPlus className="w-3.5 h-3.5" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleCollapseAll(); }} className="p-1 hover:bg-indigo-600/20 rounded text-zinc-400 hover:text-indigo-300 border border-transparent hover:border-indigo-500/30 transition-all" title="Collapse All"><MinusSquare className="w-3.5 h-3.5" /></button>
                                        </div>
                                </div>

                                <div className="flex-1 overflow-y-auto py-1 outline-none" tabIndex={0}>
                                        {files.map(item => (
                                                <FileTreeItem key={item.id} item={item} selectedId={selectedId} onSelect={handleSelect} onToggle={handleToggle} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onContextMenu={handleContextMenu} />
                                        ))}
                                </div>

                                {contextMenu && (
                                        <div className="fixed bg-zinc-900 border border-indigo-500/20 shadow-2xl rounded-lg py-1 z-50 w-48 text-sm text-zinc-300 flex flex-col backdrop-blur-sm" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
                                                {contextMenu.item.type === 'folder' && (
                                                        <>
                                                                <div className="px-3 py-1.5 hover:bg-[#094771] hover:text-white cursor-pointer flex items-center gap-2" onClick={() => handleCreateClick('file', contextMenu.item.id)}><FilePlus className="w-3.5 h-3.5" /> New File</div>
                                                                <div className="px-3 py-1.5 hover:bg-[#094771] hover:text-white cursor-pointer flex items-center gap-2 border-b border-[#454545]" onClick={() => handleCreateClick('folder', contextMenu.item.id)}><FolderPlus className="w-3.5 h-3.5" /> New Folder</div>
                                                        </>
                                                )}
                                                <div className="px-3 py-1.5 hover:bg-indigo-600/20 hover:text-indigo-300 cursor-pointer flex items-center gap-2 mt-1 transition-colors border border-transparent hover:border-indigo-500/20" onClick={() => handleRenameClick(contextMenu.item.id, contextMenu.item.name)}><Edit2 className="w-3.5 h-3.5" /> Rename <span className="ml-auto text-xs text-zinc-500">F2</span></div>
                                                <div className="px-3 py-1.5 hover:bg-red-600/20 hover:text-red-300 cursor-pointer flex items-center gap-2 text-red-400 transition-colors border border-transparent hover:border-red-500/20" onClick={() => handleDeleteClick(contextMenu.item.id)}><Trash2 className="w-3.5 h-3.5" /> Delete <span className="ml-auto text-xs opacity-50">Del</span></div>
                                        </div>
                                )}

                                <Modal isOpen={modal.isOpen} title={modal.title} message={modal.message} type={modal.type} inputValue={inputValue} onConfirm={handleModalConfirm} onCancel={() => setModal({ ...modal, isOpen: false })} setInputValue={setInputValue} />
                        </div>
                </div>
        );
};

const ActivityIcon = ({ icon: Icon, isActive, onClick, badge }) => (
        <div onClick={onClick} className={`relative group w-full flex justify-center py-2 cursor-pointer transition-all ${isActive ? 'border-l-2 border-indigo-500 bg-indigo-600/10' : 'border-l-2 border-transparent opacity-60 hover:opacity-100 hover:bg-indigo-600/5'}`}>
                <Icon className={`w-6 h-6 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} strokeWidth={1.5} />
                {badge && <span className="absolute top-1 right-2 w-3.5 h-3.5 flex items-center justify-center bg-indigo-600 text-[8px] font-bold text-white rounded-full shadow-lg shadow-indigo-500/50">{badge}</span>}
        </div>
);

export default Sidebar;