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
  const [mode, setMode] = useState('main'); // 'main' | 'login'
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  
  const navigate = useNavigate();
  const toast = useToast();
  const { loginWithGitHub, loginWithGoogle, register, login } = useAuth();

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

  const handleGoogleLogin = () => {
    setLoading(true);
    toast.info('Authenticating', 'Redirecting to Google...');
    loginWithGoogle();
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        if (!email || !password) {
          throw new Error('Please enter email and password');
        }
        await login(email, password);
        toast.success('Welcome back!', 'Logged in successfully');
        navigate('/session');
      } else {
        // Register
        if (!name || !email || !password) {
          throw new Error('Please fill in all fields');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        await register(name, email, password, selectedRole);
        toast.success('Account created!', 'Welcome to CodeSync');
        navigate('/session');
      }
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
                
                <h2 className="text-2xl font-bold text-white mb-2">Get Started</h2>
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

                {/* OAuth Buttons */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={handleGitHubLogin}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98] group"
                  >
                    <Github className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Continue with GitHub
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-zinc-700" />
                  <span className="text-xs text-zinc-500">or</span>
                  <div className="flex-1 h-px bg-zinc-700" />
                </div>

                {/* Email Button */}
                <button
                  onClick={() => setMode('login')}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-indigo-500/25"
                >
                  <Mail className="w-5 h-5" />
                  Continue with Email
                </button>

                {/* Terms */}
                <p className="text-center text-[10px] text-zinc-500 mt-6">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login/Signup View
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="max-w-md w-full relative z-10 animate-fade-in-up">
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-8 shadow-2xl">
          
          <button
            onClick={() => setMode('main')}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-4">
              <Code2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              {isLogin ? 'Sign in to continue coding' : 'Start collaborating today'}
            </p>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {!isLogin && (
              <>
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

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                    I am a
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('student')}
                      className={`px-4 py-3 rounded-xl border font-medium transition-all ${
                        selectedRole === 'student'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      <Users className="w-5 h-5 mx-auto mb-1" />
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('teacher')}
                      className={`px-4 py-3 rounded-xl border font-medium transition-all ${
                        selectedRole === 'teacher'
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      <Sparkles className="w-5 h-5 mx-auto mb-1" />
                      Teacher
                    </button>
                  </div>
                </div>
              </>
            )}

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

            {isLogin && (
              <div className="text-right">
                <button type="button" className="text-sm text-indigo-400 hover:text-indigo-300">
                  Forgot password?
                </button>
              </div>
            )}

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
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-zinc-700" />
            <span className="text-xs text-zinc-500">or continue with</span>
            <div className="flex-1 h-px bg-zinc-700" />
          </div>

          {/* OAuth */}
          <div className="flex gap-3">
            <button
              onClick={handleGitHubLogin}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl transition-all"
            >
              <Github className="w-5 h-5" />
            </button>
            <button
              onClick={handleGoogleLogin}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>
          </div>

          {/* Toggle */}
          <p className="text-center text-sm text-zinc-400 mt-6">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
