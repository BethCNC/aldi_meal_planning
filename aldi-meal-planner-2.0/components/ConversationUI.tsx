
import React, { useState, useEffect } from 'react';

interface ConversationUIProps {
  days: number;
}

const ConversationUI: React.FC<ConversationUIProps> = ({ days }) => {
  const [messages, setMessages] = useState<string[]>([]);
  
  const stepMessages = [
    `Got it! Generating your ${days}-day meal plan...`,
    `I'm selecting recipes with good variety...`,
    `I'm balancing proteins across the week...`,
    `Calculating your Aldi shopping list...`,
    `Your meal plan is almost ready!`
  ];

  useEffect(() => {
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < stepMessages.length) {
        setMessages(prev => [...prev, stepMessages[currentIdx]]);
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [days]);

  return (
    <div className="flex flex-col p-6 gap-4 min-h-[50vh] max-w-md mx-auto">
      {messages.map((msg, i) => (
        <div 
          key={i} 
          className="bg-white border border-stone-100 p-4 rounded-2xl rounded-tl-none shadow-sm text-stone-800 animate-in fade-in slide-in-from-left-4 duration-500"
          role="status"
        >
          {msg}
        </div>
      ))}
      <div className="flex justify-center p-8">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    </div>
  );
};

export default ConversationUI;
