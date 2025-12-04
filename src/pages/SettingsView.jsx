import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { DaySelectGrid } from '../components/schedule/DaySelectGrid';
import { useSchedule } from '../contexts/ScheduleContext';
import { getDayName } from '../utils/days';

const HERO_ICON = '/icons/icon%3Dsettings.png';

export function SettingsView() {
  const navigate = useNavigate();
  const { preferences, loading, updatePreferences, refresh } = useSchedule();
  const [mealDay, setMealDay] = useState(1);
  const [groceryDay, setGroceryDay] = useState(0);
  const [chickenBreastOnly, setChickenBreastOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (preferences) {
      if (typeof preferences.meal_plan_day === 'number') setMealDay(preferences.meal_plan_day);
      if (typeof preferences.grocery_day === 'number') setGroceryDay(preferences.grocery_day);
      
      // Load dietary restrictions
      if (preferences.dietary_restrictions) {
        try {
          const restrictions = typeof preferences.dietary_restrictions === 'string'
            ? JSON.parse(preferences.dietary_restrictions)
            : preferences.dietary_restrictions;
          setChickenBreastOnly(restrictions.chicken_breast_only || restrictions.no_dark_meat_chicken || false);
        } catch (e) {
          console.warn('Failed to parse dietary restrictions:', e);
        }
      }
    }
  }, [preferences]);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await updatePreferences({
        meal_plan_day: mealDay,
        grocery_day: groceryDay,
        dietary_restrictions: JSON.stringify({
          chicken_breast_only: chickenBreastOnly,
          no_dark_meat_chicken: chickenBreastOnly,
          notes: chickenBreastOnly ? 'Only use chicken breast, substitute dark meat with breast' : null
        })
      });
      setStatus({ type: 'success', message: 'Preferences saved successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Failed to save preferences. Please try again.' });
    } finally {
      setSaving(false);
      refresh();
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-4 px-4 py-10">
        <p className="text-sm text-text-body">Loading current settings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[430px] flex-col space-y-6 px-4 pb-24 pt-6">
      <div className="overflow-hidden rounded-3xl border border-border-subtle bg-surface-inverse text-text-inverse shadow-lg">
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-page/20">
            <img src={HERO_ICON} alt="" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-8">Settings</h1>
            <p className="text-sm text-text-inverse/80">
              Update your weekly rhythm or restart onboarding any time.
            </p>
          </div>
        </div>
      </div>

      {status && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status.type === 'error'
              ? 'border-error/40 bg-error/10 text-text-body'
              : 'border-border-focus bg-surface-primary/10 text-text-body'
          }`}
        >
          {status.message}
        </div>
      )}

      <section className="space-y-6">
        <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface-card px-4 py-5 shadow-sm">
          <h2 className="text-lg font-semibold text-text-body">Meal plan day</h2>
          <p className="text-sm text-icon-subtle">
            We’ll generate new recipes every {getDayName(mealDay)}.
          </p>
          <DaySelectGrid selectedIndex={mealDay} onSelect={setMealDay} />
        </div>

        <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface-card px-4 py-5 shadow-sm">
          <h2 className="text-lg font-semibold text-text-body">Grocery shopping day</h2>
          <p className="text-sm text-icon-subtle">
            We'll prompt you to review your pantry before shopping on {getDayName(groceryDay)}.
          </p>
          <DaySelectGrid selectedIndex={groceryDay} onSelect={setGroceryDay} />
        </div>

        <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface-card px-4 py-5 shadow-sm">
          <h2 className="text-lg font-semibold text-text-body">Dietary Preferences</h2>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={chickenBreastOnly}
                onChange={(e) => setChickenBreastOnly(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-border-subtle text-surface-primary focus:ring-2 focus:ring-border-focus"
              />
              <div>
                <p className="text-sm font-medium text-text-body">Chicken breast only</p>
                <p className="text-xs text-icon-subtle">
                  Only use chicken breast in recipes. Dark meat (thighs, drumsticks, wings) will be filtered out or substituted.
                </p>
              </div>
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border-subtle bg-surface-card px-4 py-5 shadow-sm">
        <h2 className="text-lg font-semibold text-text-body">Need to start over?</h2>
        <p className="text-sm text-icon-subtle">
          Restart onboarding to reset your schedule and pantry snapshot from scratch.
        </p>
        <Button variant="ghost" onClick={() => navigate('/onboarding')}>
          Restart onboarding
        </Button>
      </section>

      <footer className="flex items-center gap-3 border-t border-border-subtle pt-4">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </footer>
    </div>
  );
}


