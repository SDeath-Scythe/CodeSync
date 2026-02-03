import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * LocalFileSystemContext
 * A separate file system for students to practice coding independently.
 * This is completely isolated from the teacher's synced files.
 */
const LocalFileSystemContext = createContext(null);

export const useLocalFileSystem = () => {
  const context = useContext(LocalFileSystemContext);
  if (!context) {
    throw new Error('useLocalFileSystem must be used within a LocalFileSystemProvider');
  }
  return context;
};

// Default starter files for student practice
const defaultFileStructure = [
  {
    id: 'local-root',
    name: 'My Practice',
    type: 'folder',
    children: [
      {
        id: 'local-1',
        name: 'practice.js',
        type: 'file',
      },
      {
        id: 'local-2',
        name: 'notes.txt',
        type: 'file',
      },
      {
        id: 'local-3',
        name: 'examples',
        type: 'folder',
        children: [
          {
            id: 'local-4',
            name: 'example1.js',
            type: 'file',
          }
        ]
      }
    ]
  }
];

const defaultFileContents = {
  'local-1': `// Your practice file - experiment here!
// This is your own workspace, separate from the teacher's code.

function hello() {
  console.log("Hello, World!");
}

hello();
`,
  'local-2': `Notes:
- Watch the teacher's code in "Teacher's View" tab
- Practice here in "My Practice" tab
- Your changes won't affect the teacher's code
`,
  'local-4': `// Example code
const greeting = "Hello from examples!";
console.log(greeting);
`
};

export const LocalFileSystemProvider = ({ children }) => {
  const [fileStructure, setFileStructure] = useState(defaultFileStructure);
  const [fileContents, setFileContents] = useState(defaultFileContents);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);

  // Find item by ID in the tree
  const findItemById = useCallback((items, id) => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItemById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Get file content
  const getFileContent = useCallback((fileId) => {
    return fileContents[fileId] || '';
  }, [fileContents]);

  // Update file content
  const updateFileContent = useCallback((fileId, content) => {
    setFileContents(prev => ({
      ...prev,
      [fileId]: content
    }));
  }, []);

  // Open a file
  const openFile = useCallback((fileId) => {
    const file = findItemById(fileStructure, fileId);
    if (file && file.type === 'file') {
      if (!openFiles.find(f => f.id === fileId)) {
        setOpenFiles(prev => [...prev, { id: fileId, name: file.name }]);
      }
      setActiveFileId(fileId);
    }
  }, [fileStructure, openFiles, findItemById]);

  // Close a file
  const closeFile = useCallback((fileId) => {
    setOpenFiles(prev => prev.filter(f => f.id !== fileId));
    if (activeFileId === fileId) {
      const remaining = openFiles.filter(f => f.id !== fileId);
      setActiveFileId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  }, [activeFileId, openFiles]);

  // Create a new file
  const createFile = useCallback((parentId, fileName) => {
    const newId = `local-${Date.now()}`;

    const addToParent = (items) => {
      return items.map(item => {
        if (item.id === parentId && item.type === 'folder') {
          return {
            ...item,
            children: [...(item.children || []), { id: newId, name: fileName, type: 'file' }]
          };
        }
        if (item.children) {
          return { ...item, children: addToParent(item.children) };
        }
        return item;
      });
    };

    setFileStructure(prev => addToParent(prev));
    setFileContents(prev => ({ ...prev, [newId]: '' }));
    return newId;
  }, []);

  // Create a new folder
  const createFolder = useCallback((parentId, folderName) => {
    const newId = `local-folder-${Date.now()}`;

    const addToParent = (items) => {
      return items.map(item => {
        if (item.id === parentId && item.type === 'folder') {
          return {
            ...item,
            children: [...(item.children || []), { id: newId, name: folderName, type: 'folder', children: [] }]
          };
        }
        if (item.children) {
          return { ...item, children: addToParent(item.children) };
        }
        return item;
      });
    };

    setFileStructure(prev => addToParent(prev));
    return newId;
  }, []);

  // Delete a file or folder
  const deleteItem = useCallback((itemId) => {
    const removeFromTree = (items) => {
      return items.filter(item => {
        if (item.id === itemId) return false;
        if (item.children) {
          item.children = removeFromTree(item.children);
        }
        return true;
      });
    };

    setFileStructure(prev => removeFromTree(prev));
    setOpenFiles(prev => prev.filter(f => f.id !== itemId));
    if (activeFileId === itemId) {
      setActiveFileId(null);
    }
  }, [activeFileId]);

  // Get file path
  const getFilePath = useCallback((fileId) => {
    const buildPath = (items, path = []) => {
      for (const item of items) {
        if (item.id === fileId) {
          return [...path, item.name].join('/');
        }
        if (item.children) {
          const found = buildPath(item.children, [...path, item.name]);
          if (found) return found;
        }
      }
      return null;
    };
    return buildPath(fileStructure) || '';
  }, [fileStructure]);

  // Validate file/folder name
  const validateName = useCallback((name, parentItems, excludeId = null) => {
    if (!name || !name.trim()) {
      return { valid: false, error: 'Name cannot be empty' };
    }

    const trimmedName = name.trim();

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      return { valid: false, error: 'Name contains invalid characters: < > : " / \\ | ? *' };
    }

    // Check for reserved names
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'LPT1', 'LPT2', 'LPT3'];
    if (reservedNames.includes(trimmedName.toUpperCase().split('.')[0])) {
      return { valid: false, error: 'This name is reserved by the system' };
    }

    // Check if name already exists in same folder
    if (parentItems) {
      const exists = parentItems.some(item =>
        item.name.toLowerCase() === trimmedName.toLowerCase() && item.id !== excludeId
      );
      if (exists) {
        return { valid: false, error: 'An item with this name already exists' };
      }
    }

    return { valid: true };
  }, []);

  // Get parent items for an item
  const getParentItems = useCallback((itemId, items = fileStructure, parent = null) => {
    for (const item of items) {
      if (item.id === itemId) {
        return parent ? parent.children : fileStructure;
      }
      if (item.children) {
        const found = getParentItems(itemId, item.children, item);
        if (found) return found;
      }
    }
    return null;
  }, [fileStructure]);

  // Rename item with validation
  const renameItem = useCallback((itemId, newName) => {
    const parentItems = getParentItems(itemId);
    const validation = validateName(newName, parentItems, itemId);

    if (!validation.valid) {
      return { error: validation.error };
    }

    const rename = (items) => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, name: newName.trim() };
        }
        if (item.children) {
          return { ...item, children: rename(item.children) };
        }
        return item;
      });
    };

    setFileStructure(prev => rename(prev));
    setOpenFiles(prev => prev.map(f => f.id === itemId ? { ...f, name: newName.trim() } : f));
    return { success: true };
  }, [getParentItems, validateName]);

  // Move item to a new parent
  const moveItem = useCallback((itemId, targetId) => {
    if (itemId === targetId) return { error: 'Cannot move item to itself' };

    let itemToMove = null;

    // Check if target is a descendant of item (would create circular reference)
    const isDescendant = (parentId, childId, items = fileStructure) => {
      for (const item of items) {
        if (item.id === parentId) {
          const checkChildren = (children) => {
            for (const child of children) {
              if (child.id === childId) return true;
              if (child.children && checkChildren(child.children)) return true;
            }
            return false;
          };
          return item.children ? checkChildren(item.children) : false;
        }
        if (item.children) {
          const found = isDescendant(parentId, childId, item.children);
          if (found) return found;
        }
      }
      return false;
    };

    if (isDescendant(itemId, targetId)) {
      return { error: 'Cannot move a folder into its own subfolder' };
    }

    // Find and remove item
    const removeItem = (items) => {
      return items.filter(item => {
        if (item.id === itemId) {
          itemToMove = { ...item };
          return false;
        }
        if (item.children) {
          item.children = removeItem(item.children);
        }
        return true;
      });
    };

    // Add item to target
    const addToTarget = (items) => {
      return items.map(item => {
        if (item.id === targetId && item.type === 'folder') {
          // Check for name conflict
          const exists = item.children?.some(child =>
            child.name.toLowerCase() === itemToMove.name.toLowerCase()
          );
          if (exists) {
            return item; // Will handle error below
          }
          return {
            ...item,
            children: [...(item.children || []), itemToMove]
          };
        }
        if (item.children) {
          return { ...item, children: addToTarget(item.children) };
        }
        return item;
      });
    };

    setFileStructure(prev => {
      let newStructure = removeItem([...prev]);
      if (itemToMove) {
        if (targetId === 'root' || targetId === null) {
          // Check for name conflict at root
          const exists = newStructure.some(item =>
            item.name.toLowerCase() === itemToMove.name.toLowerCase()
          );
          if (!exists) {
            newStructure = [...newStructure, itemToMove];
          }
        } else {
          newStructure = addToTarget(newStructure);
        }
      }
      return newStructure;
    });

    return { success: true };
  }, [fileStructure]);

  // Toggle folder open/closed
  const toggleFolder = useCallback((folderId) => {
    setFileStructure(prev => {
      const toggle = (items) => {
        return items.map(item => {
          if (item.id === folderId && item.type === 'folder') {
            return { ...item, isOpen: !item.isOpen };
          }
          if (item.children) {
            return { ...item, children: toggle(item.children) };
          }
          return item;
        });
      };
      return toggle(prev);
    });
  }, []);

  // Collapse all folders
  const collapseAll = useCallback(() => {
    setFileStructure(prev => {
      const collapse = (items) => {
        return items.map(item => {
          if (item.type === 'folder') {
            return {
              ...item,
              isOpen: false,
              children: item.children ? collapse(item.children) : []
            };
          }
          return item;
        });
      };
      return collapse(prev);
    });
  }, []);

  // Serialize file structure for saving to database
  const serializeForSave = useCallback(() => {
    const files = [];

    const processItem = (item, parentPath = '') => {
      const path = parentPath ? `${parentPath}/${item.name}` : item.name;

      if (item.type === 'folder') {
        // Add folder entry
        files.push({
          id: item.id,
          name: item.name,
          path,
          isFolder: true,
          content: '',
          language: null,
          parentPath: parentPath || null
        });

        // Process children
        if (item.children) {
          item.children.forEach(child => processItem(child, path));
        }
      } else {
        // Add file entry with content
        const ext = item.name.split('.').pop()?.toLowerCase() || '';
        const languageMap = {
          'js': 'javascript',
          'jsx': 'javascript',
          'ts': 'typescript',
          'tsx': 'typescript',
          'py': 'python',
          'html': 'html',
          'css': 'css',
          'json': 'json',
          'md': 'markdown',
          'txt': 'plaintext'
        };

        files.push({
          id: item.id,
          name: item.name,
          path,
          isFolder: false,
          content: fileContents[item.id] || '',
          language: languageMap[ext] || 'plaintext',
          parentPath: parentPath || null
        });
      }
    };

    fileStructure.forEach(item => processItem(item));

    // Return the complete workspace data for JSON storage
    return {
      files,
      fileContents,
      fileTree: fileStructure  // Also include the tree structure directly
    };
  }, [fileStructure, fileContents]);

  // Load files from session data (from database)
  // Supports both: flat array with paths AND nested tree structure
  const loadFromSession = useCallback((sessionFiles, fileContentsMap = {}) => {
    if (!sessionFiles || sessionFiles.length === 0) return;

    // Check if this is a TREE structure (has 'children') or FLAT array (has 'path')
    const isTreeStructure = sessionFiles[0] && 'children' in sessionFiles[0] && !sessionFiles[0].path;

    if (isTreeStructure) {
      // It's already a tree structure - use directly!
      console.log('📂 Loading tree structure directly (found children property)');
      setFileStructure(sessionFiles);
      setFileContents(fileContentsMap);
      setOpenFiles([]);
      setActiveFileId(null);
      console.log(`📂 Loaded ${sessionFiles.length} root items into local workspace`);
      return;
    }

    // It's a flat array with paths - need to build tree
    // Filter out invalid files (must have path)
    const validFiles = sessionFiles.filter(file => file && file.path);

    if (validFiles.length === 0) {
      console.log('📂 No valid files to load (files without path were filtered)');
      return;
    }

    // Sort files by path depth first (folders before files at same depth), then alphabetically
    const sortedFiles = [...validFiles].sort((a, b) => {
      const depthA = (a.path.match(/\//g) || []).length;
      const depthB = (b.path.match(/\//g) || []).length;
      if (depthA !== depthB) return depthA - depthB;
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.path.localeCompare(b.path);
    });

    // Build the tree structure
    const newStructure = [];
    const newContents = {};
    const pathToNode = {};

    sortedFiles.forEach(file => {
      const parts = file.path.split('/');
      const name = file.name || parts[parts.length - 1];
      const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : null;

      const node = {
        id: file.id || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        type: file.isFolder ? 'folder' : 'file',
        ...(file.isFolder ? { children: [], isOpen: true } : {})
      };

      pathToNode[file.path] = node;

      if (!file.isFolder) {
        newContents[node.id] = file.content || '';
      }

      if (parentPath && pathToNode[parentPath]) {
        pathToNode[parentPath].children = pathToNode[parentPath].children || [];
        pathToNode[parentPath].children.push(node);
      } else {
        // No parent or parent not found - add to root
        newStructure.push(node);
      }
    });

    setFileStructure(newStructure);
    setFileContents(newContents);
    setOpenFiles([]);
    setActiveFileId(null);

    console.log(`📂 Loaded ${sortedFiles.length} files into local workspace`);
  }, []);

  // Mark all files as saved
  const markAllSaved = useCallback(() => {
    // For now, just a placeholder - could track unsaved state per file
  }, []);

  const value = useMemo(() => ({
    fileStructure,
    fileContents,
    openFiles,
    activeFileId,
    setActiveFileId,
    findItemById,
    getFileContent,
    updateFileContent,
    openFile,
    closeFile,
    createFile,
    createFolder,
    deleteItem,
    getFilePath,
    renameItem,
    moveItem,
    toggleFolder,
    collapseAll,
    validateName,
    getParentItems,
    // Save/Load functions
    serializeForSave,
    loadFromSession,
    markAllSaved,
  }), [
    fileStructure,
    fileContents,
    openFiles,
    activeFileId,
    findItemById,
    getFileContent,
    updateFileContent,
    openFile,
    closeFile,
    createFile,
    createFolder,
    deleteItem,
    getFilePath,
    renameItem,
    moveItem,
    toggleFolder,
    collapseAll,
    validateName,
    getParentItems,
    serializeForSave,
    loadFromSession,
    markAllSaved,
  ]);

  return (
    <LocalFileSystemContext.Provider value={value}>
      {children}
    </LocalFileSystemContext.Provider>
  );
};

export default LocalFileSystemContext;
