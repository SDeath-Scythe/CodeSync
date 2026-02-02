import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Code2, 
  Users, 
  Plus, 
  LogIn, 
  ArrowRight, 
  Loader2,
  Sparkles,
  Zap,
  Copy,
  Check,
  BookOpen,
  Clock
} from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';

const SessionHub = () => {
  const [mode, setMode] = useState('main'); // 'main' | 'join' | 'create'
  const [sessionCode, setSessionCode] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdSession, setCreatedSession] = useState(null);
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();
  const { user, isTeacher, logout } = useAuth();

  const handleJoinSession = async (e) => {
    e.preventDefault();
    if (!sessionCode.trim()) {
      toast.error('Invalid Code', 'Please enter a valid session code');
      return;
    }

    setLoading(true);
    try {
      // TODO: Call API to join session
      toast.info('Joining', `Connecting to session ${sessionCode}...`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast.success('Connected!', 'You have joined the session');
      navigate('/classroom');
    } catch (err) {
      toast.error('Error', err.message || 'Failed to join session');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionName.trim()) {
      toast.error('Invalid Name', 'Please enter a session name');
      return;
    }

    setLoading(true);
    try {
      // TODO: Call API to create session
      toast.info('Creating', 'Setting up your session...');
      
      // Simulate API call - generate random code
      await new Promise(resolve => setTimeout(resolve, 800));
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
      code += '-';
      for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
      
      setCreatedSession({ name: sessionName, code });
      toast.success('Session Created!', `Your session code is ${code}`);
    } catch (err) {
      toast.error('Error', err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (createdSession?.code) {
      navigator.clipboard.writeText(createdSession.code);
      setCopied(true);
      toast.success('Copied!', 'Session code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const goToSession = () => {
    navigate('/editor');
  };

  // Main Hub View
  if (mode === 'main') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
        <AnimatedBackground />
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="max-w-4xl w-full relative z-10">
          {/* Header */}
          <div className="text-center mb-10 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl shadow-indigo-500/40 mb-4">
              <Code2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              Welcome, {user?.name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-zinc-400">
              {isTeacher ? 'Create a session or join an existing one' : 'Join a coding session to get started'}
            </p>
          </div>

          {/* Cards */}
          <div className={`grid ${isTeacher ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-md mx-auto'} gap-6 animate-fade-in-up`} style={{ animationDelay: '0.1s' }}>
            
            {/* Join Session Card */}
            <div 
              onClick={() => setMode('join')}
              className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-8 shadow-2xl cursor-pointer hover:border-indigo-500/50 hover:shadow-indigo-500/10 transition-all group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <LogIn className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Join Session</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Enter a session code to join an existing coding session
              </p>
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium group-hover:gap-3 transition-all">
                Enter Code <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Create Session Card - Only for Teachers */}
            {isTeacher && (
              <div 
                onClick={() => setMode('create')}
                className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-8 shadow-2xl cursor-pointer hover:border-purple-500/50 hover:shadow-purple-500/10 transition-all group"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Create Session</h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Start a new coding session and invite students to join
                </p>
                <div className="flex items-center gap-2 text-purple-400 text-sm font-medium group-hover:gap-3 transition-all">
                  Create New <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>

          {/* User Info & Logout */}
          <div className="mt-10 flex items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-800/50 rounded-full border border-zinc-700/50">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.[0] || 'U'}
                </div>
              )}
              <div className="text-sm">
                <div className="text-white font-medium">{user?.name}</div>
                <div className="text-zinc-500 text-xs flex items-center gap-1">
                  {isTeacher ? <Sparkles className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                  {isTeacher ? 'Teacher' : 'Student'}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Join Session View
  if (mode === 'join') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
        <AnimatedBackground />
        
        <div className="max-w-md w-full relative z-10 animate-fade-in-up">
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-8 shadow-2xl">
            
            <button
              onClick={() => setMode('main')}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
            >
              ← Back
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <LogIn className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Join Session</h2>
                <p className="text-zinc-400 text-sm">Enter the code from your teacher</p>
              </div>
            </div>

            <form onSubmit={handleJoinSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Session Code
                </label>
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  placeholder="ABC-123"
                  className="w-full px-4 py-4 bg-zinc-800 border border-zinc-600 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  maxLength={7}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!sessionCode.trim() || loading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Join Session
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Create Session View
  if (mode === 'create') {
    // Show created session result
    if (createdSession) {
      return (
        <div className="min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
          <AnimatedBackground />
          
          <div className="max-w-md w-full relative z-10 animate-fade-in-up">
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-8 shadow-2xl text-center">
              
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Session Created!</h2>
              <p className="text-zinc-400 text-sm mb-6">{createdSession.name}</p>

              <div className="mb-6">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Session Code</p>
                <div className="flex items-center justify-center gap-3">
                  <div className="text-4xl font-mono font-bold text-white tracking-widest">
                    {createdSession.code}
                  </div>
                  <button
                    onClick={copyCode}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    title="Copy code"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-zinc-500 text-sm mb-6">
                Share this code with your students so they can join
              </p>

              <div className="space-y-3">
                <button
                  onClick={goToSession}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2"
                >
                  Enter Session
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setCreatedSession(null); setSessionName(''); }}
                  className="w-full py-3 text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Create Another Session
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
        <AnimatedBackground />
        
        <div className="max-w-md w-full relative z-10 animate-fade-in-up">
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-8 shadow-2xl">
            
            <button
              onClick={() => setMode('main')}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
            >
              ← Back
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Create Session</h2>
                <p className="text-zinc-400 text-sm">Set up a new coding session</p>
              </div>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Session Name
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g., JavaScript Basics"
                  className="w-full px-4 py-3.5 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!sessionName.trim() || loading}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Create Session
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SessionHub;
