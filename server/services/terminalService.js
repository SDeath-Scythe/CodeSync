/**
 * Terminal Service
 * Manages persistent terminal sessions using node-pty
 * SECURITY: Uses file-based sandbox script for reliable path restriction
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
 * Create a sanitized environment for the shell
 */
function createSafeEnv(workspacePath) {
        const safeEnv = { ...process.env };

        // Remove sensitive env vars
        const sensitiveVars = [
                'DATABASE_URL', 'JWT_SECRET', 'API_KEY', 'SECRET_KEY',
                'AWS_SECRET_ACCESS_KEY', 'GITHUB_CLIENT_SECRET', 'PRIVATE_KEY', 'PASSWORD'
        ];

        for (const key of Object.keys(safeEnv)) {
                if (sensitiveVars.some(s => key.toUpperCase().includes(s))) {
                        delete safeEnv[key];
                }
        }

        safeEnv.TERM = 'xterm-256color';
        safeEnv.COLORTERM = 'truecolor';
        safeEnv.CODESYNC_WORKSPACE = workspacePath;

        return safeEnv;
}

/**
 * Create sandbox profile script file in workspace
 */
function createSandboxProfile(workspacePath) {
        const profilePath = path.join(workspacePath, '.codesync_profile.ps1');

        // Write the sandbox profile to a file (avoids escaping issues)
        const profileContent = `
# CodeSync Sandbox Profile
# This file restricts navigation outside the workspace

$script:WorkspaceRoot = (Get-Item -LiteralPath $PWD.Path).FullName

function Test-InsideWorkspace {
    param([string]$TestPath)
    
    if (-not $TestPath) { return $true }
    
    try {
        # Handle relative paths
        if (-not [System.IO.Path]::IsPathRooted($TestPath)) {
            $TestPath = Join-Path $PWD.Path $TestPath
        }
        
        # Resolve to full path
        $resolved = [System.IO.Path]::GetFullPath($TestPath)
        
        # Get actual path if it exists (handles short names)
        if (Test-Path -LiteralPath $resolved -ErrorAction SilentlyContinue) {
            $resolved = (Get-Item -LiteralPath $resolved).FullName
        }
        
        # Check if inside workspace
        return $resolved.StartsWith($script:WorkspaceRoot, [System.StringComparison]::OrdinalIgnoreCase)
    } catch {
        return $false
    }
}

# Override Set-Location
function Set-Location {
    [CmdletBinding()]
    param(
        [Parameter(Position=0, ValueFromPipeline=$true)]
        [string]$Path
    )
    
    if (-not $Path) {
        Microsoft.PowerShell.Management\\Set-Location $script:WorkspaceRoot
        return
    }
    
    if (Test-InsideWorkspace $Path) {
        $target = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path $PWD.Path $Path }
        $resolved = [System.IO.Path]::GetFullPath($target)
        
        if (Test-Path -LiteralPath $resolved) {
            Microsoft.PowerShell.Management\\Set-Location $resolved
        } else {
            Write-Host "Path not found: $Path" -ForegroundColor Red
        }
    } else {
        Write-Host "Access denied: Cannot navigate outside project folder" -ForegroundColor Red
    }
}

# Custom prompt
function prompt {
    $current = $PWD.Path
    $relative = $current
    if ($current.StartsWith($script:WorkspaceRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relative = $current.Substring($script:WorkspaceRoot.Length)
        if (-not $relative) { $relative = "\\" }
    }
    Write-Host "[CodeSync]" -NoNewline -ForegroundColor Cyan
    Write-Host " .$relative" -NoNewline -ForegroundColor Yellow
    return " > "
}

# Welcome
Write-Host ""
Write-Host "[Sandbox Active] Project folder only" -ForegroundColor Green
Write-Host "Workspace: $script:WorkspaceRoot" -ForegroundColor DarkGray
Write-Host ""
`;

        fs.writeFileSync(profilePath, profileContent, 'utf-8');
        return profilePath;
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
        const syncItem = (item, currentPath) => {
                const itemPath = path.join(currentPath, item.name);

                if (item.type === 'folder') {
                        if (!fs.existsSync(itemPath)) {
                                fs.mkdirSync(itemPath, { recursive: true });
                        }
                        if (item.children) {
                                item.children.forEach(child => syncItem(child, itemPath));
                        }
                } else {
                        const content = fileContents[item.id] || '';
                        fs.writeFileSync(itemPath, content, 'utf-8');
                }
        };

        if (Array.isArray(files)) {
                files.forEach(item => syncItem(item, workspacePath));
        }

        return workspacePath;
}

/**
 * Create a new terminal session with sandbox
 * If a terminal already exists, return it instead of creating a new one
 */
export function createTerminal(sessionCode, userId, cols = 80, rows = 24) {
        const terminalId = `${sessionCode}-${userId}`;

        // Reuse existing terminal if it exists
        if (terminals.has(terminalId)) {
                const existing = terminals.get(terminalId);
                console.log(`🖥️ Reusing existing terminal: ${terminalId}`);
                // Just resize it if needed
                try {
                        existing.pty.resize(cols, rows);
                } catch (e) { }
                return existing;
        }

        const workspacePath = getWorkspaceDir(sessionCode, userId);
        const isWindows = os.platform() === 'win32';

        let shell, shellArgs;

        if (isWindows) {
                // Create sandbox profile file
                const profilePath = createSandboxProfile(workspacePath);

                shell = 'powershell.exe';
                // Load the profile file instead of inline script
                shellArgs = [
                        '-NoProfile',
                        '-NoLogo',
                        '-NoExit',
                        '-ExecutionPolicy', 'Bypass',
                        '-File', profilePath
                ];
        } else {
                shell = 'bash';
                shellArgs = ['--restricted'];
        }

        const ptyProcess = pty.spawn(shell, shellArgs, {
                name: 'xterm-256color',
                cols,
                rows,
                cwd: workspacePath,
                env: createSafeEnv(workspacePath)
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
        console.log(`🖥️ Terminal created: ${terminalId}`);
        console.log(`📁 Workspace: ${workspacePath}`);
        console.log(`🔒 Sandbox profile loaded`);

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
                } catch (e) { }
                terminals.delete(terminalId);
                console.log(`🖥️ Terminal killed: ${terminalId}`);
                return true;
        }
        return false;
}

/**
 * Execute a single command
 */
export function executeCode(workspacePath, command) {
        return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
                const program = parts[0];
                const args = parts.slice(1).map(arg => arg.replace(/^"|"$/g, ''));

                const child = spawn(program, args, {
                        cwd: workspacePath,
                        shell: true,
                        env: createSafeEnv(workspacePath)
                });

                let stdout = '';
                let stderr = '';

                child.stdout.on('data', data => { stdout += data.toString(); });
                child.stderr.on('data', data => { stderr += data.toString(); });

                child.on('close', code => {
                        resolve({
                                success: code === 0,
                                stdout,
                                stderr,
                                exitCode: code,
                                executionTime: Date.now() - startTime
                        });
                });

                child.on('error', reject);

                setTimeout(() => {
                        child.kill();
                        reject(new Error('Execution timed out (30s limit)'));
                }, 30000);
        });
}

/**
 * Clean up old workspaces
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
                                console.log(`🧹 Cleaned up: ${dir}`);
                        }
                });
        } catch (e) {
                console.error('Cleanup error:', e);
        }
}

export { WORKSPACE_BASE };
