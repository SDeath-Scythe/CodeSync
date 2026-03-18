import React, { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

/**
 * Terminal Component
 * Interactive terminal using xterm.js with WebSocket connection to backend
 * Use ref to access: start(), sync(), sendCommand(cmd), isConnected, refreshFromWorkspace()
 */
const Terminal = forwardRef(({
        socket,
        sessionCode,
        onSync, // Function to get current files for syncing
        onWorkspaceUpdate, // Callback when workspace files are read from server
        className = '',
        onReady,
        autoStart = false, // Auto-start terminal when mounted
        runCommand = null, // Command to run after terminal starts
        readOnly = false, // If true, terminal is read-only (no input sent to server)
        ownerId = null // If provided, only listen for broadcast events matching this user
}, ref) => {
        const terminalRef = useRef(null);
        const xtermRef = useRef(null);
        const fitAddonRef = useRef(null);
        const [isConnected, setIsConnected] = useState(false);
        const [workspacePath, setWorkspacePath] = useState('');

        // Refs to prevent duplicate operations
        const isStartingRef = useRef(false);
        const commandSentRef = useRef(false);

        // Initialize terminal
        useEffect(() => {
                if (!terminalRef.current || xtermRef.current) return;

                // Create xterm instance
                const term = new XTerm({
                        theme: {
                                background: '#1e1e2e',
                                foreground: '#cdd6f4',
                                cursor: '#f5e0dc',
                                cursorAccent: '#1e1e2e',
                                selectionBackground: '#45475a',
                                black: '#45475a',
                                red: '#f38ba8',
                                green: '#a6e3a1',
                                yellow: '#f9e2af',
                                blue: '#89b4fa',
                                magenta: '#cba6f7',
                                cyan: '#94e2d5',
                                white: '#bac2de',
                                brightBlack: '#585b70',
                                brightRed: '#f38ba8',
                                brightGreen: '#a6e3a1',
                                brightYellow: '#f9e2af',
                                brightBlue: '#89b4fa',
                                brightMagenta: '#cba6f7',
                                brightCyan: '#94e2d5',
                                brightWhite: '#a6adc8'
                        },
                        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, monospace',
                        fontSize: 14,
                        lineHeight: 1.2,
                        cursorBlink: true,
                        cursorStyle: 'block',
                        scrollback: 1000,
                        convertEol: true
                });

                // Create fit addon
                const fitAddon = new FitAddon();
                term.loadAddon(fitAddon);

                // Create web links addon for Ctrl+Click on URLs
                const webLinksAddon = new WebLinksAddon((event, uri) => {
                        // Open link in new tab when Ctrl+Click
                        if (event.ctrlKey || event.metaKey) {
                                window.open(uri, '_blank');
                        }
                });
                term.loadAddon(webLinksAddon);

                // Open terminal in container
                term.open(terminalRef.current);
                fitAddon.fit();

                xtermRef.current = term;
                fitAddonRef.current = fitAddon;

                // Handle resize
                const handleResize = () => {
                        if (fitAddonRef.current) {
                                fitAddonRef.current.fit();
                                if (socket && isConnected) {
                                        socket.emit('terminal-resize', {
                                                cols: term.cols,
                                                rows: term.rows
                                        });
                                }
                        }
                };

                window.addEventListener('resize', handleResize);

                // ResizeObserver to re-fit when the container itself changes size
                // (e.g. when terminal panel is toggled open)
                let resizeObserver = null;
                if (terminalRef.current) {
                        resizeObserver = new ResizeObserver(() => {
                                // Small delay to ensure layout is settled
                                requestAnimationFrame(() => {
                                        if (fitAddonRef.current) {
                                                fitAddonRef.current.fit();
                                        }
                                });
                        });
                        resizeObserver.observe(terminalRef.current);
                }

                // Welcome message
                if (readOnly) {
                        term.writeln('\x1b[1;36m╭─────────────────────────────────────╮\x1b[0m');
                        term.writeln('\x1b[1;36m│  \x1b[1;35mTeacher\'s Terminal\x1b[1;36m              │\x1b[0m');
                        term.writeln('\x1b[1;36m╰─────────────────────────────────────╯\x1b[0m');
                        term.writeln('');
                        term.writeln('\x1b[90mWaiting for teacher to start their terminal...\x1b[0m');
                        term.writeln('\x1b[90mOutput will appear here in real-time.\x1b[0m');
                        term.writeln('');
                } else {
                        term.writeln('\x1b[1;36m╭─────────────────────────────────────╮\x1b[0m');
                        term.writeln('\x1b[1;36m│  \x1b[1;32mCodeSync Terminal\x1b[1;36m                 │\x1b[0m');
                        term.writeln('\x1b[1;36m╰─────────────────────────────────────╯\x1b[0m');
                        term.writeln('');
                        term.writeln('\x1b[90mType commands below. Your files are synced automatically.\x1b[0m');
                        term.writeln('');
                }

                onReady?.(term);

                return () => {
                        window.removeEventListener('resize', handleResize);
                        if (resizeObserver) resizeObserver.disconnect();
                        term.dispose();
                        xtermRef.current = null;
                };
        }, []);

        // Use a ref for the callback to prevent re-subscribing on every state change
        const onWorkspaceUpdateRef = useRef(onWorkspaceUpdate);
        useEffect(() => {
                onWorkspaceUpdateRef.current = onWorkspaceUpdate;
        }, [onWorkspaceUpdate]);

        // Set up socket listeners
        useEffect(() => {
                if (!socket || !xtermRef.current) return;

                const term = xtermRef.current;

                // Handle incoming data
                const handleData = ({ data }) => {
                        term.write(data);
                };

                // Handle broadcast data for observing terminals
                const handleBroadcastData = ({ userId, data }) => {
                        // Only write if we are observing this specific user
                        if (ownerId && userId === ownerId) {
                                term.write(data);
                        }
                };

                // Handle terminal started
                const handleStarted = ({ message, workspacePath }) => {
                        term.writeln(`\x1b[32m${message}\x1b[0m`);
                        if (workspacePath) {
                                setWorkspacePath(workspacePath);
                        }
                        setIsConnected(true);
                };

                // Handle errors
                const handleError = ({ message }) => {
                        term.writeln(`\x1b[31mError: ${message}\x1b[0m`);
                };

                // Handle terminal exit
                const handleExit = ({ exitCode }) => {
                        term.writeln(`\x1b[90mProcess exited with code ${exitCode}\x1b[0m`);
                        setIsConnected(false);
                };

                const handleExitBroadcast = ({ userId, exitCode }) => {
                        if (ownerId && userId === ownerId) {
                                term.writeln(`\x1b[90mProcess exited with code ${exitCode}\x1b[0m`);
                        }
                };

                // Handle terminal killed
                const handleKilled = () => {
                        term.writeln('\x1b[33mTerminal session ended\x1b[0m');
                        setIsConnected(false);
                };

                // Handle synced
                const handleSynced = ({ workspacePath }) => {
                        setWorkspacePath(workspacePath);
                };

                // Handle workspace data from server (reverse sync)
                const handleWorkspaceData = (data) => {
                        console.log('📂 Received workspace data:', data.stats);
                        if (onWorkspaceUpdateRef.current) {
                                onWorkspaceUpdateRef.current(data);
                        }
                };

                socket.on('terminal-data', handleData);
                socket.on('terminal-data-broadcast', handleBroadcastData);
                socket.on('terminal-started', handleStarted);
                socket.on('terminal-error', handleError);
                socket.on('terminal-exit', handleExit);
                socket.on('terminal-exit-broadcast', handleExitBroadcast);
                socket.on('terminal-killed', handleKilled);
                socket.on('terminal-synced', handleSynced);
                socket.on('terminal-workspace-data', handleWorkspaceData);

                return () => {
                        socket.off('terminal-data', handleData);
                        socket.off('terminal-data-broadcast', handleBroadcastData);
                        socket.off('terminal-started', handleStarted);
                        socket.off('terminal-error', handleError);
                        socket.off('terminal-exit', handleExit);
                        socket.off('terminal-exit-broadcast', handleExitBroadcast);
                        socket.off('terminal-killed', handleKilled);
                        socket.off('terminal-synced', handleSynced);
                        socket.off('terminal-workspace-data', handleWorkspaceData);
                };
        }, [socket, ownerId]); // Add ownerId to dependencies

        // Handle terminal input
        useEffect(() => {
                if (!socket || !xtermRef.current || !isConnected || readOnly) return;

                const term = xtermRef.current;

                // Send input to server
                const handleInput = term.onData((data) => {
                        socket.emit('terminal-input', { data });
                });

                return () => {
                        handleInput.dispose();
                };
        }, [socket, isConnected]);

        // Start terminal session - sync files first, then start
        const startTerminal = useCallback(() => {
                // Prevent duplicate starts
                if (isStartingRef.current || isConnected) {
                        console.log('📟 startTerminal skipped (already starting or connected)');
                        return;
                }
                isStartingRef.current = true;

                console.log('📟 startTerminal called', { socket: !!socket, xterm: !!xtermRef.current, onSync: !!onSync });
                if (!socket || !xtermRef.current) {
                        isStartingRef.current = false;
                        return;
                }

                const term = xtermRef.current;

                // If we have files to sync, do that first
                if (onSync) {
                        const syncData = onSync();
                        console.log('📁 Syncing files:', {
                                filesCount: syncData.files?.length,
                                contentsCount: Object.keys(syncData.fileContents || {}).length,
                                files: syncData.files
                        });
                        socket.emit('terminal-sync', { files: syncData.files, fileContents: syncData.fileContents });

                        // Wait for sync confirmation, then start terminal
                        const handleSynced = () => {
                                console.log('✅ Sync confirmed, starting terminal');
                                socket.off('terminal-synced', handleSynced);
                                socket.emit('terminal-start', {
                                        cols: term.cols,
                                        rows: term.rows
                                });
                        };
                        socket.on('terminal-synced', handleSynced);

                        // Fallback: start anyway after 2 seconds
                        setTimeout(() => {
                                socket.off('terminal-synced', handleSynced);
                                if (!isConnected) {
                                        console.log('⏱️ Fallback: starting terminal after timeout');
                                        socket.emit('terminal-start', {
                                                cols: term.cols,
                                                rows: term.rows
                                        });
                                }
                        }, 2000);
                } else {
                        console.log('⚠️ No onSync, starting terminal directly');
                        // No files to sync, just start
                        socket.emit('terminal-start', {
                                cols: term.cols,
                                rows: term.rows
                        });
                }
        }, [socket, onSync, isConnected]);

        // Expose methods via ref
        useImperativeHandle(ref, () => ({
                start: startTerminal,
                sync: () => {
                        if (!socket || !onSync) return;
                        const { files, fileContents } = onSync();
                        socket.emit('terminal-sync', { files, fileContents });
                },
                sendCommand: (cmd) => {
                        if (!socket || !isConnected) return;
                        socket.emit('terminal-input', { data: cmd + '\r' });
                },
                refreshFromWorkspace: () => {
                        if (!socket) return;
                        console.log('📂 Requesting workspace files from server...');
                        socket.emit('terminal-read-workspace');
                },
                isConnected: () => isConnected,
                term: () => xtermRef.current
        }), [startTerminal, socket, onSync, isConnected]);

        // Handle runCommand after terminal starts
        useEffect(() => {
                if (isConnected && runCommand && !commandSentRef.current) {
                        commandSentRef.current = true;
                        // Wait longer for PowerShell sandbox to load, then send command
                        const timer = setTimeout(() => {
                                console.log('🚀 Sending command:', runCommand);
                                socket.emit('terminal-input', { data: runCommand + '\r' });
                        }, 1500);
                        return () => clearTimeout(timer);
                }
        }, [isConnected, runCommand, socket]);

        // Reset refs when runCommand changes
        useEffect(() => {
                commandSentRef.current = false;
        }, [runCommand]);

        // Auto-start if prop is set
        useEffect(() => {
                if (autoStart && socket && xtermRef.current && !isConnected) {
                        // Small delay to ensure everything is mounted
                        const timer = setTimeout(startTerminal, 100);
                        return () => clearTimeout(timer);
                }
        }, [autoStart, socket, isConnected, startTerminal]);

        // Kill terminal session
        const killTerminal = useCallback(() => {
                if (!socket) return;
                socket.emit('terminal-kill');
        }, [socket]);

        // Sync files to workspace
        const syncFiles = useCallback(() => {
                if (!socket || !onSync) return;
                const { files, fileContents } = onSync();
                socket.emit('terminal-sync', { files, fileContents });
        }, [socket, onSync]);

        // Resize terminal
        const fit = useCallback(() => {
                if (fitAddonRef.current) {
                        fitAddonRef.current.fit();
                }
        }, []);

        // Clear terminal
        const clear = useCallback(() => {
                if (xtermRef.current) {
                        xtermRef.current.clear();
                }
        }, []);

        return (
                <div className={`flex flex-col bg-[#1e1e2e] ${className}`}>
                        {/* Terminal header */}
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#181825] border-b border-[#313244]">
                                <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-medium text-[#cdd6f4] uppercase tracking-wider flex items-center gap-1.5">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="4 17 10 11 4 5" />
                                                        <line x1="12" y1="19" x2="20" y2="19" />
                                                </svg>
                                                Terminal
                                        </span>
                                        {isConnected && (
                                                <span className="text-[10px] text-green-400 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                                        Connected
                                                </span>
                                        )}
                                </div>
                                <div className="flex items-center gap-1">
                                        {!isConnected ? (
                                                <button
                                                        onClick={startTerminal}
                                                        className="px-2 py-0.5 text-[10px] bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                                                >
                                                        Start
                                                </button>
                                        ) : (
                                                <>
                                                        {!readOnly && (
                                                                <>
                                                                        <button
                                                                                onClick={syncFiles}
                                                                                className="p-1 hover:bg-[#313244] rounded text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
                                                                                title="Sync files to workspace"
                                                                        >
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                        <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                                                                                        <path d="M21 3v5h-5" />
                                                                                </svg>
                                                                        </button>
                                                                        <button
                                                                                onClick={() => {
                                                                                        if (socket) {
                                                                                                console.log('📂 Requesting workspace files from server...');
                                                                                                socket.emit('terminal-read-workspace');
                                                                                        }
                                                                                }}
                                                                                className="p-1 hover:bg-[#313244] rounded text-[#6c7086] hover:text-blue-400 transition-colors"
                                                                                title="Import files from workspace into editor"
                                                                        >
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                                                                        <polyline points="7 10 12 15 17 10" />
                                                                                        <line x1="12" y1="15" x2="12" y2="3" />
                                                                                </svg>
                                                                        </button>
                                                                </>
                                                        )}
                                                        <button
                                                                onClick={clear}
                                                                className="p-1 hover:bg-[#313244] rounded text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
                                                                title="Clear terminal"
                                                        >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                                        <line x1="9" y1="9" x2="15" y2="15" />
                                                                        <line x1="15" y1="9" x2="9" y2="15" />
                                                                </svg>
                                                        </button>
                                                        {!readOnly && (
                                                                <button
                                                                        onClick={killTerminal}
                                                                        className="p-1 hover:bg-red-500/20 rounded text-[#6c7086] hover:text-red-400 transition-colors"
                                                                        title="Kill terminal"
                                                                >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                                                <rect x="7" y="7" width="10" height="10" fill="currentColor" />
                                                                        </svg>
                                                                </button>
                                                        )}
                                                </>
                                        )}
                                </div>
                        </div>

                        {/* Terminal container */}
                        <div
                                ref={terminalRef}
                                className="flex-1 p-2"
                                style={{ minHeight: 0, overflow: 'hidden' }}
                        />
                </div>
        );
});

export default Terminal;
