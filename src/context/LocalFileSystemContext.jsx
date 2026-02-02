import React, { createContext, useContext, useState, useCallback } from 'react';

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

  // Rename item
  const renameItem = useCallback((itemId, newName) => {
    const rename = (items) => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, name: newName };
        }
        if (item.children) {
          return { ...item, children: rename(item.children) };
        }
        return item;
      });
    };

    setFileStructure(prev => rename(prev));
    setOpenFiles(prev => prev.map(f => f.id === itemId ? { ...f, name: newName } : f));
  }, []);

  const value = {
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
  };

  return (
    <LocalFileSystemContext.Provider value={value}>
      {children}
    </LocalFileSystemContext.Provider>
  );
};

export default LocalFileSystemContext;
