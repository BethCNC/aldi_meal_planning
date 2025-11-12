import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useSchedule } from '../contexts/ScheduleContext';
import { WEEK_DAYS, getDayName } from '../utils/days';

function DayButton({ label, selected, onClick }) {
  return (
    <button
      type="button"
      className={`px-4 py-2 border rounded-lg transition ${
        selected
          ? 'border-border-focus bg-surface-primary text-text-inverse'
          : 'border-border-subtle bg-surface-page text-text-body hover:bg-surface-card'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function SettingsView() {
  const navigate = useNavigate();
  const { preferences, loading, updatePreferences, refresh } = useSchedule();
  const [mealDay, setMealDay] = useState(1);
  const [groceryDay, setGroceryDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (preferences) {
      if (typeof preferences.meal_plan_day === 'number') setMealDay(preferences.meal_plan_day);
      if (typeof preferences.grocery_day === 'number') setGroceryDay(preferences.grocery_day);
    }
  }, [preferences]);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await updatePreferences({
        meal_plan_day: mealDay,
        grocery_day: groceryDay
      });
      setStatus('Preferences saved successfully.');
    } catch (error) {
      setStatus(error.message || 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
      refresh();
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-text-body mb-2">Settings</h1>
        <p className="text-icon-subtle">
          Update your weekly rhythm or restart onboarding any time.
        </p>
      </header>

      {loading && <p className="text-icon-subtle">Loading current settings...</p>}

      {status && (
        <div className="border border-border-subtle bg-surface-card px-4 py-3 rounded-lg text-text-body">
          {status}
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-text-body mb-2">Meal plan day</h2>
          <p className="text-icon-subtle mb-3">
            We’ll generate new recipes every {getDayName(mealDay)}.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {WEEK_DAYS.map((day, index) => (
              <DayButton
                key={`settings-meal-${day}`}
                label={day}
                selected={mealDay === index}
                onClick={() => setMealDay(index)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-text-body mb-2">Grocery shopping day</h2>
          <p className="text-icon-subtle mb-3">
            We’ll prompt you to review your pantry before shopping on {getDayName(groceryDay)}.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {WEEK_DAYS.map((day, index) => (
              <DayButton
                key={`settings-grocery-${day}`}
                label={day}
                selected={groceryDay === index}
                onClick={() => setGroceryDay(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
        <Button variant="ghost" onClick={() => navigate('/onboarding')}>
          Restart onboarding
        </Button>
      </footer>
    </div>
  );
}


