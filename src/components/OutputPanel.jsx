import React from 'react';

/**
 * OutputPanel Component
 * Displays code execution results (stdout, stderr, exit code)
 */
const OutputPanel = ({
        output,
        stderr,
        exitCode,
        executionTime,
        isLoading,
        language,
        onClear,
        onClose,
        className = ''
}) => {
        const hasError = stderr && stderr.trim().length > 0;
        const hasOutput = output && output.trim().length > 0;

        return (
                <div className={`flex flex-col bg-[#1e1e2e] ${className}`}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#181825] border-b border-[#313244]">
                                <div className="flex items-center gap-3">
                                        <span className="text-[11px] font-medium text-[#cdd6f4] uppercase tracking-wider flex items-center gap-1.5">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M5 3l14 9-14 9V3z" />
                                                </svg>
                                                Output
                                        </span>

                                        {isLoading && (
                                                <span className="flex items-center gap-1.5 text-[10px] text-yellow-400">
                                                        <span className="w-2 h-2 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                                                        Running...
                                                </span>
                                        )}

                                        {!isLoading && exitCode !== undefined && (
                                                <span className={`text-[10px] flex items-center gap-1 ${exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {exitCode === 0 ? (
                                                                <>
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                                <path d="M20 6L9 17l-5-5" />
                                                                        </svg>
                                                                        Success
                                                                </>
                                                        ) : (
                                                                <>
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                                <circle cx="12" cy="12" r="10" />
                                                                                <line x1="15" y1="9" x2="9" y2="15" />
                                                                                <line x1="9" y1="9" x2="15" y2="15" />
                                                                        </svg>
                                                                        Exit code: {exitCode}
                                                                </>
                                                        )}
                                                </span>
                                        )}

                                        {executionTime !== undefined && (
                                                <span className="text-[10px] text-[#6c7086]">
                                                        {executionTime}ms
                                                </span>
                                        )}

                                        {language && (
                                                <span className="text-[10px] text-[#89b4fa] bg-[#89b4fa]/10 px-1.5 py-0.5 rounded">
                                                        {language}
                                                </span>
                                        )}
                                </div>

                                <div className="flex items-center gap-1">
                                        <button
                                                onClick={onClear}
                                                className="p-1 hover:bg-[#313244] rounded text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
                                                title="Clear output"
                                        >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M3 6h18" />
                                                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                                                </svg>
                                        </button>
                                        {onClose && (
                                                <button
                                                        onClick={onClose}
                                                        className="p-1 hover:bg-[#313244] rounded text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
                                                        title="Close panel"
                                                >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                                <line x1="6" y1="6" x2="18" y2="18" />
                                                        </svg>
                                                </button>
                                        )}
                                </div>
                        </div>

                        {/* Output content */}
                        <div className="flex-1 overflow-auto p-3 font-mono text-[13px]" style={{ minHeight: '120px' }}>
                                {!hasOutput && !hasError && !isLoading && (
                                        <div className="text-[#6c7086] text-center py-4">
                                                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <polyline points="4 17 10 11 4 5" />
                                                        <line x1="12" y1="19" x2="20" y2="19" />
                                                </svg>
                                                Run your code to see output here
                                        </div>
                                )}

                                {/* Standard output */}
                                {hasOutput && (
                                        <pre className="text-[#cdd6f4] whitespace-pre-wrap break-words">
                                                {output}
                                        </pre>
                                )}

                                {/* Standard error */}
                                {hasError && (
                                        <div className="mt-2">
                                                <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <circle cx="12" cy="12" r="10" />
                                                                <line x1="12" y1="8" x2="12" y2="12" />
                                                                <line x1="12" y1="16" x2="12.01" y2="16" />
                                                        </svg>
                                                        stderr
                                                </div>
                                                <pre className="text-[#f38ba8] whitespace-pre-wrap break-words bg-[#f38ba8]/5 rounded p-2">
                                                        {stderr}
                                                </pre>
                                        </div>
                                )}

                                {/* Loading animation */}
                                {isLoading && (
                                        <div className="flex items-center gap-2 text-[#6c7086]">
                                                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                                                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.15s' }} />
                                                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                                                <span className="ml-2">Executing...</span>
                                        </div>
                                )}
                        </div>
                </div>
        );
};

export default OutputPanel;
