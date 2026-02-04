/**
 * Terminal Service
 * Manages persistent terminal sessions using node-pty
 * Each session gets its own shell process with a working directory
 */

import pty from 'node-pty';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

// Store active terminal sessions
const terminals = new Map();

// Base directory for session workspaces
const WORKSPACE_BASE = path.join(os.tmpdir(), 'codesync-workspaces');

// Ensure workspace base exists
if (!fs.existsSync(WORKSPACE_BASE)) {
        fs.mkdirSync(WORKSPACE_BASE, { recursive: true });
}

/**
 * Get or create workspace directory for a session
 */
export function getWorkspaceDir(sessionCode, userId) {
        const workspaceId = `${sessionCode}-${userId}`;
        const workspacePath = path.join(WORKSPACE_BASE, workspaceId);

        if (!fs.existsSync(workspacePath)) {
                fs.mkdirSync(workspacePath, { recursive: true });
        }

        return workspacePath;
}

/**
 * Sync virtual files to the workspace directory
 */
export function syncFilesToWorkspace(workspacePath, files, fileContents) {
        // files is the tree structure, fileContents is { fileId: content }

        const syncItem = (item, currentPath) => {
                const itemPath = path.join(currentPath, item.name);

                if (item.type === 'folder') {
                        // Create directory
                        if (!fs.existsSync(itemPath)) {
                                fs.mkdirSync(itemPath, { recursive: true });
                        }
                        // Sync children
                        if (item.children) {
                                item.children.forEach(child => syncItem(child, itemPath));
                        }
                } else {
                        // Write file content
                        const content = fileContents[item.id] || '';
                        fs.writeFileSync(itemPath, content, 'utf-8');
                }
        };

        // Sync each root item
        if (Array.isArray(files)) {
                files.forEach(item => syncItem(item, workspacePath));
        }

        return workspacePath;
}

/**
 * Create a new terminal session
 */
export function createTerminal(sessionCode, userId, cols = 80, rows = 24) {
        const terminalId = `${sessionCode}-${userId}`;

        // Kill existing terminal if any
        if (terminals.has(terminalId)) {
                const existing = terminals.get(terminalId);
                try {
                        existing.pty.kill();
                } catch (e) {
                        // Ignore kill errors
                }
        }

        // Get workspace directory
        const workspacePath = getWorkspaceDir(sessionCode, userId);

        // Determine shell based on OS
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        const shellArgs = os.platform() === 'win32' ? [] : [];

        // Create PTY process
        const ptyProcess = pty.spawn(shell, shellArgs, {
                name: 'xterm-256color',
                cols: cols,
                rows: rows,
                cwd: workspacePath,
                env: {
                        ...process.env,
                        TERM: 'xterm-256color',
                        COLORTERM: 'truecolor'
                }
        });

        const terminal = {
                id: terminalId,
                pty: ptyProcess,
                sessionCode,
                userId,
                workspacePath,
                createdAt: Date.now()
        };

        terminals.set(terminalId, terminal);

        console.log(`🖥️ Terminal created: ${terminalId} in ${workspacePath}`);

        return terminal;
}

/**
 * Get an existing terminal
 */
export function getTerminal(sessionCode, userId) {
        const terminalId = `${sessionCode}-${userId}`;
        return terminals.get(terminalId);
}

/**
 * Write data to terminal
 */
export function writeToTerminal(sessionCode, userId, data) {
        const terminal = getTerminal(sessionCode, userId);
        if (terminal) {
                terminal.pty.write(data);
                return true;
        }
        return false;
}

/**
 * Resize terminal
 */
export function resizeTerminal(sessionCode, userId, cols, rows) {
        const terminal = getTerminal(sessionCode, userId);
        if (terminal) {
                terminal.pty.resize(cols, rows);
                return true;
        }
        return false;
}

/**
 * Kill a terminal session
 */
export function killTerminal(sessionCode, userId) {
        const terminalId = `${sessionCode}-${userId}`;
        const terminal = terminals.get(terminalId);

        if (terminal) {
                try {
                        terminal.pty.kill();
                } catch (e) {
                        // Ignore kill errors
                }
                terminals.delete(terminalId);
                console.log(`🖥️ Terminal killed: ${terminalId}`);
                return true;
        }
        return false;
}

/**
 * Execute a single command and return output (for "Run" button)
 */
export function executeCode(workspacePath, command) {
        return new Promise((resolve, reject) => {
                const startTime = Date.now();

                // Parse command into program and args
                const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
                const program = parts[0];
                const args = parts.slice(1).map(arg => arg.replace(/^"|"$/g, '')); // Remove quotes

                const child = spawn(program, args, {
                        cwd: workspacePath,
                        shell: true,
                        env: {
                                ...process.env,
                                TERM: 'xterm-256color'
                        }
                });

                let stdout = '';
                let stderr = '';

                child.stdout.on('data', data => {
                        stdout += data.toString();
                });

                child.stderr.on('data', data => {
                        stderr += data.toString();
                });

                child.on('close', code => {
                        resolve({
                                success: code === 0,
                                stdout,
                                stderr,
                                exitCode: code,
                                executionTime: Date.now() - startTime
                        });
                });

                child.on('error', err => {
                        reject(err);
                });

                // Timeout after 30 seconds
                setTimeout(() => {
                        child.kill();
                        reject(new Error('Execution timed out (30s limit)'));
                }, 30000);
        });
}

/**
 * Clean up old workspaces (call periodically)
 */
export function cleanupOldWorkspaces(maxAgeMs = 24 * 60 * 60 * 1000) {
        try {
                const dirs = fs.readdirSync(WORKSPACE_BASE);
                const now = Date.now();

                dirs.forEach(dir => {
                        const dirPath = path.join(WORKSPACE_BASE, dir);
                        const stats = fs.statSync(dirPath);

                        if (now - stats.mtimeMs > maxAgeMs) {
                                fs.rmSync(dirPath, { recursive: true, force: true });
                                console.log(`🧹 Cleaned up old workspace: ${dir}`);
                        }
                });
        } catch (e) {
                console.error('Cleanup error:', e);
        }
}

export { WORKSPACE_BASE };
