// src/components/Auth.tsx
import React, { useState } from 'react';
import { AppStage } from '../types';
import { useSupabase } from '../SupabaseProvider';
import { Mail, User } from 'lucide-react'; // New import

interface AuthProps {
  setStage: (stage: AppStage) => void;
}

const Auth: React.FC<AuthProps> = ({ setStage }) => {
  const { supabase } = useSupabase();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin, // Redirects back to the app after clicking magic link
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Check your email for a magic link to sign in!');
    }
    setLoading(false);
  };

  const handleGuestLogin = () => {
    // For now, guests proceed directly to onboarding intro.
    // In future, could generate a temporary anonymous user ID or session.
    setStage(AppStage.ONBOARDING_INTRO);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 gap-8">
      <div className="max-w-md space-y-4">
        <h2 className="text-4xl font-black tracking-tight text-stone-900">
          Your Personal Plan
        </h2>
        <p className="text-lg text-stone-600 font-medium">
          Sign in or create an account to save your preferences and plans.
        </p>
      </div>

      <form onSubmit={handleMagicLinkLogin} className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-6 py-4 rounded-2xl border-4 border-stone-200 text-stone-900 font-medium text-lg focus:border-primary-dark focus:ring-0 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xl rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {loading ? 'Sending link...' : 'Continue with Email'}
          {!loading && <Mail className="w-6 h-6" />}
        </button>
      </form>

      {message && <p className="text-primary-dark font-medium">{message}</p>}
      {error && <p className="text-red-500 font-medium">{error}</p>}

      <div className="relative w-full max-w-sm flex items-center py-4">
        <div className="flex-grow border-t-2 border-stone-200"></div>
        <span className="flex-shrink mx-4 text-stone-500 text-sm font-medium uppercase tracking-wider">Or</span>
        <div className="flex-grow border-t-2 border-stone-200"></div>
      </div>

      <button
        onClick={handleGuestLogin}
        className="w-full max-w-sm py-4 bg-white border-4 border-stone-200 text-stone-700 font-bold text-xl rounded-2xl shadow-sm hover:border-stone-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        Continue as Guest
        <User className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Auth;
