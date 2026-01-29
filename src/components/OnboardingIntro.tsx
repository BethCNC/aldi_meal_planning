// src/components/OnboardingIntro.tsx
import React from 'react';
import { AppStage } from '../types';
import { CalendarDays, SlidersHorizontal, ReceiptText, ArrowRight } from 'lucide-react'; // New import

interface OnboardingIntroProps {
  setStage: (stage: AppStage) => void;
}

const OnboardingIntro: React.FC<OnboardingIntroProps> = ({ setStage }) => {
  return (
    <div className="flex flex-col items-center min-h-[70vh] p-6 gap-10">
      <div className="max-w-md space-y-4 text-center">
        <h2 className="text-4xl font-black tracking-tight text-stone-900">
          Your stress-free meal plan in 3 steps.
        </h2>
        <p className="text-lg text-stone-600 font-medium">
          I'll handle all the decisions for you.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-6 mt-8">
        <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border-2 border-stone-200">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <CalendarDays className="text-primary-dark w-7 h-7" />
          </div>
          <p className="font-bold text-lg text-stone-800">1. Tell me how many days.</p>
        </div>

        <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border-2 border-stone-200">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <SlidersHorizontal className="text-primary-dark w-7 h-7" />
          </div>
          <p className="font-bold text-lg text-stone-800">2. Briefly share your preferences.</p>
        </div>

        <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border-2 border-stone-200">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <ReceiptText className="text-primary-dark w-7 h-7" />
          </div>
          <p className="font-bold text-lg text-stone-800">3. Get your meal plan & grocery list!</p>
        </div>
      </div>

      <button
        onClick={() => setStage(AppStage.INPUT)}
        className="px-10 py-5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xl rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-8"
      >
        Let's Go!
        <ArrowRight className="w-6 h-6" />
      </button>
    </div>
  );
};

export default OnboardingIntro;
