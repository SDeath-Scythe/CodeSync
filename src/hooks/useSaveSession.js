// Custom hook for CTRL+S save functionality
import { useEffect, useCallback, useRef } from 'react';
import { useFileSystem } from '../context/FileSystemContext';
import { useCollaboration } from '../context/CollaborationContext';
import { useToast } from '../components/ToastProvider';

/**
 * Hook that handles CTRL+S saving of the file structure to the session database.
 * Must be used within both FileSystemProvider and CollaborationProvider contexts.
 * 
 * @returns {Object} - { isSaving, lastSaved, saveNow }
 */
export const useSaveSession = () => {
        const toast = useToast();
        const { serializeForSave, markAllSaved, loadFromSession } = useFileSystem();
        const { saveSessionToDb, loadSessionFromDb, currentSession, isSaving, lastSaved } = useCollaboration();

        const savingRef = useRef(false);

        // Use refs to avoid stale closures and prevent infinite loops
        const toastRef = useRef(toast);
        const serializeForSaveRef = useRef(serializeForSave);
        const markAllSavedRef = useRef(markAllSaved);
        const saveSessionToDbRef = useRef(saveSessionToDb);
        const loadSessionFromDbRef = useRef(loadSessionFromDb);
        const loadFromSessionRef = useRef(loadFromSession);

        // Update refs when values change
        useEffect(() => {
                toastRef.current = toast;
                serializeForSaveRef.current = serializeForSave;
                markAllSavedRef.current = markAllSaved;
                saveSessionToDbRef.current = saveSessionToDb;
                loadSessionFromDbRef.current = loadSessionFromDb;
                loadFromSessionRef.current = loadFromSession;
        });

        // Save function - stable reference
        const saveNow = useCallback(async () => {
                if (savingRef.current || !currentSession) {
                        return { success: false };
                }

                savingRef.current = true;

                try {
                        // Serialize the current file structure (returns { files, fileContents, fileTree })
                        const workspaceData = serializeForSaveRef.current();

                        if (!workspaceData.files || workspaceData.files.length === 0) {
                                toastRef.current.warning('Nothing to Save', 'No files in the project');
                                return { success: false };
                        }

                        // Save workspace to database
                        const result = await saveSessionToDbRef.current(workspaceData);

                        if (result.success) {
                                markAllSavedRef.current();
                                toastRef.current.success('Saved!', `${result.count} files saved to session`);
                        } else {
                                toastRef.current.error('Save Failed', result.error || 'Could not save files');
                        }

                        return result;
                } catch (error) {
                        console.error('Save error:', error);
                        toastRef.current.error('Save Failed', error.message);
                        return { success: false, error: error.message };
                } finally {
                        savingRef.current = false;
                }
        }, [currentSession]);

        // Load session workspace - stable reference
        const loadSession = useCallback(async (sessionCode) => {
                try {
                        const workspaceData = await loadSessionFromDbRef.current(sessionCode);
                        const files = workspaceData.files || [];
                        const fileContentsMap = workspaceData.fileContents || {};
                        if (files.length > 0) {
                                loadFromSessionRef.current(files, fileContentsMap);
                                toastRef.current.success('Workspace Loaded', `Restored ${files.length} files from session`);
                                return true;
                        }
                        return false;
                } catch (error) {
                        console.error('Load error:', error);
                        toastRef.current.error('Load Failed', error.message);
                        return false;
                }
        }, []);

        // CTRL+S handler - minimal dependencies
        useEffect(() => {
                const handleKeyDown = (e) => {
                        // Check for CTRL+S (or CMD+S on Mac)
                        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                                e.preventDefault();

                                if (!currentSession) {
                                        toastRef.current.warning('No Session', 'Please join a session to save files');
                                        return;
                                }

                                saveNow();
                        }
                };

                document.addEventListener('keydown', handleKeyDown);
                return () => document.removeEventListener('keydown', handleKeyDown);
        }, [currentSession, saveNow]);

        return {
                isSaving,
                lastSaved,
                saveNow,
                loadSession
        };
};

export default useSaveSession;
