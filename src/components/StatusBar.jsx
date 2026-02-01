import React from 'react';
import {
        GitBranch,
        RefreshCw,
        AlertCircle,
        AlertTriangle,
        Check,
        Bell,
        Wifi,
        Zap,
        Radio
} from 'lucide-react';

const StatusBar = ({
        branch = "main",
        line = 12,
        col = 45,
        language = "JavaScript React",
        isLive = true
}) => {
        return (
                <div className="h-7 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between px-4 text-[11px] select-none font-sans z-50 shadow-lg relative overflow-hidden">

                        {/* Animated shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />

                        {/* LEFT SECTION */}
                        <div className="flex items-center h-full gap-1 relative z-10">

                                {/* Live/Connection Indicator */}
                                {isLive && (
                                        <div className="flex items-center gap-1.5 px-2.5 h-5 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer transition-all mr-2">
                                                <div className="relative">
                                                        <Radio className="w-3 h-3 text-white" />
                                                        <div className="absolute inset-0 animate-ping">
                                                                <Radio className="w-3 h-3 text-white opacity-75" />
                                                        </div>
                                                </div>
                                                <span className="font-bold text-white">LIVE</span>
                                        </div>
                                )}

                                {/* Connection Status */}
                                <div className="flex items-center gap-1.5 px-2.5 h-5 bg-emerald-500/30 hover:bg-emerald-500/40 rounded-full cursor-pointer transition-all">
                                        <Wifi className="w-3 h-3" />
                                        <span className="font-semibold hidden sm:inline">Connected</span>
                                </div>

                                {/* Git Branch */}
                                <div className="flex items-center gap-1.5 hover:bg-white/10 px-2.5 h-5 cursor-pointer transition-colors rounded-full ml-1">
                                        <GitBranch className="w-3 h-3" />
                                        <span className="font-medium">{branch}</span>
                                        <RefreshCw className="w-3 h-3 opacity-70 hover:opacity-100 hover:rotate-180 transition-all" />
                                </div>

                                {/* Error/Warnings */}
                                <div className="flex items-center gap-2 px-2.5 h-5 hover:bg-white/10 cursor-pointer transition-colors rounded-full">
                                        <div className="flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                <span>0</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                <span>0</span>
                                        </div>
                                </div>
                        </div>

                        {/* RIGHT SECTION */}
                        <div className="flex items-center h-full gap-1 relative z-10">

                                {/* Cursor Position */}
                                <div className="hidden sm:flex hover:bg-white/10 px-2.5 h-5 items-center cursor-pointer transition-colors rounded-full font-mono">
                                        Ln {line}, Col {col}
                                </div>

                                {/* Indentation */}
                                <div className="hidden sm:flex hover:bg-white/10 px-2.5 h-5 items-center cursor-pointer transition-colors rounded-full">
                                        Spaces: 2
                                </div>

                                {/* Encoding */}
                                <div className="hidden md:flex hover:bg-white/10 px-2.5 h-5 items-center cursor-pointer transition-colors rounded-full">
                                        UTF-8
                                </div>

                                {/* Language Mode */}
                                <div className="hover:bg-white/10 px-2.5 h-5 flex items-center cursor-pointer transition-colors font-semibold rounded-full bg-white/10">
                                        <Zap className="w-3 h-3 mr-1" />
                                        {language}
                                </div>

                                {/* Prettier */}
                                <div className="hover:bg-white/10 px-2.5 h-5 flex items-center cursor-pointer transition-colors rounded-full">
                                        <Check className="w-3 h-3 text-emerald-300" />
                                        <span className="ml-1 hidden sm:inline">Prettier</span>
                                </div>

                                {/* Notifications */}
                                <div className="hover:bg-white/10 px-2 h-5 flex items-center cursor-pointer transition-colors rounded-full">
                                        <Bell className="w-3 h-3" />
                                </div>
                        </div>

                        <style>{`
                                @keyframes shimmer {
                                        100% { transform: translateX(100%); }
                                }
                        `}</style>
                </div>
        );
};

export default StatusBar;