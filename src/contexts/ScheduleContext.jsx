import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchPreferences, savePreferences, completeOnboarding } from '../api/preferences';

const ScheduleContext = createContext();
const STORAGE_KEY = 'schedule.preferences.cache';
const PROMPT_KEY = 'schedule.prompt.cache';
const DEFAULT_PREFERENCES = null;

function loadFromStorage(key, defaultValue) {
  try {
    if (typeof window === 'undefined') return defaultValue;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (error) {
    console.warn(`Failed to read ${key} from storage`, error);
    return defaultValue;
  }
}

function saveToStorage(key, value) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to persist ${key} to storage`, error);
  }
}

export function ScheduleProvider({ children }) {
  const [preferences, setPreferences] = useState(() => loadFromStorage(STORAGE_KEY, DEFAULT_PREFERENCES));
  const [promptCache, setPromptCache] = useState(() => loadFromStorage(PROMPT_KEY, {}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const remote = await fetchPreferences();
      setPreferences((prev) => {
        if (remote) {
          saveToStorage(STORAGE_KEY, remote);
          return remote;
        }
        if (prev) {
          return prev;
        }
        saveToStorage(STORAGE_KEY, DEFAULT_PREFERENCES);
        return DEFAULT_PREFERENCES;
      });
    } catch (err) {
      console.error('Failed to load schedule preferences:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updatePreferences = useCallback(
    async (updates) => {
      const merged = {
        ...(preferences || { user_id: 'default' }),
        ...updates
      };

      try {
        const saved = await savePreferences(merged);
        const next = saved || merged;
        setPreferences(next);
        saveToStorage(STORAGE_KEY, next);
        return next;
      } catch (err) {
        console.error('Failed to save schedule preferences:', err);
        setError(err);
        throw err;
      }
    },
    [preferences]
  );

  const markOnboardingComplete = useCallback(async () => {
    try {
      const saved = await completeOnboarding();
      const next = saved || {
        ...(preferences || {}),
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString()
      };
      setPreferences(next);
      saveToStorage(STORAGE_KEY, next);
      return next;
    } catch (err) {
      console.error('Failed to mark onboarding complete:', err);
      setError(err);
      throw err;
    }
  }, [preferences]);

  const hasSeenPrompt = useCallback(
    (type, key) => {
      const cache = promptCache[type] || {};
      return Boolean(cache[key]);
    },
    [promptCache]
  );

  const markPromptSeen = useCallback((type, key) => {
    setPromptCache((prev) => {
      const next = {
        ...prev,
        [type]: {
          ...(prev[type] || {}),
          [key]: true
        }
      };
      saveToStorage(PROMPT_KEY, next);
      return next;
    });
  }, []);

  const resetPrompt = useCallback((type, key) => {
    setPromptCache((prev) => {
      if (!prev[type]?.[key]) return prev;
      const nextType = { ...prev[type] };
      delete nextType[key];
      const next = { ...prev, [type]: nextType };
      saveToStorage(PROMPT_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      preferences,
      loading,
      error,
      refresh,
      updatePreferences,
      markOnboardingComplete,
      hasSeenPrompt,
      markPromptSeen,
      resetPrompt
    }),
    [preferences, loading, error, refresh, updatePreferences, markOnboardingComplete, hasSeenPrompt, markPromptSeen, resetPrompt]
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) throw new Error('useSchedule must be used within ScheduleProvider');
  return context;
}


