import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
        Code2,
        Settings,
        Bell,
        Menu,
        ChevronDown,
        Search,
        Layout,
        Maximize2,
        LogOut,
        Moon,
        Sun,
        Zap
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from './ToastProvider';

const TopBar = ({
        appName = "CodeSync",
        sessionTitle = "Intro to React - Week 4: State Management",
        user = {
                name: "Mr. Davis",
                role: "Instructor",
                avatarUrl: "https://i.pravatar.cc/150?u=davis"
        },
        onMenuClick,
        onLayoutClick,
        onNotificationsClick,
        onProfileClick
}) => {
        const [currentTime, setCurrentTime] = useState(new Date());
        const [showProfileMenu, setShowProfileMenu] = useState(false);
        const { theme, toggleTheme } = useTheme();
        const toast = useToast();
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

        const handleThemeToggle = () => {
                toggleTheme();
                toast.success('Theme Changed', `Switched to ${theme === 'dark' ? 'light' : 'dark'} mode`);
        };

        const handleNotifications = () => {
                toast.info('Notifications', 'No new notifications');
        };

        const handleLogout = () => {
                toast.success('Signed Out', 'You have been signed out successfully');
                setTimeout(() => navigate('/'), 500);
        };

        const handleSettings = () => {
                toast.info('Settings', 'Settings panel coming soon!');
                setShowProfileMenu(false);
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

                        {/* RIGHT: Utilities & Profile */}
                        <div className="flex items-center gap-3 shrink-0 z-10">

                                {/* Clock */}
                                <div className="hidden lg:flex items-center gap-2 text-sm font-medium text-zinc-400 bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-700/50">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        <span className="tabular-nums">{formattedTime}</span>
                                </div>

                                {/* Action Icons */}
                                <div className="flex items-center gap-1 border-r border-zinc-700/50 pr-3 mr-1">
                                        <button 
                                                onClick={handleThemeToggle}
                                                className="p-2.5 hover:bg-zinc-800 rounded-xl transition-all text-zinc-400 hover:text-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10" 
                                                title="Toggle theme"
                                        >
                                                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                        </button>
                                        <button 
                                                onClick={onLayoutClick}
                                                className="p-2.5 hover:bg-zinc-800 rounded-xl transition-all text-zinc-400 hover:text-indigo-400" 
                                                title="Layout"
                                        >
                                                <Layout className="w-4 h-4" />
                                        </button>
                                        <button 
                                                onClick={handleNotifications}
                                                className="p-2.5 hover:bg-zinc-800 rounded-xl transition-all relative text-zinc-400 hover:text-indigo-400" 
                                                title="Notifications"
                                        >
                                                <Bell className="w-4 h-4" />
                                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-zinc-900" />
                                        </button>
                                </div>

                                {/* User Profile */}
                                <div className="relative">
                                        <div 
                                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                                className="flex items-center gap-3 cursor-pointer hover:bg-zinc-800/80 p-2 pr-3 rounded-xl transition-all group"
                                        >
                                                <div className="text-right hidden sm:block">
                                                        <div className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                                                                {user.name}
                                                        </div>
                                                        <div className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
                                                                {user.role}
                                                        </div>
                                                </div>

                                                <div className="relative">
                                                        <img
                                                                src={user.avatarUrl}
                                                                alt={user.name}
                                                                className="w-9 h-9 rounded-xl border-2 border-zinc-700 group-hover:border-indigo-500/50 object-cover transition-all"
                                                        />
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                                        </div>

                                        {/* Dropdown Menu */}
                                        {showProfileMenu && (
                                                <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl shadow-black/50 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <div className="px-4 py-3 border-b border-zinc-700/50">
                                                                <p className="text-sm font-semibold text-white">{user.name}</p>
                                                                <p className="text-xs text-zinc-500">{user.role}</p>
                                                        </div>
                                                        <button 
                                                                onClick={handleSettings}
                                                                className="w-full px-4 py-2.5 text-left text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 flex items-center gap-3 transition-colors"
                                                        >
                                                                <Settings className="w-4 h-4" />
                                                                Settings
                                                        </button>
                                                        <button 
                                                                onClick={handleLogout}
                                                                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                                                        >
                                                                <LogOut className="w-4 h-4" />
                                                                Sign Out
                                                        </button>
                                                </div>
                                        )}
                                </div>
                        </div>
                </header>
        );
};

export default TopBar;