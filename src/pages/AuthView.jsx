import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useSupabase } from '../contexts/SupabaseContext';
// Using favicon from public directory
const favicon48 = '/favicon-48x48.png';

// Google icon SVG
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

/**
 * AuthView Component
 * 
 * Sign in/Sign up page built from Figma design specifications.
 * Uses design tokens for typography, colors, and spacing.
 * Fully responsive layout.
 */
export function AuthView() {
  const navigate = useNavigate();
  const { user } = useSupabase();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Get the current origin (works for both dev and production)
      const redirectTo = `${window.location.origin}/`;
      
      // Verify Supabase is configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
      }

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        console.error('Google OAuth Error:', oauthError);
        throw oauthError;
      }

      // The redirect will happen automatically, but we can show a message
      if (data) {
        setMessage('Redirecting to Google...');
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      const errorMessage = err.message || 'Failed to sign in with Google. Please try again.';
      
      // Provide more helpful error messages
      if (errorMessage.includes('redirect_uri_mismatch')) {
        setError('Google OAuth configuration error. Please contact support or check Supabase settings.');
      } else if (errorMessage.includes('Supabase is not configured')) {
        setError('Application configuration error. Please check environment variables.');
      } else {
        setError(errorMessage);
      }
      
      setGoogleLoading(false);
    }
  };

  // Design tokens from Figma:
  // - Background: surface/page (#fafbfc)
  // - Header: surface/inverse (#1c1917) with padding-4xl (48px/3rem) x, padding-2xl (24px/1.5rem) y
  // - Header gap: padding/lg (12px/0.75rem)
  // - Header text gap: padding/md (8px/0.5rem)
  // - Title: text-5xl/font-semibold (48px, semibold, line-height 64px) - responsive
  // - Subtitle: text-2xl/font-medium (24px, medium, line-height 32px) - responsive
  // - Form width: 400px (responsive: full width on mobile, max 400px on larger screens)
  // - Form gap: padding-2xl (24px/1.5rem)
  // - Button: surface/secondary (#5cb4f3) - large, filled

  return (
    <div className="relative min-h-screen w-full bg-surface-page flex items-center justify-center p-4 md:p-6">
      <div className="flex flex-col items-center gap-12 w-full max-w-2xl">
        
        {/* Header Section - Matches Figma */}
        {/* Sign in: bg-surface-inverse (dark), Sign up: bg-surface-focus (blue) */}
        <div className={`flex flex-col sm:flex-row items-start gap-3 px-12 py-6 w-full ${
          isLogin ? 'bg-surface-inverse' : 'bg-surface-focus'
        }`}>
          {/* Favicon - 48x48 from Figma, displayed at 60px */}
          <img
            src={favicon48}
            alt="Aldi Meal Planner logo"
            className="h-[60px] w-[60px] shrink-0"
          />
          
          {/* Text Content - Responsive typography */}
          <div className="flex flex-col gap-2 text-text-inverse">
            <h1 className="text-style-text-3xl-semibold sm:text-style-text-4xl-semibold md:text-style-text-5xl-semibold">
              {isLogin ? 'Welcome Back' : 'Create your account'}
            </h1>
            <p className="text-style-text-xl-medium sm:text-style-text-2xl-medium">
              {isLogin 
                ? 'Log in to see you meal plan & grocery list' 
                : 'Start budget friendly meal planning today'}
            </p>
          </div>
        </div>

        {/* Form Section - Matches Figma */}
        <div className="w-full max-w-[400px] flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
            {error && (
              <div className="rounded border border-error/40 bg-error/10 px-4 py-3 text-sm font-medium text-error">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded border border-surface-primary/40 bg-surface-primary/10 px-4 py-3 text-sm font-medium text-text-body">
                {message}
              </div>
            )}

            {/* Email Input - Using Input component */}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user123@email.com"
              required
              disabled={loading}
              state={loading ? 'disabled' : 'default'}
            />

            {/* Password Input - Using Input component */}
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? 'Enter your password' : 'At least 6 characters'}
              required
              minLength={6}
              disabled={loading}
              state={loading ? 'disabled' : 'default'}
            />

            {/* Sign In Button - Using surface/secondary color from Figma */}
            <Button
              type="submit"
              variant="secondary"
              size="large"
              className="w-full"
              disabled={loading || googleLoading || !email || !password}
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 h-px bg-border-subtle"></div>
            <span className="text-sm font-medium text-text-subtle">or</span>
            <div className="flex-1 h-px bg-border-subtle"></div>
          </div>

          {/* Google Sign In Button */}
          <Button
            type="button"
            variant="outline"
            size="large"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            iconLeading={<GoogleIcon />}
            iconPosition="leading"
          >
            {googleLoading ? 'Connecting...' : isLogin ? 'Sign in with Google' : 'Sign up with Google'}
          </Button>

          {/* Sign Up/Sign In Toggle Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
              }}
              className="text-base font-medium text-text-body hover:text-text-primary transition-colors"
              disabled={loading || googleLoading}
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
