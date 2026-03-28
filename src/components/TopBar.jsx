import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
        Code2,
        Menu,
        Zap,
        LayoutDashboard,
        Users,
        Camera
} from 'lucide-react';

const TopBar = ({
        appName = "CodeSync",
        sessionTitle = "Intro to React - Week 4: State Management",
        showDashboardButton = false,
        onMenuClick,
        // Participant count
        participantCount = 0,
        maxParticipants = 21,
        // Snapshot (teacher only)
        onCreateSnapshot,
        snapshotTimestamp
}) => {
        const [currentTime, setCurrentTime] = useState(new Date());
        const [snapshotFlash, setSnapshotFlash] = useState(false);
        const navigate = useNavigate();

        useEffect(() => {
                const timer = setInterval(() => {
                        setCurrentTime(new Date());
                }, 1000);
                return () => clearInterval(timer);
        }, []);

        const formattedTime = currentTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
        });

        const formatSnapshotTime = (iso) => {
                if (!iso) return null;
                const d = new Date(iso);
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        const handleSnapshot = () => {
                if (onCreateSnapshot) {
                        onCreateSnapshot();
                        setSnapshotFlash(true);
                        setTimeout(() => setSnapshotFlash(false), 600);
                }
        };

        return (
                <header className="h-14 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-700/50 flex items-center justify-between px-4 select-none text-zinc-300 font-sans relative shadow-lg z-50">
                        
                        {/* Subtle gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 via-transparent to-purple-600/5 pointer-events-none" />

                        {/* LEFT: Logo & Branding */}
                        <div className="flex items-center gap-4 shrink-0 z-10">
                                <button 
                                        onClick={onMenuClick}
                                        className="lg:hidden p-2 hover:bg-zinc-800 rounded-xl transition-all text-zinc-400 hover:text-white"
                                        aria-label="Toggle menu"
                                >
                                        <Menu className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
                                        <div className="relative">
                                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all group-hover:scale-105">
                                                        <Code2 className="text-white w-5 h-5" />
                                                </div>
                                                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-zinc-900">
                                                        <Zap className="w-1.5 h-1.5 text-white" />
                                                </div>
                                        </div>
                                        <div className="hidden sm:flex flex-col">
                                                <span className="font-bold text-lg tracking-tight text-white">
                                                        {appName}
                                                </span>
                                                <span className="text-[10px] text-zinc-500 -mt-0.5">Collaborative IDE</span>
                                        </div>
                                </div>
                        </div>

                        {/* CENTER: Session Title */}
                        <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
                                <div className="pointer-events-auto hidden md:flex items-center gap-3 px-5 py-2 bg-zinc-800/60 backdrop-blur-sm rounded-full border border-zinc-700/50 hover:border-indigo-500/30 transition-all cursor-pointer group max-w-lg">
                                        <div className="relative flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                                <div className="absolute w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                        </div>
                                        <span className="text-zinc-300 font-medium text-sm truncate group-hover:text-white transition-colors">
                                                {sessionTitle}
                                        </span>
                                        <span className="text-[10px] text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                                                Live
                                        </span>
                                </div>
                        </div>

                        {/* RIGHT: Utilities */}
                        <div className="flex items-center gap-2 shrink-0 z-10">

                                {/* Participant Count */}
                                {participantCount > 0 && (
                                        <div 
                                                className="flex items-center gap-2 text-xs font-medium bg-zinc-800/50 px-3 py-2 rounded-xl border border-zinc-700/50"
                                                title={`${participantCount} of ${maxParticipants} participants`}
                                        >
                                                <Users className="w-3.5 h-3.5 text-indigo-400" />
                                                <span className="tabular-nums text-zinc-300">
                                                        {participantCount}<span className="text-zinc-600">/{maxParticipants}</span>
                                                </span>
                                        </div>
                                )}

                                {/* Snapshot Button (teacher only) */}
                                {onCreateSnapshot && (
                                        <button
                                                onClick={handleSnapshot}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                                                        snapshotFlash
                                                                ? 'bg-emerald-500/30 border-emerald-500/50 text-emerald-300 scale-95'
                                                                : 'bg-indigo-600/15 hover:bg-indigo-600/30 border-indigo-500/30 text-indigo-300 hover:text-indigo-200'
                                                }`}
                                                title={snapshotTimestamp 
                                                        ? `Last snapshot: ${formatSnapshotTime(snapshotTimestamp)} — Click to update`
                                                        : 'Take a snapshot of your workspace for students to copy'}
                                        >
                                                <Camera className={`w-3.5 h-3.5 ${snapshotFlash ? 'animate-pulse' : ''}`} />
                                                <span className="hidden lg:inline">Snapshot</span>
                                                {snapshotTimestamp && (
                                                        <span className="text-[9px] text-zinc-500 font-normal hidden lg:inline">
                                                                {formatSnapshotTime(snapshotTimestamp)}
                                                        </span>
                                                )}
                                        </button>
                                )}

                                {/* Clock */}
                                <div className="hidden lg:flex items-center gap-2 text-sm font-medium text-zinc-400 bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-700/50">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        <span className="tabular-nums">{formattedTime}</span>
                                </div>

                                {/* Dashboard Button */}
                                {showDashboardButton && (
                                        <button 
                                                onClick={() => navigate('/dashboard')}
                                                className="p-2.5 hover:bg-zinc-800 rounded-xl transition-all text-zinc-400 hover:text-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10 flex items-center gap-2" 
                                                title="Go to Dashboard"
                                        >
                                                <LayoutDashboard className="w-4 h-4" />
                                                <span className="hidden lg:inline text-xs font-medium">Dashboard</span>
                                        </button>
                                )}
                        </div>
                </header>
        );
};

export default TopBar;