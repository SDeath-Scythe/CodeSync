import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

const AuthCallback = () => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('Processing authentication...');
  const navigate = useNavigate();
  const { handleAuthCallback, user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const authUser = await handleAuthCallback();
        setStatus('success');
        setMessage(`Welcome, ${authUser.name}!`);
        toast.success('Signed In', `Welcome to CodeSync, ${authUser.name}!`);
        
        // Redirect to session hub after a short delay
        setTimeout(() => {
          navigate('/session', { replace: true });
        }, 1500);
        
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Authentication failed');
        toast.error('Sign In Failed', error.message);
        
        // Redirect to login after showing error
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    };

    processCallback();
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-8 shadow-2xl max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Signing you in...</h2>
            <p className="text-zinc-400 text-sm">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Success!</h2>
            <p className="text-zinc-400 text-sm">{message}</p>
            <p className="text-zinc-500 text-xs mt-4">Redirecting...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Authentication Failed</h2>
            <p className="text-zinc-400 text-sm">{message}</p>
            <p className="text-zinc-500 text-xs mt-4">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
