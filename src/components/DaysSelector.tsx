import React, { useState } from 'react';
import VoiceInput from './VoiceInput';
import { Minus, Plus, Sparkles } from 'lucide-react'; // New import

interface DaysSelectorProps {
  onSelect: (days: number, budget: number | undefined) => void;
}

const DaysSelector: React.FC<DaysSelectorProps> = ({ onSelect }) => {
  const [days, setDays] = useState<number>(7);
  const [budget, setBudget] = useState<string>(''); // Budget as string for input

  const handleVoiceInput = (text: string) => {
    const match = text.match(/\d+/);
    if (match) {
      const val = parseInt(match[0]);
      if (val >= 1 && val <= 14) {
        onSelect(val, budget ? parseFloat(budget) : undefined);
      }
    }
  };

  const handleGeneratePlan = () => {
    onSelect(days, budget ? parseFloat(budget) : undefined);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 gap-8">
      <div className="space-y-4 max-w-sm">
        <h1 className="text-4xl font-extrabold tracking-tight text-stone-900">
          How many days?
        </h1>
        <p className="text-lg text-stone-600">
          Tell me how many days of Aldi meals you need. I'll handle the rest.
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-xs">
        <div className="flex items-center justify-between bg-white rounded-2xl p-2 shadow-sm border border-stone-200">
          <button 
            onClick={() => setDays(d => Math.max(1, d - 1))}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 transition-colors"
            aria-label="Decrease days"
          >
            <Minus className="w-6 h-6" />
          </button>
          
          <span className="text-3xl font-bold w-16" aria-live="polite">
            {days}
          </span>

          <button 
            onClick={() => setDays(d => Math.min(14, d + 1))}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 transition-colors"
            aria-label="Increase days"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* New Budget Input */}
        <div className="flex flex-col gap-2">
          <label htmlFor="budget-input" className="text-sm font-medium text-stone-500 uppercase tracking-widest text-left">
            Optional: Budget ($)
          </label>
          <input
            id="budget-input"
            type="number"
            placeholder="e.g., 75"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl border-4 border-stone-200 text-stone-900 font-medium text-lg focus:border-primary-dark focus:ring-0 outline-none transition-colors"
          />
        </div>

        <button
          onClick={handleGeneratePlan}
          className="w-full py-4 bg-primary hover:bg-primary-dark text-stone-900 font-bold text-xl rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          Generate Plan
          <Sparkles className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-stone-500 uppercase tracking-widest">Or use voice</p>
          <VoiceInput onTranscript={handleVoiceInput} label="Speak number of days" />
        </div>
      </div>
    </div>
  );
};

export default DaysSelector;
