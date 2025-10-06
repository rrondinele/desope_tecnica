import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasValidSession, setHasValidSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const cleanUrlState = (fieldsToRemove = []) => {
      const remainingQuery = new URLSearchParams(window.location.search);
      fieldsToRemove.forEach((field) => remainingQuery.delete(field));
      const queryString = remainingQuery.toString();
      const cleanUrl = `${window.location.origin}${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
      window.history.replaceState({}, document.title, cleanUrl);
    };

    const prepareSession = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(window.location.search);
      const tokenHash = queryParams.get('token_hash') || queryParams.get('token');
      const recoveryType = hashParams.get('type') || queryParams.get('type');
      const hasAccessToken = hashParams.has('access_token');

      try {
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
          if (error) throw error;
          cleanUrlState(['token', 'token_hash', 'type']);
        } else if (recoveryType === 'recovery' && hasAccessToken) {
          const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (error) throw error;
          cleanUrlState();
        }

        const { data, error } = await supabase.auth.getSession();
        if (error || !data?.session) {
          throw error || new Error('Session not found');
        }

        if (!isMounted) return;
        setHasValidSession(true);
        setError('');
      } catch (err) {
        if (!isMounted) return;
        setHasValidSession(false);
        setError(err?.message || 'Unable to validate the reset link. Request a new email.');
      }
    };

    prepareSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (!hasValidSession) {
      setError('Password reset link is invalid or has expired. Request a new email.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must have at least 8 characters.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      setError('Error updating password: ' + error.message);
    } else {
      setMessage('Password updated successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="rounded-lg text-card-foreground relative max-w-md w-full overflow-hidden border-0 shadow-lg bg-white">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-900"></div>
        <div className="p-6 pt-12 pb-10 px-12 space-y-8">
          
          {/* Mensagens de erro e sucesso */}
          {error && <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 text-center">{error}</div>}
          {message && <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 text-center">{message}</div>}

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Set new password</h2>
            <p className="text-gray-600">Enter your new password for DesOpe</p>
          </div>
          <form onSubmit={handlePasswordReset} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="password">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="lucide lucide-lock absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    className="flex w-full rounded-md border px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 h-11 bg-gray-50/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400"
                    id="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || !hasValidSession}
                  />
                </div>
                <p className="text-xs text-gray-500">Must be at least 8 characters</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="lucide lucide-lock absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    className="flex w-full rounded-md border px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 h-11 bg-gray-50/50 border-gray-200 focus:border-gray-400 focus:ring-gray-400"
                    id="confirmPassword"
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading || !hasValidSession}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <button
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium shadow-sm"
                type="submit"
                disabled={loading || !hasValidSession}
              >
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
              <button
                type="button"
                className="w-full text-sm text-gray-600 hover:text-gray-700"
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                Back to login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
