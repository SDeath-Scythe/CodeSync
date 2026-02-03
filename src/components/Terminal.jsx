import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

/**
 * Terminal Component
 * Interactive terminal using xterm.js with WebSocket connection to backend
 */
const Terminal = ({
        socket,
        sessionCode,
        onSync, // Function to get current files for syncing
        className = '',
        onReady
}) => {
        const terminalRef = useRef(null);
        const xtermRef = useRef(null);
        const fitAddonRef = useRef(null);
        const [isConnected, setIsConnected] = useState(false);
        const [workspacePath, setWorkspacePath] = useState('');

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

                // Welcome message
                term.writeln('\x1b[1;36m╭─────────────────────────────────────╮\x1b[0m');
                term.writeln('\x1b[1;36m│  \x1b[1;32mCodeSync Terminal\x1b[1;36m                 │\x1b[0m');
                term.writeln('\x1b[1;36m╰─────────────────────────────────────╯\x1b[0m');
                term.writeln('');
                term.writeln('\x1b[90mType commands below. Your files are synced automatically.\x1b[0m');
                term.writeln('');

                onReady?.(term);

                return () => {
                        window.removeEventListener('resize', handleResize);
                        term.dispose();
                        xtermRef.current = null;
                };
        }, []);

        // Socket event handlers
        useEffect(() => {
                if (!socket || !xtermRef.current) return;

                const term = xtermRef.current;

                // Handle terminal data from server
                const handleData = ({ data }) => {
                        term.write(data);
                };

                // Handle terminal started
                const handleStarted = ({ workspacePath }) => {
                        setIsConnected(true);
                        setWorkspacePath(workspacePath);
                        term.writeln(`\x1b[32m✓ Connected to workspace\x1b[0m`);
                        term.writeln(`\x1b[90m  ${workspacePath}\x1b[0m`);
                        term.writeln('');
                };

                // Handle terminal error
                const handleError = ({ message }) => {
                        term.writeln(`\x1b[31mError: ${message}\x1b[0m`);
                };

                // Handle terminal exit
                const handleExit = ({ exitCode }) => {
                        term.writeln(`\x1b[90mProcess exited with code ${exitCode}\x1b[0m`);
                        setIsConnected(false);
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

                socket.on('terminal-data', handleData);
                socket.on('terminal-started', handleStarted);
                socket.on('terminal-error', handleError);
                socket.on('terminal-exit', handleExit);
                socket.on('terminal-killed', handleKilled);
                socket.on('terminal-synced', handleSynced);

                return () => {
                        socket.off('terminal-data', handleData);
                        socket.off('terminal-started', handleStarted);
                        socket.off('terminal-error', handleError);
                        socket.off('terminal-exit', handleExit);
                        socket.off('terminal-killed', handleKilled);
                        socket.off('terminal-synced', handleSynced);
                };
        }, [socket]);

        // Handle terminal input
        useEffect(() => {
                if (!socket || !xtermRef.current || !isConnected) return;

                const term = xtermRef.current;

                // Send input to server
                const handleInput = term.onData((data) => {
                        socket.emit('terminal-input', { data });
                });

                return () => {
                        handleInput.dispose();
                };
        }, [socket, isConnected]);

        // Start terminal session
        const startTerminal = useCallback(() => {
                if (!socket || !xtermRef.current) return;

                const term = xtermRef.current;

                // Sync files first
                if (onSync) {
                        const { files, fileContents } = onSync();
                        socket.emit('terminal-sync', { files, fileContents });
                }

                // Start terminal
                socket.emit('terminal-start', {
                        cols: term.cols,
                        rows: term.rows
                });
        }, [socket, onSync]);

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
                                                                onClick={clear}
                                                                className="p-1 hover:bg-[#313244] rounded text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
                                                                title="Clear terminal"
                                                        >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                                        <line x1="9" y1="9" x2="15" y2="15" />
                                                                        <line x1="15" y1="9" x2="9" y2="15" />
                                                                </svg>
                                                        </button>
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
                                                </>
                                        )}
                                </div>
                        </div>

                        {/* Terminal container */}
                        <div
                                ref={terminalRef}
                                className="flex-1 p-2"
                                style={{ minHeight: '200px' }}
                        />
                </div>
        );
};

export default Terminal;
