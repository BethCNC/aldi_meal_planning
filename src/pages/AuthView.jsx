import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useSupabase } from '../contexts/SupabaseContext';

export function AuthView() {
  const navigate = useNavigate();
  const { user } = useSupabase();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // If already logged in, redirect to home
  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        // Sign in
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (data.user) {
          navigate('/', { replace: true });
        }
      } else {
        // Sign up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          setMessage('Account created! Please check your email to verify your account.');
          // Optionally auto-sign in after signup
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 2000);
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-6 px-4 pb-24 pt-10">
      <div className="overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-surface-primary/85 via-surface-primary/75 to-surface-inverse/60 text-text-inverse shadow-lg">
        <div className="relative flex flex-col gap-4 px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-page/20">
              <span className="text-2xl">🍽️</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold leading-8">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="text-sm text-text-inverse/80">
                {isLogin ? 'Sign in to your meal planner' : 'Start planning budget-friendly meals'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-2xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-text-body">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-surface-primary/40 bg-surface-primary/10 px-4 py-3 text-sm text-text-body">
            {message}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold text-text-body">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full rounded-xl border border-border-subtle bg-surface-input px-4 py-3 text-sm text-text-body focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold text-text-body">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isLogin ? 'Enter your password' : 'At least 6 characters'}
            required
            minLength={6}
            className="w-full rounded-xl border border-border-subtle bg-surface-input px-4 py-3 text-sm text-text-body focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
            disabled={loading}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || !email || !password}
        >
          {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
            setMessage(null);
          }}
          className="text-sm text-text-body underline hover:text-surface-primary"
          disabled={loading}
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}

