import React, { useState, useEffect } from 'react';
import { Mic } from 'lucide-react'; // New import

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  label?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, label = "Voice input" }) => {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSupported(true);
    }
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();

    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  if (!supported) return null;

  return (
    <button
      onClick={startListening}
      aria-label={isListening ? "Listening..." : label}
      className={`p-4 rounded-full transition-all active:scale-95 flex items-center justify-center ${
        isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
      }`}
    >
      <Mic className="w-6 h-6" />
    </button>
  );
};

export default VoiceInput;
