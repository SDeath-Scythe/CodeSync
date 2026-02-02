import React, { useState, useRef, useEffect } from 'react';
import { useLocalFileSystem } from '../context/LocalFileSystemContext';
import { getFileIconPath, getFolderIconPath } from '../utils/fileIcons';

// Icons
const FolderIcon = ({ isOpen, name }) => (
  <img 
    src={getFolderIconPath(name, isOpen)} 
    alt="" 
    width="16" 
    height="16" 
    loading="lazy"
    decoding="async"
    className="flex-shrink-0"
  />
);

const FileIcon = ({ name }) => (
  <img 
    src={getFileIconPath(name)} 
    alt="" 
    width="16" 
    height="16" 
    loading="lazy"
    decoding="async"
    className="flex-shrink-0"
  />
);

const ChevronIcon = ({ isOpen }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={`text-[#6c7086] transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>
    <path d="M6 4l4 4-4 4V4z"/>
  </svg>
);

// File Tree Item Component
const FileTreeItem = ({ 
  item, 
  depth = 0, 
  onSelect, 
  onToggle, 
  selectedId,
  expandedFolders 
}) => {
  const isFolder = item.type === 'folder';
  const isSelected = selectedId === item.id;
  const isOpen = expandedFolders.has(item.id);

  const handleClick = (e) => {
    e.stopPropagation();
    if (isFolder) {
      onToggle(item.id);
    }
    onSelect(item.id, item);
  };

  return (
    <div>
      <div
        className={`
          group flex items-center h-[22px] cursor-pointer select-none
          hover:bg-[#2a2d3e] transition-colors duration-75
          ${isSelected ? 'bg-[#363a4f] text-[#cdd6f4]' : 'text-[#bac2de]'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand Icon for folders */}
        <span className="w-4 flex-shrink-0 flex items-center justify-center">
          {isFolder && <ChevronIcon isOpen={isOpen} />}
        </span>
        
        {/* File/Folder Icon */}
        <span className="mr-1.5">
          {isFolder ? (
            <FolderIcon isOpen={isOpen} name={item.name} />
          ) : (
            <FileIcon name={item.name} />
          )}
        </span>
        
        {/* Name */}
        <span className="truncate text-[13px]">{item.name}</span>
      </div>
      
      {/* Children */}
      {isFolder && isOpen && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              onSelect={onSelect}
              onToggle={onToggle}
              selectedId={selectedId}
              expandedFolders={expandedFolders}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * LocalSideBar Component
 * A simplified sidebar for student's local practice files
 */
const LocalSideBar = ({ onClose }) => {
  const {
    fileStructure,
    openFile,
    activeFileId,
    createFile,
    createFolder,
    deleteItem,
    renameItem
  } = useLocalFileSystem();

  const [expandedFolders, setExpandedFolders] = useState(new Set(['local-root']));
  const [selectedId, setSelectedId] = useState(null);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemParent, setNewItemParent] = useState('local-root');
  const inputRef = useRef(null);

  useEffect(() => {
    if ((showNewFileInput || showNewFolderInput) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNewFileInput, showNewFolderInput]);

  const handleToggle = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleSelect = (id, item) => {
    setSelectedId(id);
    if (item.type === 'file') {
      openFile(id);
    } else {
      setNewItemParent(id);
    }
  };

  const handleNewFile = () => {
    setShowNewFileInput(true);
    setShowNewFolderInput(false);
    setNewItemName('');
  };

  const handleNewFolder = () => {
    setShowNewFolderInput(true);
    setShowNewFileInput(false);
    setNewItemName('');
  };

  const handleCreateSubmit = () => {
    if (!newItemName.trim()) return;
    
    if (showNewFileInput) {
      const id = createFile(newItemParent, newItemName);
      openFile(id);
    } else if (showNewFolderInput) {
      createFolder(newItemParent, newItemName);
      setExpandedFolders(prev => new Set([...prev, newItemParent]));
    }
    
    setShowNewFileInput(false);
    setShowNewFolderInput(false);
    setNewItemName('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCreateSubmit();
    } else if (e.key === 'Escape') {
      setShowNewFileInput(false);
      setShowNewFolderInput(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#181825] border-r border-green-500/20">
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 bg-[#1e1e2e] border-b border-green-500/20 shrink-0">
        <span className="text-[11px] font-semibold text-green-400 uppercase tracking-wider flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          My Practice Files
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewFile}
            className="p-1 hover:bg-green-500/20 rounded text-zinc-400 hover:text-green-400 transition-colors"
            title="New File"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5l-4-4zm3 13H4V2h4v4h4v8z"/>
              <path d="M9 6V2l4 4H9z"/>
            </svg>
          </button>
          <button
            onClick={handleNewFolder}
            className="p-1 hover:bg-green-500/20 rounded text-zinc-400 hover:text-green-400 transition-colors"
            title="New Folder"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14.5 3H7.71l-1-1H1.5l-.5.5v11l.5.5h13l.5-.5v-10l-.5-.5zm-.51 8.49V13H2V5h12v6.49z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* New Item Input */}
      {(showNewFileInput || showNewFolderInput) && (
        <div className="px-3 py-2 bg-green-500/10 border-b border-green-500/20">
          <input
            ref={inputRef}
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              setShowNewFileInput(false);
              setShowNewFolderInput(false);
            }}
            placeholder={showNewFileInput ? 'filename.js' : 'folder name'}
            className="w-full px-2 py-1 text-xs bg-zinc-900 border border-green-500/30 rounded text-white focus:outline-none focus:border-green-500"
          />
        </div>
      )}

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-1 custom-scrollbar">
        {fileStructure.map((item) => (
          <FileTreeItem
            key={item.id}
            item={item}
            depth={0}
            onSelect={handleSelect}
            onToggle={handleToggle}
            selectedId={selectedId}
            expandedFolders={expandedFolders}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 text-[10px] text-zinc-500 bg-[#1e1e2e] border-t border-green-500/20">
        💡 Your files are saved locally
      </div>
    </div>
  );
};

export default LocalSideBar;
