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
    <path d="M6 4l4 4-4 4V4z" />
  </svg>
);

// Modal Component
const Modal = ({ isOpen, title, children, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1e1e2e] border border-green-500/30 rounded-xl shadow-2xl min-w-[320px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-green-500/20 bg-[#181825] rounded-t-xl">
          <span className="text-sm font-medium text-green-400">{title}</span>
          <button onClick={onClose} className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" />
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
  renameError
}) => {
  const isFolder = item.type === 'folder';
  const isSelected = selectedId === item.id;
  const isOpen = item.isOpen;
  const isRenaming = renamingId === item.id;
  const isDragging = draggedItem?.id === item.id;
  const isDropTarget = dropTarget === item.id;
  const renameInputRef = useRef(null);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (isFolder) {
      onToggle(item.id);
    }
    onSelect(item.id, item);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, item);
  };

  const handleDragStart = (e) => {
    onDragStart?.(e, item);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver?.(e, item);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop?.(e, item);
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      onRenameSubmit?.();
    } else if (e.key === 'Escape') {
      onRenameCancel?.();
    }
  };

  return (
    <div>
      <div
        className={`
          group flex items-center h-[22px] cursor-pointer select-none
          hover:bg-green-500/10 transition-colors duration-75
          ${isSelected ? 'bg-green-500/20 text-green-300' : 'text-[#bac2de]'}
          ${isDragging ? 'opacity-50' : ''}
          ${isDropTarget ? 'bg-green-500/30 ring-1 ring-green-400' : ''}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable={!isRenaming}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={onDragEnd}
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

        {/* Name or Rename Input */}
        {isRenaming ? (
          <div className="flex-1 flex flex-col">
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => onRenameChange?.(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={onRenameSubmit}
              className={`w-full text-[13px] px-1 py-0.5 bg-[#1e1e2e] border rounded outline-none ${renameError ? 'border-red-500' : 'border-green-500'
                }`}
              onClick={(e) => e.stopPropagation()}
            />
            {renameError && (
              <span className="text-[10px] text-red-400 mt-0.5">{renameError}</span>
            )}
          </div>
        ) : (
          <span className="truncate text-[13px]">{item.name}</span>
        )}
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * LocalSideBar Component - VS Code-like file explorer for student's workspace
 */
const LocalSideBar = ({ onClose }) => {
  const {
    fileStructure,
    openFile,
    activeFileId,
    createFile,
    createFolder,
    deleteItem,
    renameItem,
    moveItem,
    toggleFolder,
    collapseAll,
    findItemById
  } = useLocalFileSystem();

  const [selectedId, setSelectedId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [createModal, setCreateModal] = useState({ isOpen: false, type: null, parentId: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  const [newItemName, setNewItemName] = useState('');
  const [createError, setCreateError] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [moveConfirmModal, setMoveConfirmModal] = useState({ isOpen: false, item: null, target: null });

  const sidebarRef = useRef(null);

  // Close context menu on click outside
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
        return;
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
    if (!newItemName.trim()) {
      setCreateError('Name cannot be empty');
      return;
    }

    const parentId = createModal.parentId || 'local-root';

    if (createModal.type === 'file') {
      const id = createFile(parentId, newItemName.trim());
      if (id) {
        openFile(id);
      }
    } else {
      createFolder(parentId, newItemName.trim());
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
    if (draggedItem && targetItem.type === 'folder' && targetItem.id !== draggedItem.id) {
      setDropTarget(targetItem.id);
    }
  };

  const handleDrop = (e, targetItem) => {
    if (draggedItem && targetItem.type === 'folder' && targetItem.id !== draggedItem.id) {
      setMoveConfirmModal({ isOpen: true, item: draggedItem, target: targetItem });
    }
    setDraggedItem(null);
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
        console.error('Move failed:', result.error);
      }
    }
    setMoveConfirmModal({ isOpen: false, item: null, target: null });
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
      moveItem(draggedItem.id, null);
    }
    setDraggedItem(null);
    setDropTarget(null);
  };

  // Get parent ID for creating items
  const getParentForCreate = () => {
    if (selectedId) {
      const item = findItemById(fileStructure, selectedId);
      return item?.type === 'folder' ? selectedId : null;
    }
    return null;
  };

  return (
    <div
      ref={sidebarRef}
      className="h-full flex flex-col bg-[#181825] border-r border-green-500/20"
      onDragOver={handleSidebarDragOver}
      onDrop={handleSidebarDrop}
    >
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 bg-[#1e1e2e] border-b border-green-500/20 shrink-0">
        <span className="text-[11px] font-semibold text-green-400 uppercase tracking-wider flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          My Practice Files
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleCreate('file', getParentForCreate())}
            className="p-1 hover:bg-green-500/20 rounded text-zinc-400 hover:text-green-400 transition-colors"
            title="New File"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.5 1.1l3.4 3.4.1.5v9.5l-.5.5h-9l-.5-.5v-13l.5-.5h6l.5.1zM9 2H4v12h8V6H9.5L9 5.5V2z" />
              <path d="M8 7v2H6v1h2v2h1V10h2V9H9V7z" />
            </svg>
          </button>
          <button
            onClick={() => handleCreate('folder', getParentForCreate())}
            className="p-1 hover:bg-green-500/20 rounded text-zinc-400 hover:text-green-400 transition-colors"
            title="New Folder"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14.5 3H7.71l-1-1H1.5l-.5.5v11l.5.5h13l.5-.5v-10l-.5-.5zm-.51 8.49V13H2V5h12v6.49z" />
              <path d="M8 6v2H6v1h2v2h1V9h2V8H9V6z" />
            </svg>
          </button>
          <button
            onClick={collapseAll}
            className="p-1 hover:bg-green-500/20 rounded text-zinc-400 hover:text-green-400 transition-colors"
            title="Collapse All"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9 9H4v1h5V9z" />
              <path d="M14.5 3H7.71l-1-1H1.5l-.5.5v11l.5.5h13l.5-.5v-10l-.5-.5zm-.51 8.49V13H2V5h12v6.49z" />
            </svg>
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className={`flex-1 overflow-y-auto py-1 custom-scrollbar ${dropTarget === 'root' ? 'bg-green-500/10' : ''}`}>
        {fileStructure.map((item) => (
          <FileTreeItem
            key={item.id}
            item={item}
            depth={0}
            onSelect={handleSelect}
            onToggle={handleToggle}
            selectedId={selectedId}
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            draggedItem={draggedItem}
            dropTarget={dropTarget}
            renamingId={renamingId}
            renameValue={renameValue}
            onRenameChange={setRenameValue}
            onRenameSubmit={handleRenameSubmit}
            onRenameCancel={handleRenameCancel}
            renameError={renameError}
          />
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu fixed bg-[#1e1e2e] border border-green-500/30 rounded-lg shadow-2xl py-1.5 z-50 min-w-[180px] backdrop-blur-sm"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.item.type === 'folder' && (
            <>
              <button
                onClick={() => handleCreate('file', contextMenu.item.id)}
                className="w-full px-3 py-1.5 text-left text-sm text-[#cdd6f4] hover:bg-green-500/20 flex items-center gap-2 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M9.5 1.1l3.4 3.4.1.5v9.5l-.5.5h-9l-.5-.5v-13l.5-.5h6l.5.1zM9 2H4v12h8V6H9.5L9 5.5V2z" />
                </svg>
                New File
              </button>
              <button
                onClick={() => handleCreate('folder', contextMenu.item.id)}
                className="w-full px-3 py-1.5 text-left text-sm text-[#cdd6f4] hover:bg-green-500/20 flex items-center gap-2 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M14.5 3H7.71l-1-1H1.5l-.5.5v11l.5.5h13l.5-.5v-10l-.5-.5z" />
                </svg>
                New Folder
              </button>
              <div className="border-t border-green-500/20 my-1 mx-2" />
            </>
          )}

          <button
            onClick={() => startRename(contextMenu.item.id)}
            className="w-full px-3 py-1.5 text-left text-sm text-[#cdd6f4] hover:bg-green-500/20 flex items-center gap-2 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM2.41 13.59l1.51-3 1.45 1.45-2.96 1.55zm3.83-2.06L4.47 9.76l8-8 1.77 1.77-8 8z" />
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
              <path d="M10 3h3v1h-1v9l-1 1H4l-1-1V4H2V3h3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zM9 2H6v1h3V2zM4 13h7V4H4v9zm2-8H5v7h1V5zm1 0h1v7H7V5zm2 0h1v7H9V5z" />
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
          className={`w-full bg-[#313244] text-[#cdd6f4] text-sm px-3 py-2 border outline-none rounded-lg ${createError ? 'border-[#f38ba8]' : 'border-green-500/30 focus:border-green-500'} transition-colors`}
          autoFocus
        />
        {createError && (
          <p className="text-[#f38ba8] text-xs mt-2 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 13A6 6 0 1 1 8 2a6 6 0 0 1 0 12zm-.5-3h1v1h-1v-1zm0-6h1v5h-1V5z" />
            </svg>
            {createError}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => { setCreateModal({ isOpen: false, type: null, parentId: null }); setCreateError(''); }}
            className="px-3 py-1.5 text-sm text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateConfirm}
            className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
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
        <p className="text-[#cdd6f4] text-sm mb-4">
          Are you sure you want to delete <strong className="text-green-400">"{deleteModal.item?.name}"</strong>?
          {deleteModal.item?.type === 'folder' && (
            <span className="block text-[#f38ba8] text-xs mt-2">
              ⚠️ This will also delete all files and folders inside it.
            </span>
          )}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setDeleteModal({ isOpen: false, item: null })}
            className="px-3 py-1.5 text-sm text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteConfirm}
            className="px-3 py-1.5 text-sm bg-[#f38ba8] hover:bg-[#f38ba8]/80 text-white rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>

      {/* Move Confirmation Modal */}
      <Modal
        isOpen={moveConfirmModal.isOpen}
        title="Move Item"
        onClose={() => setMoveConfirmModal({ isOpen: false, item: null, target: null })}
      >
        <p className="text-[#cdd6f4] text-sm mb-4">
          Move <strong className="text-green-400">"{moveConfirmModal.item?.name}"</strong> to{' '}
          <strong className="text-green-400">"{moveConfirmModal.target?.name}"</strong>?
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setMoveConfirmModal({ isOpen: false, item: null, target: null })}
            className="px-3 py-1.5 text-sm text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleMoveConfirm}
            className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            Move
          </button>
        </div>
      </Modal>

      {/* Footer */}
      <div className="px-3 py-2 text-[10px] text-zinc-500 bg-[#1e1e2e] border-t border-green-500/20">
        💡 Press Ctrl+S to save • Right-click for options
      </div>
    </div>
  );
};

export default LocalSideBar;
