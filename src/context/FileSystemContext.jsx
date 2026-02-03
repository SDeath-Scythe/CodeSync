import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Default project structure
const DEFAULT_FILE_STRUCTURE = [
  {
    id: 'folder-my-project',
    name: 'My_Project',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'file-app-js',
        name: 'app.js',
        type: 'file',
        language: 'javascript'
      }
    ]
  }
];

// Default file contents
const DEFAULT_FILE_CONTENTS = {
  'file-app-js': `console.log("helloWorld");
`
};

const FileSystemContext = createContext(null);

export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
};

export const FileSystemProvider = ({ children }) => {
  const [fileStructure, setFileStructure] = useState(DEFAULT_FILE_STRUCTURE);
  const [fileContents, setFileContents] = useState(DEFAULT_FILE_CONTENTS);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);

  // Generate unique ID
  const generateId = (type) => `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Find item by ID (moved up so other functions can use it)
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

  // Find parent of an item
  const findParent = useCallback((items, childId) => {
    for (const item of items) {
      if (item.children && item.children.some(c => c.id === childId)) return item;
      if (item.children) {
        const found = findParent(item.children, childId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Check if name exists in the same folder
  const nameExistsInFolder = useCallback((name, parentId, excludeId = null) => {
    let siblings;
    if (parentId) {
      const parent = findItemById(fileStructure, parentId);
      siblings = parent?.children || [];
    } else {
      siblings = fileStructure;
    }
    return siblings.some(item =>
      item.name.toLowerCase() === name.toLowerCase() && item.id !== excludeId
    );
  }, [fileStructure, findItemById]);

  // Validate file/folder name
  const validateName = useCallback((name) => {
    if (!name || !name.trim()) {
      return { valid: false, error: 'Name cannot be empty' };
    }
    const trimmedName = name.trim();
    // Check for invalid characters
    const invalidChars = /[<>:"\/\\|?*\x00-\x1F]/;
    if (invalidChars.test(trimmedName)) {
      return { valid: false, error: 'Name contains invalid characters' };
    }
    // Check for reserved names (Windows)
    const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    if (reservedNames.test(trimmedName.split('.')[0])) {
      return { valid: false, error: 'This name is reserved by the system' };
    }
    // Check max length
    if (trimmedName.length > 255) {
      return { valid: false, error: 'Name is too long (max 255 characters)' };
    }
    return { valid: true };
  }, []);

  // Get file path
  const getFilePath = useCallback((id) => {
    const buildPath = (items, targetId, path = []) => {
      for (const item of items) {
        if (item.id === targetId) {
          return [...path, item.name];
        }
        if (item.children) {
          const result = buildPath(item.children, targetId, [...path, item.name]);
          if (result) return result;
        }
      }
      return null;
    };
    return buildPath(fileStructure, id)?.join('/') || '';
  }, [fileStructure]);

  // Create file or folder
  const createItem = useCallback((type, name, parentId = null) => {
    // Validate name
    const validation = validateName(name);
    if (!validation.valid) {
      return { error: validation.error };
    }

    // Check for duplicate names
    if (nameExistsInFolder(name, parentId)) {
      return { error: `A ${type} with this name already exists` };
    }

    const newItem = {
      id: generateId(type),
      name: name.trim(),
      type,
      isOpen: type === 'folder',
      children: type === 'folder' ? [] : undefined,
      language: type === 'file' ? getLanguageFromName(name) : undefined
    };

    // Initialize file content
    if (type === 'file') {
      setFileContents(prev => ({
        ...prev,
        [newItem.id]: getDefaultContent(name)
      }));
    }

    setFileStructure(prev => {
      const addItem = (items) => {
        if (!parentId) {
          return sortItems([...items, newItem]);
        }
        return items.map(item => {
          if (item.id === parentId) {
            return {
              ...item,
              isOpen: true,
              children: sortItems([...(item.children || []), newItem])
            };
          }
          if (item.children) {
            return { ...item, children: addItem(item.children) };
          }
          return item;
        });
      };
      return addItem(prev);
    });

    return newItem;
  }, [validateName, nameExistsInFolder]);

  // Delete file or folder
  const deleteItem = useCallback((id) => {
    // Collect all file IDs to delete content
    const collectFileIds = (items) => {
      let ids = [];
      items.forEach(item => {
        if (item.id === id) {
          if (item.type === 'file') {
            ids.push(item.id);
          } else if (item.children) {
            ids = [...ids, ...getAllFileIds(item.children)];
          }
        } else if (item.children) {
          ids = [...ids, ...collectFileIds(item.children)];
        }
      });
      return ids;
    };

    const getAllFileIds = (items) => {
      let ids = [];
      items.forEach(item => {
        if (item.type === 'file') {
          ids.push(item.id);
        } else if (item.children) {
          ids = [...ids, ...getAllFileIds(item.children)];
        }
      });
      return ids;
    };

    const fileIdsToDelete = collectFileIds(fileStructure);
    const item = findItemById(fileStructure, id);
    if (item?.type === 'file') {
      fileIdsToDelete.push(id);
    } else if (item?.children) {
      fileIdsToDelete.push(...getAllFileIds(item.children));
    }

    // Remove from open files
    setOpenFiles(prev => prev.filter(f => !fileIdsToDelete.includes(f.id)));

    // Clear active file if it's being deleted
    if (fileIdsToDelete.includes(activeFileId)) {
      setActiveFileId(null);
    }

    // Delete file contents
    setFileContents(prev => {
      const newContents = { ...prev };
      fileIdsToDelete.forEach(fid => delete newContents[fid]);
      return newContents;
    });

    // Delete from structure
    setFileStructure(prev => {
      const removeItem = (items) => {
        return items
          .filter(item => item.id !== id)
          .map(item => {
            if (item.children) {
              return { ...item, children: removeItem(item.children) };
            }
            return item;
          });
      };
      return removeItem(prev);
    });
  }, [fileStructure, activeFileId, findItemById]);

  // Rename file or folder
  const renameItem = useCallback((id, newName) => {
    // Validate name
    const validation = validateName(newName);
    if (!validation.valid) {
      return { error: validation.error };
    }

    // Find the parent to check for duplicates
    const parent = findParent(fileStructure, id);
    const parentId = parent?.id || null;

    // Check for duplicate names (excluding current item)
    if (nameExistsInFolder(newName, parentId, id)) {
      return { error: 'A file or folder with this name already exists' };
    }

    setFileStructure(prev => {
      const rename = (items) => {
        return items.map(item => {
          if (item.id === id) {
            return {
              ...item,
              name: newName.trim(),
              language: item.type === 'file' ? getLanguageFromName(newName) : undefined
            };
          }
          if (item.children) {
            return { ...item, children: rename(item.children) };
          }
          return item;
        });
      };
      return rename(prev);
    });

    // Update open files
    setOpenFiles(prev => prev.map(f =>
      f.id === id ? { ...f, name: newName.trim() } : f
    ));

    return { success: true };
  }, [validateName, nameExistsInFolder, findParent, fileStructure]);

  // Move item to new location
  const moveItem = useCallback((itemId, newParentId) => {
    const itemToMove = findItemById(fileStructure, itemId);
    if (!itemToMove) return { error: 'Item not found' };

    // Check if trying to move into itself or descendant
    if (itemToMove.type === 'folder' && newParentId) {
      const isDescendant = (parentId, childId) => {
        const parent = findItemById(fileStructure, parentId);
        if (!parent?.children) return false;
        const check = (items) => {
          for (const item of items) {
            if (item.id === childId) return true;
            if (item.children && check(item.children)) return true;
          }
          return false;
        };
        return check(parent.children);
      };

      if (itemId === newParentId || isDescendant(itemId, newParentId)) {
        return { error: 'Cannot move a folder into itself or its subfolder' };
      }
    }

    // Check for duplicate names in target folder
    if (nameExistsInFolder(itemToMove.name, newParentId, itemId)) {
      return { error: `A ${itemToMove.type} named "${itemToMove.name}" already exists in the destination folder` };
    }

    setFileStructure(prev => {
      // Remove item from current location
      const removeItem = (items) => {
        return items
          .filter(item => item.id !== itemId)
          .map(item => {
            if (item.children) {
              return { ...item, children: removeItem(item.children) };
            }
            return item;
          });
      };

      let newStructure = removeItem(prev);

      // Add item to new location
      if (newParentId) {
        const addToParent = (items) => {
          return items.map(item => {
            if (item.id === newParentId) {
              return {
                ...item,
                isOpen: true,
                children: sortItems([...(item.children || []), itemToMove])
              };
            }
            if (item.children) {
              return { ...item, children: addToParent(item.children) };
            }
            return item;
          });
        };
        newStructure = addToParent(newStructure);
      } else {
        // Move to root
        newStructure = sortItems([...newStructure, itemToMove]);
      }

      return newStructure;
    });

    return { success: true };
  }, [fileStructure, findItemById, nameExistsInFolder]);

  // Toggle folder open/closed
  const toggleFolder = useCallback((id) => {
    setFileStructure(prev => {
      const toggle = (items) => {
        return items.map(item => {
          if (item.id === id) {
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
              children: collapse(item.children || [])
            };
          }
          return item;
        });
      };
      return collapse(prev);
    });
  }, []);

  // Open file in editor
  const openFile = useCallback((id) => {
    const file = findItemById(fileStructure, id);
    if (!file || file.type !== 'file') return;

    setOpenFiles(prev => {
      if (prev.some(f => f.id === id)) {
        return prev;
      }
      return [...prev, { id, name: file.name, unsaved: false }];
    });
    setActiveFileId(id);
  }, [fileStructure, findItemById]);

  // Close file
  const closeFile = useCallback((id) => {
    setOpenFiles(prev => prev.filter(f => f.id !== id));
    if (activeFileId === id) {
      setActiveFileId(prev => {
        const remaining = openFiles.filter(f => f.id !== id);
        return remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      });
    }
  }, [activeFileId, openFiles]);

  // Get file content
  const getFileContent = useCallback((id) => {
    return fileContents[id] || '';
  }, [fileContents]);

  // Update file content
  const updateFileContent = useCallback((id, content) => {
    setFileContents(prev => ({
      ...prev,
      [id]: content
    }));

    // Mark as unsaved
    setOpenFiles(prev => prev.map(f =>
      f.id === id ? { ...f, unsaved: true } : f
    ));
  }, []);

  // Save file
  const saveFile = useCallback((id) => {
    setOpenFiles(prev => prev.map(f =>
      f.id === id ? { ...f, unsaved: false } : f
    ));
  }, []);

  // Serialize the entire file structure for saving to database
  // Returns { files, fileContents } for efficient JSON storage
  const serializeForSave = useCallback(() => {
    const files = [];

    const traverseTree = (items, parentPath = '') => {
      for (const item of items) {
        const path = parentPath ? `${parentPath}/${item.name}` : item.name;

        files.push({
          id: item.id,
          name: item.name,
          path: path,
          content: item.type === 'file' ? (fileContents[item.id] || '') : '',
          language: item.language || null,
          isFolder: item.type === 'folder',
          parentPath: parentPath || null
        });

        if (item.children) {
          traverseTree(item.children, path);
        }
      }
    };

    traverseTree(fileStructure);

    // Return the complete workspace data for JSON storage
    return {
      files,
      fileContents,
      fileTree: fileStructure  // Also include the tree structure directly
    };
  }, [fileStructure, fileContents]);

  // Load file structure from database records
  // Supports both: flat array with paths AND nested tree structure
  const loadFromSession = useCallback((sessionFiles, fileContentsMap = {}) => {
    if (!sessionFiles || sessionFiles.length === 0) {
      return;
    }

    // Check if this is a TREE structure (has 'children') or FLAT array (has 'path')
    const isTreeStructure = sessionFiles[0] && 'children' in sessionFiles[0] && !sessionFiles[0].path;

    if (isTreeStructure) {
      // It's already a tree structure - use directly!
      console.log('📂 Loading tree structure directly (found children property)');
      setFileStructure(sessionFiles);
      setFileContents(fileContentsMap);
      setOpenFiles([]);
      setActiveFileId(null);
      console.log(`📂 Loaded ${sessionFiles.length} root items from session`);
      return;
    }

    // It's a flat array with paths - need to build tree
    // Filter out invalid files (must have path)
    const validFiles = sessionFiles.filter(file => file && file.path);

    // Normalize files - extract name and parentPath from path if missing
    const normalizedFiles = validFiles.map(file => {
      const pathParts = file.path.split('/');
      const name = file.name || pathParts[pathParts.length - 1];
      const parentPath = file.parentPath !== undefined
        ? file.parentPath
        : (pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null);

      return {
        ...file,
        name,
        parentPath
      };
    });

    // Sort files by path depth (folders first, then by path)
    const sortedFiles = [...normalizedFiles].sort((a, b) => {
      const depthA = (a.path.match(/\//g) || []).length;
      const depthB = (b.path.match(/\//g) || []).length;
      if (depthA !== depthB) return depthA - depthB;
      return a.path.localeCompare(b.path);
    });

    // Build the file tree structure
    const rootItems = [];
    const itemMap = new Map();
    const newContents = {};

    for (const file of sortedFiles) {
      const item = {
        id: file.id || `${file.isFolder ? 'folder' : 'file'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.isFolder ? 'folder' : 'file',
        isOpen: file.isFolder ? true : undefined,
        children: file.isFolder ? [] : undefined,
        language: file.language || undefined
      };

      itemMap.set(file.path, item);

      // Store file content
      if (!file.isFolder) {
        newContents[item.id] = file.content || '';
      }

      // Add to parent or root
      if (file.parentPath) {
        const parent = itemMap.get(file.parentPath);
        if (parent && parent.children) {
          parent.children.push(item);
        } else {
          // Parent not found yet, add to root
          rootItems.push(item);
        }
      } else {
        rootItems.push(item);
      }
    }

    // Sort all children (folders first, then alphabetically)
    const sortChildren = (items) => {
      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      items.forEach(item => {
        if (item.children) {
          sortChildren(item.children);
        }
      });
    };

    sortChildren(rootItems);

    // Update state
    setFileStructure(rootItems);
    setFileContents(newContents);
    setOpenFiles([]);
    setActiveFileId(null);

    console.log(`📂 Loaded ${sortedFiles.length} files from session`);
  }, []);

  // Mark all files as saved
  const markAllSaved = useCallback(() => {
    setOpenFiles(prev => prev.map(f => ({ ...f, unsaved: false })));
  }, []);

  const value = useMemo(() => ({
    fileStructure,
    fileContents,
    openFiles,
    activeFileId,
    setActiveFileId,
    findItemById,
    findParent,
    getFilePath,
    createItem,
    deleteItem,
    renameItem,
    moveItem,
    toggleFolder,
    collapseAll,
    openFile,
    closeFile,
    getFileContent,
    updateFileContent,
    saveFile,
    // New session save/load functions
    serializeForSave,
    loadFromSession,
    markAllSaved
  }), [
    fileStructure,
    fileContents,
    openFiles,
    activeFileId,
    setActiveFileId,
    findItemById,
    findParent,
    getFilePath,
    createItem,
    deleteItem,
    renameItem,
    moveItem,
    toggleFolder,
    collapseAll,
    openFile,
    closeFile,
    getFileContent,
    updateFileContent,
    saveFile,
    serializeForSave,
    loadFromSession,
    markAllSaved
  ]);

  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  );
};

// Helper functions
function sortItems(items) {
  return items.sort((a, b) => {
    // Folders first
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    // Alphabetically
    return a.name.localeCompare(b.name);
  });
}

function getLanguageFromName(name) {
  const ext = name.split('.').pop()?.toLowerCase();
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
    txt: 'plaintext'
  };
  return langMap[ext] || 'plaintext';
}

function getDefaultContent(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  const templates = {
    js: `// ${name}\n\n`,
    jsx: `// ${name}\nimport React from 'react';\n\nconst Component = () => {\n  return (\n    <div>\n      \n    </div>\n  );\n};\n\nexport default Component;\n`,
    ts: `// ${name}\n\n`,
    tsx: `// ${name}\nimport React from 'react';\n\nconst Component: React.FC = () => {\n  return (\n    <div>\n      \n    </div>\n  );\n};\n\nexport default Component;\n`,
    css: `/* ${name} */\n\n`,
    html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>\n`,
    json: `{\n  \n}\n`,
    md: `# ${name.replace('.md', '')}\n\n`,
    py: `# ${name}\n\n`,
    java: `// ${name}\n\npublic class ${name.replace('.java', '')} {\n  public static void main(String[] args) {\n    \n  }\n}\n`,
  };
  return templates[ext] || `// ${name}\n`;
}

export default FileSystemContext;
