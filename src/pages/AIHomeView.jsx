import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import { Button } from '../components/ui/Button';
import { IconSparkles, IconRobot, IconSend, IconCalendar, IconCurrencyDollar, IconChefHat, IconSearch } from '@tabler/icons-react';

/**
 * AI-Native Homepage - Makes LangChain agents the centerpiece
 * Natural language meal planning interface
 */
export function AIHomeView() {
  const navigate = useNavigate();
  const { session } = useSupabase();
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI meal planning assistant. Tell me what you need - I understand natural language like 'Plan from today through end of year' or 'Give me 5 dinners under $60'.",
      timestamp: new Date()
    }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [agents, setAgents] = useState({
    mealPlanner: { status: 'ready', lastAction: null, icon: '🍽️' },
    pricing: { status: 'ready', lastAction: null, icon: '💰' },
    recipeDiscovery: { status: 'ready', lastAction: null, icon: '🔍' },
    dateParsing: { status: 'ready', lastAction: null, icon: '📅' }
  });
  const [recentPlans, setRecentPlans] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadRecentPlans();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadRecentPlans = async () => {
    // TODO: Load from database
    setRecentPlans([]);
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    setConversation(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    setIsGenerating(true);

    // Simulate agent workflow
    try {
      // Step 1: Date parsing
      setAgents(prev => ({
        ...prev,
        dateParsing: { ...prev.dateParsing, status: 'working', lastAction: 'Parsing date range...' }
      }));

      await new Promise(resolve => setTimeout(resolve, 1000));

      setAgents(prev => ({
        ...prev,
        dateParsing: { ...prev.dateParsing, status: 'completed', lastAction: 'Parsed: Dec 20-31 (12 days)' },
        mealPlanner: { ...prev.mealPlanner, status: 'working', lastAction: 'Selecting recipes...' }
      }));

      // Step 2: Meal planning (call actual API)
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/ai/conversational-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userInput: userMessage,
          context: {
            userId: session.user.id,
            currentDate: new Date().toISOString().split('T')[0]
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate plan');
      }

      const data = await response.json();

      // Update agents
      setAgents({
        dateParsing: { status: 'ready', lastAction: `Parsed: ${data.interpretation?.humanReadable}`, icon: '📅' },
        mealPlanner: { status: 'ready', lastAction: `Generated ${data.plan?.meals?.length || 0} meals`, icon: '🍽️' },
        pricing: { status: 'ready', lastAction: `Calculated $${data.plan?.totalCost?.toFixed(2) || 0}`, icon: '💰' },
        recipeDiscovery: { status: 'ready', lastAction: 'Matched recipes to Aldi catalog', icon: '🔍' }
      });

      // Add AI response
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: data.summary || 'Plan generated successfully!',
        plan: data.plan,
        agentSteps: data.agentSteps,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error('Planning error:', error);
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again or rephrase your request.`,
        timestamp: new Date(),
        error: true
      }]);

      setAgents(prev => ({
        dateParsing: { status: 'ready', lastAction: null, icon: '📅' },
        mealPlanner: { status: 'ready', lastAction: null, icon: '🍽️' },
        pricing: { status: 'ready', lastAction: null, icon: '💰' },
        recipeDiscovery: { status: 'ready', lastAction: null, icon: '🔍' }
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
  };

  return (
    <div className="min-h-screen bg-surface-page pb-24">
      {/* Hero Section - AI Agent Interface */}
      <div className="bg-gradient-to-br from-primary/10 via-surface-card to-surface-page border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <IconSparkles size={32} />
            </div>
            <h1 className="text-3xl font-bold text-text-display mb-2">
              Your AI Meal Planning Assistant
            </h1>
            <p className="text-text-muted">
              Tell me what you need in plain English - I'll handle the rest
            </p>
          </div>

          {/* Main Input */}
          <div className="bg-surface-page rounded-2xl border-2 border-border-subtle p-4 shadow-lg mb-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <div className="flex items-center gap-3">
              <IconRobot className="text-icon-subtle flex-shrink-0" size={24} />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Plan from today through end of year..."
                className="flex-1 bg-transparent text-lg text-text-body placeholder:text-icon-subtle focus:outline-none"
                disabled={isGenerating}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isGenerating}
                size="lg"
                className="flex-shrink-0"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </span>
                ) : (
                  <>
                    <IconSend size={20} className="mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-2 justify-center">
            <QuickPromptChip
              icon={<IconCalendar size={16} />}
              label="Plan next 4 days"
              onClick={() => handleQuickPrompt("Plan next 4 days")}
            />
            <QuickPromptChip
              icon={<IconCurrencyDollar size={16} />}
              label="5 dinners under $50"
              onClick={() => handleQuickPrompt("Give me 5 dinners under $50")}
            />
            <QuickPromptChip
              icon={<IconChefHat size={16} />}
              label="Quick meals this week"
              onClick={() => handleQuickPrompt("I need quick meals for this week")}
            />
            <QuickPromptChip
              icon={<IconCalendar size={16} />}
              label="Through Christmas"
              onClick={() => handleQuickPrompt("Plan through Christmas")}
            />
          </div>
        </div>
      </div>

      {/* Agent Status Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <AgentCard
            name="Meal Planner"
            icon="🍽️"
            status={agents.mealPlanner.status}
            lastAction={agents.mealPlanner.lastAction}
          />
          <AgentCard
            name="Pricing Agent"
            icon="💰"
            status={agents.pricing.status}
            lastAction={agents.pricing.lastAction}
          />
          <AgentCard
            name="Recipe Discovery"
            icon="🔍"
            status={agents.recipeDiscovery.status}
            lastAction={agents.recipeDiscovery.lastAction}
          />
          <AgentCard
            name="Date Parser"
            icon="📅"
            status={agents.dateParsing.status}
            lastAction={agents.dateParsing.lastAction}
          />
        </div>

        {/* Conversation History */}
        <div className="bg-surface-card rounded-xl border border-border-subtle p-6 mb-8">
          <h2 className="text-xl font-semibold text-text-body mb-4 flex items-center gap-2">
            <IconRobot size={24} />
            Conversation
          </h2>

          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {conversation.map((message, index) => (
              <ConversationMessage key={index} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Recent Plans */}
        {recentPlans.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-text-body mb-4">
              Your Recent Plans
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentPlans.map((plan, index) => (
                <PlanCard key={index} plan={plan} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickPromptChip({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-card border border-border-subtle text-sm text-text-body hover:bg-surface-elevated hover:border-primary transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}

function AgentCard({ name, icon, status, lastAction }) {
  const statusColors = {
    ready: 'bg-green-100 text-green-700 border-green-300',
    working: 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse',
    pending: 'bg-gray-100 text-gray-700 border-gray-300',
    error: 'bg-red-100 text-red-700 border-red-300'
  };

  const statusLabels = {
    ready: 'Ready',
    working: 'Working...',
    pending: 'Waiting',
    error: 'Error'
  };

  return (
    <div className="bg-surface-card rounded-lg border border-border-subtle p-4 hover:shadow-md transition-shadow">
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="font-semibold text-text-body text-sm mb-2">{name}</h3>
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusColors[status]}`}>
        {status === 'working' && (
          <div className="w-2 h-2 bg-current rounded-full animate-ping" />
        )}
        {statusLabels[status]}
      </div>
      {lastAction && (
        <p className="text-xs text-text-muted mt-2 line-clamp-2">{lastAction}</p>
      )}
    </div>
  );
}

function ConversationMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-primary text-white rounded-br-none'
              : message.error
              ? 'bg-red-50 text-red-900 border border-red-200 rounded-bl-none'
              : 'bg-surface-elevated text-text-body border border-border-subtle rounded-bl-none'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>

          {/* Agent Steps */}
          {message.agentSteps && (
            <div className="mt-3 pt-3 border-t border-current/20 space-y-1">
              {message.agentSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-2 text-xs opacity-90">
                  <span>{step.icon || '▪'}</span>
                  <span>{step.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Plan Summary */}
          {message.plan && (
            <div className="mt-3 pt-3 border-t border-current/20">
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.location.href = '/weekly-plan'}
                >
                  View Full Plan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {/* TODO: Adjust budget */}}
                >
                  Adjust Budget
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-text-muted mt-1 px-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

function PlanCard({ plan }) {
  return (
    <div className="bg-surface-card rounded-lg border border-border-subtle p-4 hover:shadow-md transition-shadow cursor-pointer">
      <h3 className="font-semibold text-text-body mb-1">
        {plan.startDate} - {plan.endDate}
      </h3>
      <p className="text-sm text-text-muted mb-3">
        {plan.duration} days · {plan.mealCount} meals
      </p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-primary">
          ${plan.totalCost.toFixed(2)}
        </span>
        <Button size="sm" variant="secondary">View</Button>
      </div>
    </div>
  );
}
