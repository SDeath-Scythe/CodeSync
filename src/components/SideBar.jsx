import React, { useState, useRef, useEffect } from 'react';
import { useFileSystem } from '../context/FileSystemContext';
import { getFileIconPath, getFolderIconPath } from '../utils/fileIcons';

// Icons using material-icon-theme with lazy loading
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

// Modal Component
const Modal = ({ isOpen, title, children, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1e1e2e] border border-[#313244] rounded-xl shadow-2xl min-w-[320px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#313244] bg-[#181825] rounded-t-xl">
          <span className="text-sm font-medium text-[#cdd6f4]">{title}</span>
          <button onClick={onClose} className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/>
            </svg>
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// File Tree Item Component
const FileTreeItem = ({ 
  item, 
  depth = 0, 
  onSelect, 
  onToggle, 
  selectedId, 
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggedItem,
  dropTarget,
  renamingId,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  renameError,
  readOnly = false
}) => {
  const isFolder = item.type === 'folder';
  const isSelected = selectedId === item.id;
  const isDragging = draggedItem?.id === item.id;
  const isDropTarget = dropTarget === item.id;
  const isRenaming = renamingId === item.id;
  
  const renameInputRef = useRef(null);
  
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      // Select filename without extension for files
      if (!isFolder) {
        const dotIndex = renameValue.lastIndexOf('.');
        if (dotIndex > 0) {
          renameInputRef.current.setSelectionRange(0, dotIndex);
        } else {
          renameInputRef.current.select();
        }
      } else {
        renameInputRef.current.select();
      }
    }
  }, [isRenaming, isFolder, renameValue]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (isRenaming) return;
    
    if (isFolder) {
      onToggle(item.id);
    }
    onSelect(item.id, item);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) onContextMenu(e, item);
  };

  const handleDragStart = (e) => {
    e.stopPropagation();
    if (onDragStart) onDragStart(e, item);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFolder && draggedItem?.id !== item.id && onDragOver) {
      onDragOver(e, item);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFolder && draggedItem?.id !== item.id && onDrop) {
      onDrop(e, item);
    }
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onRenameSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onRenameCancel();
    }
  };

  return (
    <div className={isDragging ? 'opacity-50' : ''}>
      <div
        className={`
          flex items-center gap-1.5 px-2 py-[3px] cursor-pointer select-none
          hover:bg-[#313244] transition-all duration-150
          ${isSelected ? 'bg-[#45475a] text-[#cdd6f4]' : 'text-[#a6adc8]'}
          ${isDropTarget ? 'bg-[#89b4fa]/20 border border-[#89b4fa]/50' : 'border border-transparent'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={readOnly ? undefined : handleContextMenu}
        draggable={!readOnly && !isRenaming}
        onDragStart={readOnly ? undefined : handleDragStart}
        onDragOver={readOnly ? undefined : handleDragOver}
        onDrop={readOnly ? undefined : handleDrop}
        onDragEnd={readOnly ? undefined : onDragEnd}
      >
        {isFolder && <ChevronIcon isOpen={item.isOpen} />}
        {!isFolder && <span className="w-4" />}
        
        {isFolder ? <FolderIcon isOpen={item.isOpen} name={item.name} /> : <FileIcon name={item.name} />}
        
        {isRenaming ? (
          <div className="flex-1 flex flex-col">
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={onRenameSubmit}
              className={`w-full bg-[#313244] text-[#cdd6f4] text-sm px-1.5 py-0.5 outline-none rounded ${renameError ? 'border border-[#f38ba8]' : 'border border-[#89b4fa]'}`}
              onClick={(e) => e.stopPropagation()}
            />
            {renameError && (
              <span className="text-[#f38ba8] text-[10px] mt-0.5">{renameError}</span>
            )}
          </div>
        ) : (
          <span className="text-sm truncate">{item.name}</span>
        )}
      </div>
      
      {isFolder && item.isOpen && item.children && (
        <div>
          {item.children.map(child => (
            <FileTreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              onSelect={onSelect}
              onToggle={onToggle}
              selectedId={selectedId}
              onContextMenu={onContextMenu}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              draggedItem={draggedItem}
              dropTarget={dropTarget}
              renamingId={renamingId}
              renameValue={renameValue}
              onRenameChange={onRenameChange}
              onRenameSubmit={onRenameSubmit}
              onRenameCancel={onRenameCancel}
              renameError={renameError}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SideBar = ({ onClose, readOnly = false }) => {
  const {
    fileStructure,
    createItem,
    deleteItem,
    renameItem,
    moveItem,
    toggleFolder,
    collapseAll,
    openFile,
    findItemById
  } = useFileSystem();

  const [selectedId, setSelectedId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [createModal, setCreateModal] = useState({ isOpen: false, type: null, parentId: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [moveConfirmModal, setMoveConfirmModal] = useState({ isOpen: false, item: null, target: null });
  const [newItemName, setNewItemName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [createError, setCreateError] = useState('');
  const [renameError, setRenameError] = useState('');
  const [moveError, setMoveError] = useState('');
  
  const sidebarRef = useRef(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenu && !e.target.closest('.context-menu')) {
        setContextMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2' && selectedId && !renamingId) {
        e.preventDefault();
        startRename(selectedId);
      } else if (e.key === 'Delete' && selectedId && !renamingId) {
        e.preventDefault();
        const item = findItemById(fileStructure, selectedId);
        if (item) {
          setDeleteModal({ isOpen: true, item });
        }
      } else if (e.key === 'Escape' && renamingId) {
        setRenamingId(null);
        setRenameValue('');
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, renamingId, fileStructure, findItemById]);

  const handleSelect = (id, item) => {
    setSelectedId(id);
    if (item.type === 'file') {
      openFile(id);
    }
  };

  const handleToggle = (id) => {
    toggleFolder(id);
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setSelectedId(item.id);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const startRename = (id) => {
    const item = findItemById(fileStructure, id);
    if (item) {
      setRenamingId(id);
      setRenameValue(item.name);
      setRenameError('');
      setContextMenu(null);
    }
  };

  const handleRenameSubmit = () => {
    if (renamingId && renameValue.trim()) {
      const result = renameItem(renamingId, renameValue.trim());
      if (result?.error) {
        setRenameError(result.error);
        return; // Don't close the rename input
      }
    }
    setRenamingId(null);
    setRenameValue('');
    setRenameError('');
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
    setRenameValue('');
    setRenameError('');
  };

  const handleCreate = (type, parentId = null) => {
    setCreateModal({ isOpen: true, type, parentId });
    setNewItemName(type === 'folder' ? 'New Folder' : 'newFile.js');
    setCreateError('');
    setContextMenu(null);
  };

  const handleCreateConfirm = () => {
    if (newItemName.trim()) {
      const result = createItem(createModal.type, newItemName.trim(), createModal.parentId);
      if (result?.error) {
        setCreateError(result.error);
        return; // Don't close the modal
      }
      if (createModal.type === 'file' && result.id) {
        openFile(result.id);
      }
    }
    setCreateModal({ isOpen: false, type: null, parentId: null });
    setNewItemName('');
    setCreateError('');
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.item) {
      deleteItem(deleteModal.item.id);
      if (selectedId === deleteModal.item.id) {
        setSelectedId(null);
      }
    }
    setDeleteModal({ isOpen: false, item: null });
  };

  // Drag and Drop handlers
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e, targetItem) => {
    if (draggedItem && targetItem.type === 'folder' && draggedItem.id !== targetItem.id) {
      setDropTarget(targetItem.id);
    }
  };

  const handleDrop = (e, targetItem) => {
    if (draggedItem && targetItem.type === 'folder' && draggedItem.id !== targetItem.id) {
      // Check if it's already a child of the target
      const isAlreadyChild = targetItem.children?.some(c => c.id === draggedItem.id);
      if (!isAlreadyChild) {
        setMoveConfirmModal({ isOpen: true, item: draggedItem, target: targetItem });
      }
    }
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleMoveConfirm = () => {
    if (moveConfirmModal.item && moveConfirmModal.target) {
      const result = moveItem(moveConfirmModal.item.id, moveConfirmModal.target.id);
      if (result?.error) {
        setMoveError(result.error);
        return; // Don't close the modal
      }
    }
    setMoveConfirmModal({ isOpen: false, item: null, target: null });
    setMoveError('');
    setDraggedItem(null);
  };

  // Drop on sidebar (root level)
  const handleSidebarDragOver = (e) => {
    e.preventDefault();
    if (draggedItem) {
      setDropTarget('root');
    }
  };

  const handleSidebarDrop = (e) => {
    e.preventDefault();
    if (draggedItem) {
      // Check if already at root
      const isAtRoot = fileStructure.some(item => item.id === draggedItem.id);
      if (!isAtRoot) {
        moveItem(draggedItem.id, null); // null means root level
      }
    }
    setDraggedItem(null);
    setDropTarget(null);
  };

  // Get parent ID for creating items
  const getParentForCreate = () => {
    if (!selectedId) return null;
    const selectedItem = findItemById(fileStructure, selectedId);
    if (selectedItem?.type === 'folder') return selectedId;
    return null;
  };

  return (
    <div 
      ref={sidebarRef}
      className={`w-full bg-gradient-to-b from-[#1e1e2e] to-[#181825] border-r flex flex-col h-full overflow-hidden ${readOnly ? 'border-indigo-500/20' : 'border-[#313244]'}`}
      onDragOver={readOnly ? undefined : handleSidebarDragOver}
      onDrop={readOnly ? undefined : handleSidebarDrop}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b bg-[#181825]/50 ${readOnly ? 'border-indigo-500/20' : 'border-[#313244]'}`}>
        <span className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${readOnly ? 'text-indigo-400' : 'text-[#89b4fa]'}`}>
          {readOnly && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
          {readOnly ? "Teacher's Files" : 'Explorer'}
        </span>
        <div className="flex items-center gap-1">
          {!readOnly && (
            <>
              <button
                onClick={() => handleCreate('file', getParentForCreate())}
                className="p-1.5 hover:bg-[#313244] rounded-md text-[#6c7086] hover:text-[#cdd6f4] transition-all duration-150"
                title="New File"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M9.5 1.1l3.4 3.4.1.5v9.5l-.5.5h-9l-.5-.5v-13l.5-.5h6l.5.1zM9 2H4v12h8V6H9.5L9 5.5V2zm1 0v3h3l-3-3z"/>
                  <path d="M8 7v2H6v1h2v2h1V10h2V9H9V7z"/>
                </svg>
              </button>
              <button
                onClick={() => handleCreate('folder', getParentForCreate())}
                className="p-1.5 hover:bg-[#313244] rounded-md text-[#6c7086] hover:text-[#cdd6f4] transition-all duration-150"
                title="New Folder"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M14.5 3H7.71l-1-1H1.5l-.5.5v11l.5.5h13l.5-.5v-10l-.5-.5zm-.51 8.49V13H2V5h12v6.49z"/>
                  <path d="M8 6v2H6v1h2v2h1V9h2V8H9V6z"/>
                </svg>
              </button>
            </>
          )}
          <button
            onClick={collapseAll}
            className="p-1.5 hover:bg-[#313244] rounded-md text-[#6c7086] hover:text-[#cdd6f4] transition-all duration-150"
            title="Collapse All"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9 9H4v1h5V9z"/>
              <path d="M14.5 3H7.71l-1-1H1.5l-.5.5v11l.5.5h13l.5-.5v-10l-.5-.5zm-.51 8.49V13H2V5h12v6.49z"/>
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-red-500/20 rounded-md text-[#6c7086] hover:text-red-400 transition-all duration-150"
              title="Close Explorer"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* File Tree */}
      <div className={`flex-1 overflow-auto py-1 scrollbar-thin scrollbar-thumb-[#313244] scrollbar-track-transparent ${dropTarget === 'root' ? 'bg-[#89b4fa]/10' : ''}`}>
        {fileStructure.map(item => (
          <FileTreeItem
            key={item.id}
            item={item}
            depth={0}
            onSelect={handleSelect}
            onToggle={handleToggle}
            selectedId={selectedId}
            onContextMenu={readOnly ? undefined : handleContextMenu}
            onDragStart={readOnly ? undefined : handleDragStart}
            onDragOver={readOnly ? undefined : handleDragOver}
            onDrop={readOnly ? undefined : handleDrop}
            onDragEnd={readOnly ? undefined : handleDragEnd}
            draggedItem={readOnly ? null : draggedItem}
            dropTarget={readOnly ? null : dropTarget}
            renamingId={readOnly ? null : renamingId}
            renameValue={renameValue}
            onRenameChange={(value) => { setRenameValue(value); setRenameError(''); }}
            onRenameSubmit={handleRenameSubmit}
            onRenameCancel={handleRenameCancel}
            renameError={renameError}
            readOnly={readOnly}
          />
        ))}
        
        {fileStructure.length === 0 && (
          <div className="px-4 py-8 text-center text-[#6c7086] text-sm">
            <p>No files yet</p>
            <p className="mt-2 text-xs text-[#585b70]">Right-click to create a file or folder</p>
          </div>
        )}
      </div>

      {/* Context Menu - Only show in non-readOnly mode */}
      {contextMenu && !readOnly && (
        <div
          className="context-menu fixed bg-[#1e1e2e] border border-[#313244] rounded-lg shadow-2xl py-1.5 z-50 min-w-[180px] backdrop-blur-sm"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.item.type === 'folder' && (
            <>
              <button
                onClick={() => handleCreate('file', contextMenu.item.id)}
                className="w-full px-3 py-1.5 text-left text-sm text-[#cdd6f4] hover:bg-[#45475a] flex items-center gap-2 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M9.5 1.1l3.4 3.4.1.5v9.5l-.5.5h-9l-.5-.5v-13l.5-.5h6l.5.1zM9 2H4v12h8V6H9.5L9 5.5V2z"/>
                </svg>
                New File
              </button>
              <button
                onClick={() => handleCreate('folder', contextMenu.item.id)}
                className="w-full px-3 py-1.5 text-left text-sm text-[#cdd6f4] hover:bg-[#45475a] flex items-center gap-2 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M14.5 3H7.71l-1-1H1.5l-.5.5v11l.5.5h13l.5-.5v-10l-.5-.5z"/>
                </svg>
                New Folder
              </button>
              <div className="border-t border-[#313244] my-1 mx-2" />
            </>
          )}
          
          <button
            onClick={() => startRename(contextMenu.item.id)}
            className="w-full px-3 py-1.5 text-left text-sm text-[#cdd6f4] hover:bg-[#45475a] flex items-center gap-2 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM2.41 13.59l1.51-3 1.45 1.45-2.96 1.55zm3.83-2.06L4.47 9.76l8-8 1.77 1.77-8 8z"/>
            </svg>
            Rename
            <span className="ml-auto text-xs text-[#585b70]">F2</span>
          </button>
          
          <button
            onClick={() => {
              setDeleteModal({ isOpen: true, item: contextMenu.item });
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-[#f38ba8] hover:bg-[#f38ba8]/20 flex items-center gap-2 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10 3h3v1h-1v9l-1 1H4l-1-1V4H2V3h3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zM9 2H6v1h3V2zM4 13h7V4H4v9zm2-8H5v7h1V5zm1 0h1v7H7V5zm2 0h1v7H9V5z"/>
            </svg>
            Delete
            <span className="ml-auto text-xs text-[#585b70]">Del</span>
          </button>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createModal.isOpen}
        title={`Create New ${createModal.type === 'folder' ? 'Folder' : 'File'}`}
        onClose={() => { setCreateModal({ isOpen: false, type: null, parentId: null }); setCreateError(''); }}
      >
        <input
          type="text"
          value={newItemName}
          onChange={(e) => { setNewItemName(e.target.value); setCreateError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateConfirm()}
          placeholder={createModal.type === 'folder' ? 'Folder name' : 'File name'}
          className={`w-full bg-[#313244] text-[#cdd6f4] text-sm px-3 py-2 border outline-none rounded-lg ${createError ? 'border-[#f38ba8]' : 'border-[#45475a] focus:border-[#89b4fa]'} transition-colors`}
          autoFocus
        />
        {createError && (
          <p className="text-[#f38ba8] text-xs mt-2">{createError}</p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => { setCreateModal({ isOpen: false, type: null, parentId: null }); setCreateError(''); }}
            className="px-4 py-1.5 text-sm text-[#a6adc8] hover:text-[#cdd6f4] hover:bg-[#313244] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateConfirm}
            className="px-4 py-1.5 text-sm bg-[#89b4fa] text-[#1e1e2e] font-medium rounded-lg hover:bg-[#b4befe] transition-colors"
          >
            Create
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        title="Confirm Delete"
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
      >
        <p className="text-sm text-[#a6adc8]">
          Are you sure you want to delete "{deleteModal.item?.name}"?
          {deleteModal.item?.type === 'folder' && ' This will also delete all contents inside.'}
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setDeleteModal({ isOpen: false, item: null })}
            className="px-4 py-1.5 text-sm text-[#a6adc8] hover:text-[#cdd6f4] hover:bg-[#313244] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteConfirm}
            className="px-4 py-1.5 text-sm bg-[#f38ba8] text-[#1e1e2e] font-medium rounded-lg hover:bg-[#eba0ac] transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>

      {/* Move Confirmation Modal */}
      <Modal
        isOpen={moveConfirmModal.isOpen}
        title="Move Item"
        onClose={() => { setMoveConfirmModal({ isOpen: false, item: null, target: null }); setMoveError(''); }}
      >
        <p className="text-sm text-[#a6adc8]">
          Move "{moveConfirmModal.item?.name}" into "{moveConfirmModal.target?.name}"?
        </p>
        {moveError && (
          <p className="text-[#f38ba8] text-xs mt-2">{moveError}</p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => { setMoveConfirmModal({ isOpen: false, item: null, target: null }); setMoveError(''); }}
            className="px-4 py-1.5 text-sm text-[#a6adc8] hover:text-[#cdd6f4] hover:bg-[#313244] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleMoveConfirm}
            className="px-4 py-1.5 text-sm bg-[#89b4fa] text-[#1e1e2e] font-medium rounded-lg hover:bg-[#b4befe] transition-colors"
          >
            Move
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default SideBar;
