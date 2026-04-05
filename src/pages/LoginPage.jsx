import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Code2, 
  Github, 
  Mail, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Zap, 
  Users,
  Loader2,
  ArrowLeft,
  Video,
  Terminal,
  Share2
} from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [mode, setMode] = useState('main'); // 'main' | 'signup'
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const toast = useToast();
  const { loginWithGitHub, register, login } = useAuth();

  // DEV ONLY: Quick login for development - REMOVE BEFORE PRODUCTION
  const DEV_MODE = true; // Set to false for production
  
  const handleDevLogin = async (role) => {
    setLoading(true);
    try {
      // Try to login with dev accounts, if not exists, register
      const devEmail = role === 'teacher' ? 'dev.teacher@codesync.test' : 'dev.student@codesync.test';
      const devPassword = 'devpass123';
      const devName = role === 'teacher' ? 'Dev Teacher' : 'Dev Student';
      
      try {
        await login(devEmail, devPassword);
      } catch (e) {
        // Account doesn't exist, create it
        await register(devName, devEmail, devPassword, role);
      }
      
      toast.success('Dev Login', `Logged in as ${role}`);
      navigate(role === 'teacher' ? '/session' : '/session');
    } catch (err) {
      toast.error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    setLoading(true);
    toast.info('Authenticating', 'Redirecting to GitHub...');
    loginWithGitHub();
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Register (signup form only)
      if (!name || !email || !password) {
        throw new Error('Please fill in all fields');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      await register(name, email, password);
      toast.success('Account created!', 'Welcome to CodeSync');
      navigate('/choose-role');
    } catch (err) {
      setError(err.message);
      toast.error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };
  // Handle sign-in from main page (email+password only)
  const handleMainSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!email || !password) {
        throw new Error('Please enter email and password');
      }
      await login(email, password);
      toast.success('Welcome back!', 'Logged in successfully');
      navigate('/session');
    } catch (err) {
      setError(err.message);
      toast.error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Video, text: 'Real-time Video Calls', color: 'text-rose-400' },
    { icon: Terminal, text: 'Full Terminal Access', color: 'text-emerald-400' },
    { icon: Share2, text: 'Live Code Sharing', color: 'text-indigo-400' },
    { icon: Users, text: 'Team Collaboration', color: 'text-amber-400' },
  ];

  // Main landing view
  if (mode === 'main') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
        <AnimatedBackground />
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="max-w-6xl w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left: Branding & Features */}
            <div className="text-center lg:text-left animate-fade-in-up">
              {/* Logo */}
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-2xl shadow-indigo-500/40 mb-6 relative group hover:scale-110 transition-transform duration-300">
                <Code2 className="w-10 h-10 text-white" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-zinc-950">
                  <Zap className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 mb-4 tracking-tight">
                CodeSync
              </h1>
              
              <p className="text-zinc-400 text-lg lg:text-xl max-w-md mx-auto lg:mx-0 mb-8">
                Real-time collaborative coding for{' '}
                <span className="text-indigo-400 font-semibold">teaching</span>,{' '}
                <span className="text-purple-400 font-semibold">learning</span>, and{' '}
                <span className="text-emerald-400 font-semibold">interviews</span>
              </p>

              {/* Features */}
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto lg:mx-0">
                {features.map((feature, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-800/30 backdrop-blur-sm rounded-lg border border-zinc-700/50 animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <feature.icon className={`w-4 h-4 ${feature.color}`} />
                    <span className="text-xs text-zinc-300">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Auth Card */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-8 shadow-2xl max-w-md mx-auto">
                
                <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
                <p className="text-zinc-400 text-sm mb-6">Sign in to start collaborating</p>

                {/* DEV ONLY: Quick Login Buttons - REMOVE BEFORE PRODUCTION */}
                {DEV_MODE && (
                  <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <p className="text-amber-400 text-xs font-medium mb-3 flex items-center gap-2">
                      <Zap className="w-3 h-3" />
                      DEV MODE - Quick Login
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleDevLogin('student')}
                        disabled={loading}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <Users className="w-3 h-3" />
                        Student
                      </button>
                      <button
                        onClick={() => handleDevLogin('teacher')}
                        disabled={loading}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        Teacher
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Email + Password Sign In */}
                <form onSubmit={handleMainSignIn} className="space-y-3 mb-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all pr-12 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {error && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Sign In
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-zinc-700" />
                  <span className="text-xs text-zinc-500">or</span>
                  <div className="flex-1 h-px bg-zinc-700" />
                </div>

                {/* GitHub Login */}
                <button
                  onClick={handleGitHubLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98] group mb-4 text-sm"
                >
                  <Github className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  Continue with GitHub
                </button>

                {/* Sign Up link */}
                <div className="text-center pt-2 border-t border-zinc-700/50">
                  <p className="text-sm text-zinc-400 mt-3">
                    Don't have an account?{' '}
                    <button
                      onClick={() => { setMode('signup'); setError(''); }}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Create Account
                    </button>
                  </p>
                </div>

                {/* Terms */}
                <p className="text-center text-[10px] text-zinc-500 mt-4">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Signup View
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="max-w-md w-full relative z-10 animate-fade-in-up">
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-8 shadow-2xl">
          
          <button
            onClick={() => { setMode('main'); setError(''); }}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </button>

          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-4">
              <Code2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Create account</h2>
            <p className="text-zinc-400 text-sm mt-1">Start collaborating today</p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Back to sign in */}
          <p className="text-center text-sm text-zinc-400 mt-6">
            Already have an account?{' '}
            <button
              onClick={() => { setMode('main'); setError(''); }}
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
