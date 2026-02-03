// Custom hook for CTRL+S save functionality for student's local workspace
import { useEffect, useCallback, useRef } from 'react';
import { useLocalFileSystem } from '../context/LocalFileSystemContext';
import { useCollaboration } from '../context/CollaborationContext';
import { useToast } from '../components/ToastProvider';

/**
 * Hook that handles CTRL+S saving of the LOCAL file structure (student's own workspace) to the session database.
 * Must be used within both LocalFileSystemProvider and CollaborationProvider contexts.
 * 
 * @returns {Object} - { isSaving, lastSaved, saveNow, loadSession }
 */
export const useLocalSaveSession = () => {
        const toast = useToast();
        const { serializeForSave, markAllSaved, loadFromSession } = useLocalFileSystem();
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
                        console.log('💾 Save skipped:', { saving: savingRef.current, session: currentSession });
                        return { success: false };
                }

                savingRef.current = true;
                console.log('💾 Starting save for session:', currentSession);

                try {
                        // Serialize the current LOCAL file structure (returns { files, fileContents, fileTree })
                        const workspaceData = serializeForSaveRef.current();
                        console.log('💾 Workspace data to save:', {
                                filesCount: workspaceData.files?.length,
                                fileContentsKeys: Object.keys(workspaceData.fileContents || {}),
                                fileTreeLength: workspaceData.fileTree?.length
                        });

                        if (!workspaceData.files || workspaceData.files.length === 0) {
                                toastRef.current.warning('Nothing to Save', 'No files in your workspace');
                                return { success: false };
                        }

                        // Save workspace to database
                        console.log('💾 Calling saveSessionToDb...');
                        const result = await saveSessionToDbRef.current(workspaceData);
                        console.log('💾 Save result:', result);

                        if (result.success) {
                                markAllSavedRef.current();
                                toastRef.current.success('Saved!', `${result.count} files saved to your workspace`);
                        } else {
                                toastRef.current.error('Save Failed', result.error || 'Could not save files');
                        }

                        return result;
                } catch (error) {
                        console.error('💾 Save error:', error);
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
                                toastRef.current.success('Workspace Loaded', `Restored ${files.length} files`);
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

export default useLocalSaveSession;
