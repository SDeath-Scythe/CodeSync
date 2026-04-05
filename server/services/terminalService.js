/**
 * Terminal Service
 * Manages persistent terminal sessions using node-pty
 * SECURITY: Uses file-based sandbox script for reliable path restriction
 */

import pty from 'node-pty';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { spawn, execSync } from 'child_process';

// Store active terminal sessions
const terminals = new Map();

// Base directory for session workspaces
const WORKSPACE_BASE = path.join(os.tmpdir(), 'codesync-workspaces');

// Ensure workspace base exists
if (!fs.existsSync(WORKSPACE_BASE)) {
        fs.mkdirSync(WORKSPACE_BASE, { recursive: true });
}

/**
 * Get the latest PATH from the system registry (Windows)
 * This ensures newly installed tools are available even if the server
 * was started before they were installed.
 */
function getFreshPath() {
        if (os.platform() !== 'win32') return process.env.PATH || '';

        try {
                // Read the current Machine and User PATH from the registry
                const machinePath = execSync(
                        'powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable(\'Path\', \'Machine\')"',
                        { encoding: 'utf-8', timeout: 5000 }
                ).trim();

                const userPath = execSync(
                        'powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable(\'Path\', \'User\')"',
                        { encoding: 'utf-8', timeout: 5000 }
                ).trim();

                return `${machinePath};${userPath}`;
        } catch (err) {
                console.warn('⚠️ Could not refresh PATH, using process.env:', err.message);
                return process.env.Path || process.env.PATH || '';
        }
}

/**
 * Create a sanitized environment for the shell
 */
function createSafeEnv(workspacePath) {
        const safeEnv = { ...process.env };

        // Refresh PATH from system registry to pick up newly installed tools
        const freshPath = getFreshPath();
        safeEnv.Path = freshPath;
        safeEnv.PATH = freshPath;

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
 * Sync virtual files to the workspace directory (full replace)
 * Clears existing workspace contents first, then writes the editor files
 */
export function syncFilesToWorkspace(workspacePath, files, fileContents) {
        // Clean the workspace first - remove all existing files/folders
        if (fs.existsSync(workspacePath)) {
                const entries = fs.readdirSync(workspacePath);
                for (const entry of entries) {
                        const entryPath = path.join(workspacePath, entry);
                        fs.rmSync(entryPath, { recursive: true, force: true });
                }
        } else {
                fs.mkdirSync(workspacePath, { recursive: true });
        }

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

/**
 * Read workspace directory and convert to file structure format
 * Returns { files: [], fileContents: {} } matching the app's format
 */
export function readWorkspaceToFileStructure(workspacePath, options = {}) {
        const {
                maxDepth = 10,
                maxFiles = 200,
                maxFileSize = 100 * 1024, // 100KB per file max
                ignoredPatterns = [
                        'node_modules',
                        '.git',
                        '.codesync_profile.ps1',
                        'AppData',
                        'Microsoft',
                        '.cache',
                        '__pycache__',
                        '.next',
                        'dist',
                        'build',
                        '.vscode',
                        'coverage',
                        '.env',
                        '.DS_Store'
                ]
        } = options;

        const files = [];
        const fileContents = {};
        let fileCount = 0;

        // Helper to check if buffer is likely binary
        const isBinary = (buffer) => {
                // Check specifically for null bytes which break Postgres JSON
                for (let i = 0; i < Math.min(buffer.length, 512); i++) {
                        if (buffer[i] === 0) return true;
                }
                return false;
        };

        const getLanguageFromExt = (filename) => {
                const ext = path.extname(filename).toLowerCase().slice(1);
                const langMap = {
                        'js': 'javascript',
                        'jsx': 'javascript',
                        'ts': 'typescript',
                        'tsx': 'typescript',
                        'py': 'python',
                        'java': 'java',
                        'cpp': 'cpp',
                        'c': 'c',
                        'cs': 'csharp',
                        'go': 'go',
                        'rs': 'rust',
                        'rb': 'ruby',
                        'php': 'php',
                        'html': 'html',
                        'css': 'css',
                        'scss': 'scss',
                        'json': 'json',
                        'md': 'markdown',
                        'yaml': 'yaml',
                        'yml': 'yaml',
                        'xml': 'xml',
                        'sql': 'sql',
                        'sh': 'shell',
                        'bash': 'shell',
                        'ps1': 'powershell',
                        'txt': 'plaintext'
                };
                return langMap[ext] || 'plaintext';
        };

        const generateId = (itemPath, isFolder) => {
                const hash = itemPath.split('').reduce((a, b) => {
                        a = ((a << 5) - a) + b.charCodeAt(0);
                        return a & a;
                }, 0);
                return `${isFolder ? 'folder' : 'file'}-ws-${Math.abs(hash).toString(36)}`;
        };

        const readDir = (dirPath, depth = 0) => {
                if (depth > maxDepth || fileCount > maxFiles) return [];

                const items = [];

                try {
                        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

                        for (const entry of entries) {
                                if (fileCount > maxFiles) break;

                                // Skip ignored patterns
                                if (ignoredPatterns.some(pattern => entry.name === pattern || entry.name.startsWith('.'))) {
                                        continue;
                                }

                                // Skip compiled/binary file extensions
                                const binaryExts = ['.exe', '.o', '.obj', '.out', '.class', '.dll', '.so', '.a', '.lib', '.pdb', '.pyc'];
                                if (!entry.isDirectory() && binaryExts.some(ext => entry.name.toLowerCase().endsWith(ext))) {
                                        continue;
                                }

                                const fullPath = path.join(dirPath, entry.name);
                                const relativePath = path.relative(workspacePath, fullPath);
                                const id = generateId(relativePath, entry.isDirectory());

                                if (entry.isDirectory()) {
                                        const children = readDir(fullPath, depth + 1);
                                        items.push({
                                                id,
                                                name: entry.name,
                                                type: 'folder',
                                                isOpen: depth < 2, // Auto-expand first 2 levels
                                                children
                                        });
                                } else {
                                        fileCount++;
                                        const item = {
                                                id,
                                                name: entry.name,
                                                type: 'file',
                                                language: getLanguageFromExt(entry.name)
                                        };
                                        items.push(item);

                                        // Read file contents (limit size to prevent memory issues)
                                        // Read file contents (limit size to prevent memory issues)
                                        try {
                                                const stats = fs.statSync(fullPath);

                                                if (stats.size < maxFileSize) {
                                                        // Check for binary content (read first 512 bytes)
                                                        const fd = fs.openSync(fullPath, 'r');
                                                        const buffer = Buffer.alloc(512);
                                                        const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
                                                        fs.closeSync(fd);

                                                        if (isBinary(buffer.slice(0, bytesRead))) {
                                                                fileContents[id] = '// Binary file (not displayed)';
                                                        } else {
                                                                fileContents[id] = fs.readFileSync(fullPath, 'utf-8');
                                                        }
                                                } else {
                                                        fileContents[id] = `// File too large to load (${(stats.size / 1024).toFixed(1)} KB)`;
                                                }
                                        } catch (e) {
                                                fileContents[id] = `// Error reading file: ${e.message}`;
                                        }
                                }
                        }
                } catch (e) {
                        console.error(`Error reading directory ${dirPath}:`, e.message);
                }

                // Sort: folders first, then files, alphabetically
                return items.sort((a, b) => {
                        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                        return a.name.localeCompare(b.name);
                });
        };

        const result = readDir(workspacePath);

        return {
                files: result,
                fileContents,
                stats: {
                        totalFiles: fileCount,
                        totalFolders: result.filter(i => i.type === 'folder').length
                }
        };
}

export { WORKSPACE_BASE };
