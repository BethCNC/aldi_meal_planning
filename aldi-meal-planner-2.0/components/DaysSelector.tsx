
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
            <span className="material-symbols-outlined">remove</span>
          </button>
          
          <span className="text-3xl font-bold w-16" aria-live="polite">
            {days}
          </span>

          <button 
            onClick={() => setDays(d => Math.min(14, d + 1))}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 transition-colors"
            aria-label="Increase days"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        <button
          onClick={() => onSelect(days)}
          className="w-full py-4 bg-primary hover:bg-primary-dark text-stone-900 font-bold text-xl rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          Generate Plan
          <span className="material-symbols-outlined">auto_awesome</span>
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
