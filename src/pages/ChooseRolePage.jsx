import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, Users, Sparkles, Zap, Loader2 } from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';

const ChooseRolePage = () => {
  const [loading, setLoading] = useState(false);
  const [hoveredRole, setHoveredRole] = useState(null);
  const [pendingRole, setPendingRole] = useState(null); // role awaiting confirmation
  const navigate = useNavigate();
  const toast = useToast();
  const { user, updateRole } = useAuth();

  const handleRoleClick = (role) => {
    setPendingRole(role);
  };

  const handleConfirm = async () => {
    if (!pendingRole) return;
    setLoading(true);
    try {
      await updateRole(pendingRole);
      toast.success('Role set!', `You're now a ${pendingRole}. Welcome to CodeSync!`);
      navigate('/session', { replace: true });
    } catch (err) {
      toast.error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Gradient Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="max-w-lg w-full relative z-10 animate-fade-in-up">
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-8 shadow-2xl text-center">
          
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-6 relative">
            <Code2 className="w-8 h-8 text-white" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-zinc-900">
              <Zap className="w-2 h-2 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome, {user?.name || 'there'}! 👋
          </h2>
          <p className="text-zinc-400 text-sm mb-8">
            How will you use CodeSync? Choose your role to get started.
          </p>

          {loading && (
            <div className="flex items-center justify-center gap-2 mb-6 text-indigo-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Setting up your account...</span>
            </div>
          )}

          {/* Role Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Student */}
            <button
              onClick={() => handleRoleClick('student')}
              onMouseEnter={() => setHoveredRole('student')}
              onMouseLeave={() => setHoveredRole(null)}
              disabled={loading}
              className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 group disabled:opacity-50 ${
                hoveredRole === 'student'
                  ? 'bg-indigo-600/15 border-indigo-500/60 scale-[1.02] shadow-xl shadow-indigo-500/10'
                  : 'bg-zinc-800/50 border-zinc-700/50 hover:border-indigo-500/30'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                hoveredRole === 'student'
                  ? 'bg-indigo-600 shadow-lg shadow-indigo-500/40'
                  : 'bg-zinc-700/50 group-hover:bg-indigo-600/30'
              }`}>
                <Users className={`w-7 h-7 transition-colors ${
                  hoveredRole === 'student' ? 'text-white' : 'text-indigo-400'
                }`} />
              </div>
              <div>
                <span className="text-lg font-bold text-white block">Student</span>
                <span className="text-[11px] text-zinc-500 leading-tight block mt-1">
                  Join sessions, follow along with teacher's code, and practice
                </span>
              </div>
            </button>

            {/* Teacher */}
            <button
              onClick={() => handleRoleClick('teacher')}
              onMouseEnter={() => setHoveredRole('teacher')}
              onMouseLeave={() => setHoveredRole(null)}
              disabled={loading}
              className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 group disabled:opacity-50 ${
                hoveredRole === 'teacher'
                  ? 'bg-purple-600/15 border-purple-500/60 scale-[1.02] shadow-xl shadow-purple-500/10'
                  : 'bg-zinc-800/50 border-zinc-700/50 hover:border-purple-500/30'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                hoveredRole === 'teacher'
                  ? 'bg-purple-600 shadow-lg shadow-purple-500/40'
                  : 'bg-zinc-700/50 group-hover:bg-purple-600/30'
              }`}>
                <Sparkles className={`w-7 h-7 transition-colors ${
                  hoveredRole === 'teacher' ? 'text-white' : 'text-purple-400'
                }`} />
              </div>
              <div>
                <span className="text-lg font-bold text-white block">Teacher</span>
                <span className="text-[11px] text-zinc-500 leading-tight block mt-1">
                  Create sessions, share code live, and monitor students
                </span>
              </div>
            </button>
          </div>

          <p className="text-[10px] text-zinc-600">
            You can change your role later in settings
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingRole && !loading && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-8 shadow-2xl max-w-sm w-full animate-fade-in-up text-center">
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${
              pendingRole === 'student'
                ? 'bg-indigo-600 shadow-lg shadow-indigo-500/30'
                : 'bg-purple-600 shadow-lg shadow-purple-500/30'
            }`}>
              {pendingRole === 'student'
                ? <Users className="w-7 h-7 text-white" />
                : <Sparkles className="w-7 h-7 text-white" />
              }
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Continue as {pendingRole === 'student' ? 'Student' : 'Teacher'}?
            </h3>
            <p className="text-zinc-400 text-sm mb-6">
              {pendingRole === 'student'
                ? "You'll be able to join sessions and follow along with your teacher's code."
                : "You'll be able to create sessions, share code live, and monitor your students."
              }
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setPendingRole(null)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl text-sm text-zinc-300 hover:text-white transition-all"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
                  pendingRole === 'student'
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25'
                    : 'bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/25'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChooseRolePage;
