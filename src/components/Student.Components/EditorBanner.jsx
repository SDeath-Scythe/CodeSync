import React from 'react';
import { X, Users, Eye, Radio, Sparkles } from 'lucide-react';

const EditorBanner = ({ mode = "student", onClose }) => {
        const isTeacher = mode === 'teacher';

        return (
                <div className={`h-11 flex items-center justify-between px-4 text-white select-none shrink-0 relative overflow-hidden ${
                        isTeacher 
                                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600' 
                                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600'
                }`}>
                        {/* Animated background */}
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
                        
                        <div className="flex items-center gap-4 relative z-10">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        isTeacher ? 'bg-white/20' : 'bg-white/20'
                                }`}>
                                        {isTeacher ? <Radio className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </div>
                                <div>
                                        <span className="text-sm font-bold tracking-wide flex items-center gap-2">
                                                {isTeacher ? "Broadcasting Mode" : "Following Teacher"}
                                                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                                        </span>
                                        <span className="text-[10px] text-white/70 block -mt-0.5">
                                                {isTeacher
                                                        ? "Your code is being shared with 24 students"
                                                        : "You are viewing Mr. Davis's code in real-time"}
                                        </span>
                                </div>
                        </div>

                        <div className="flex items-center gap-3 relative z-10">
                                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold">
                                        <div className="relative">
                                                <div className="w-2 h-2 bg-white rounded-full" />
                                                <div className="w-2 h-2 bg-white rounded-full absolute inset-0 animate-ping" />
                                        </div>
                                        {isTeacher ? "LIVE" : "SYNCED"}
                                </div>

                                <button
                                        onClick={onClose}
                                        className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                                >
                                        <X className="w-4 h-4" />
                                </button>
                        </div>
                </div>
        );
};

export default EditorBanner;