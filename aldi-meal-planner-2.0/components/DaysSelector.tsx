
import React, { useState } from 'react';
import VoiceInput from './VoiceInput';

interface DaysSelectorProps {
  onSelect: (days: number) => void;
}

const DaysSelector: React.FC<DaysSelectorProps> = ({ onSelect }) => {
  const [days, setDays] = useState<number>(7);

  const handleVoiceInput = (text: string) => {
    const match = text.match(/\d+/);
    if (match) {
      const val = parseInt(match[0]);
      if (val >= 1 && val <= 14) {
        onSelect(val);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 gap-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="space-y-4 max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          How many days?
        </h1>
        <p className="text-lg text-stone-600">
          Select how many days of meals you need.
        </p>
      </div>

      <div className="flex flex-col gap-8 w-full max-w-xs">
        <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-md border border-stone-200">
          <button 
            onClick={() => setDays(d => Math.max(1, d - 1))}
            className="w-14 h-14 flex items-center justify-center rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Decrease days"
          >
            <span className="material-symbols-outlined" aria-hidden="true">remove</span>
          </button>
          
          <span className="text-4xl font-bold w-20 text-stone-900" aria-live="polite">
            {days}
          </span>

          <button 
            onClick={() => setDays(d => Math.min(14, d + 1))}
            className="w-14 h-14 flex items-center justify-center rounded-xl bg-primary/20 text-stone-900 hover:bg-primary/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Increase days"
          >
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
          </button>
        </div>

        <button
          onClick={() => onSelect(days)}
          className="w-full py-4 bg-primary hover:bg-primary-dark text-stone-900 font-bold text-xl rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-primary/50"
        >
          Start Planning
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-stone-400">
            <div className="h-px w-12 bg-stone-300"></div>
            <span className="text-xs font-semibold uppercase">Or</span>
            <div className="h-px w-12 bg-stone-300"></div>
          </div>
          <VoiceInput onTranscript={handleVoiceInput} label="Speak number of days" />
        </div>
      </div>
    </div>
  );
};

export default DaysSelector;
