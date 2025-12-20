import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { IconMessageChatbot, IconX, IconSend } from '@tabler/icons-react';
import { useSupabase } from '../../contexts/SupabaseContext';

export function AIChatAssistant() {
  const { session } = useSupabase(); // Need session for token
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', content: 'Hi! I can help you update your dietary preferences or answer cooking questions. What can I do for you?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-10) // Context window
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
      
      // If action occurred, maybe show a toast or small indicator?
      // For now the text reply covers it.
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', content: 'Sorry, I had trouble processing that. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
        aria-label="Open AI Assistant"
      >
        {isOpen ? <IconX size={28} /> : <IconMessageChatbot size={28} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-36 right-4 z-50 flex h-[500px] w-[350px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-page shadow-xl sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-subtle bg-surface-card px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <IconMessageChatbot size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-body">Chef's Assistant</h3>
                <p className="text-xs text-icon-subtle">Powered by Gemini</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-icon-subtle hover:text-text-body"
            >
              <IconX size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-page">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-none'
                      : 'bg-surface-card text-text-body border border-border-subtle rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex space-x-1 rounded-2xl bg-surface-card px-4 py-3 border border-border-subtle">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-icon-subtle"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-icon-subtle delay-75"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-icon-subtle delay-150"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border-subtle bg-surface-card p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-page px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-sm text-text-body placeholder:text-icon-subtle focus:outline-none"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="text-primary hover:text-primary/80 disabled:opacity-50"
              >
                <IconSend size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

