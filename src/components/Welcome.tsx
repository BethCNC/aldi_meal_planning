// src/components/Welcome.tsx
import React from 'react';
import { AppStage } from '../types';
import { ArrowRight } from 'lucide-react'; // New import

interface WelcomeProps {
  setStage: (stage: AppStage) => void;
}

const Welcome: React.FC<WelcomeProps> = ({ setStage }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 gap-8">
      <div className="max-w-md space-y-4">
        <h1 className="text-5xl font-black tracking-tight text-stone-900">
          Meal planning, made simple.
        </h1>
        <p className="text-xl text-stone-600 font-medium">
          Let's create your stress-free Aldi meal plan in seconds.
        </p>
      </div>

      <button
        onClick={() => setStage(AppStage.AUTH)}
        className="px-10 py-5 bg-primary hover:bg-primary-dark text-stone-900 font-bold text-xl rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-8"
      >
        Get Started
        <ArrowRight className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Welcome;
