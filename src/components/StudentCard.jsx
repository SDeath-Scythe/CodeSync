import React from 'react';
import { Maximize2, Eye, MessageCircle, Mic, MicOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import CodePreview from './CodePreview';

const StudentCard = ({ student, onClick, onViewCode, onMessage, onMute }) => {
        const statusConfig = {
                active: { color: 'emerald', label: 'Active', icon: null },
                typing: { color: 'blue', label: 'Typing', icon: null, animate: true },
                idle: { color: 'zinc', label: 'Idle', icon: null },
                error: { color: 'red', label: 'Error', icon: AlertCircle }
        };

        const status = statusConfig[student.status] || statusConfig.idle;

        const baseClass = student.enlarged
                ? "col-span-2 row-span-2 border-indigo-500/50 shadow-xl shadow-indigo-500/20 scale-[1.01] z-10"
                : "col-span-1 row-span-1 border-zinc-700/50 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10";

        return (
                <div
                        onClick={() => onClick(student.id)}
                        className={`
        relative rounded-xl border bg-zinc-900/80 backdrop-blur-sm
        flex flex-col overflow-hidden transition-all duration-300 cursor-pointer group
        ${baseClass}
      `}
                >
                        {/* Card Header */}
                        <div className={`h-10 flex items-center justify-between px-3 border-b ${student.enlarged ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
                                <div className="flex items-center gap-3">
                                        {/* Status Indicator */}
                                        <div className={`w-2.5 h-2.5 rounded-full bg-${status.color}-500 ${status.animate ? 'animate-pulse' : ''}`}
                                                style={{ backgroundColor: status.color === 'emerald' ? '#10b981' : status.color === 'blue' ? '#3b82f6' : status.color === 'red' ? '#ef4444' : '#71717a' }}
                                        />
                                        <span className="text-sm font-semibold text-zinc-200">
                                                {student.name.split("'")[0]}
                                        </span>
                                        {student.enlarged && (
                                                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full uppercase">
                                                        Focused
                                                </span>
                                        )}
                                </div>

                                {/* Quick Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                                className="p-1.5 hover:bg-zinc-700/50 rounded-lg transition-colors" 
                                                title="View Code"
                                                onClick={(e) => {
                                                        e.stopPropagation();
                                                        onViewCode?.(student);
                                                }}
                                        >
                                                <Eye className="w-3.5 h-3.5 text-zinc-400 hover:text-indigo-300" />
                                        </button>
                                        <button 
                                                className="p-1.5 hover:bg-zinc-700/50 rounded-lg transition-colors" 
                                                title="Message"
                                                onClick={(e) => {
                                                        e.stopPropagation();
                                                        onMessage?.(student);
                                                }}
                                        >
                                                <MessageCircle className="w-3.5 h-3.5 text-zinc-400 hover:text-indigo-300" />
                                        </button>
                                        <button 
                                                className="p-1.5 hover:bg-zinc-700/50 rounded-lg transition-colors" 
                                                title={student.muted ? "Unmute" : "Mute"}
                                                onClick={(e) => {
                                                        e.stopPropagation();
                                                        onMute?.(student);
                                                }}
                                        >
                                                {student.muted ? (
                                                        <MicOff className="w-3.5 h-3.5 text-red-400" />
                                                ) : (
                                                        <Mic className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" />
                                                )}
                                        </button>
                                </div>
                        </div>

                        {/* Code Area */}
                        <div className="flex-1 p-3 bg-zinc-950/50 relative min-h-[120px]">
                                <CodePreview code={student.code} />

                                {/* Status Overlay */}
                                {student.status === 'typing' && (
                                        <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 px-2.5 py-1.5 rounded-lg">
                                                <div className="flex gap-1">
                                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                                                </div>
                                                <span className="text-[10px] text-blue-300 font-medium">Typing...</span>
                                        </div>
                                )}

                                {student.status === 'error' && (
                                        <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-red-500/20 backdrop-blur-sm border border-red-500/30 px-2.5 py-1.5 rounded-lg">
                                                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                                <span className="text-[10px] text-red-300 font-medium">Syntax Error</span>
                                        </div>
                                )}
                        </div>

                        {/* Code Match Progress Bar */}
                        <div className="h-1.5 bg-zinc-800 relative group/progress">
                                <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                                        style={{ width: `${student.matchPercentage || 0}%` }}
                                />
                                {/* Tooltip on hover */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-600 px-2 py-1 rounded text-[10px] text-zinc-300 opacity-0 group-hover/progress:opacity-100 transition-opacity whitespace-nowrap pointer-events-none flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                                        {student.matchPercentage || 0}% match with teacher
                                </div>
                        </div>

                        {/* Hover Expand Prompt */}
                        {!student.enlarged && (
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-transparent to-transparent flex items-end justify-center pb-8 opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                                        <div className="bg-zinc-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs border border-zinc-600/50">
                                                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                                                <span>Click to focus</span>
                                        </div>
                                </div>
                        )}
                </div>
        );
};

export default StudentCard;