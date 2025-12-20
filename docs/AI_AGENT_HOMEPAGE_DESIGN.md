# AI Agent Homepage Design
## Making AI the Centerpiece of Your Agentic App

**Philosophy:** Since you're building an AI-native, LangChain-powered meal planning app, the AI agents should be **front and center** on the homepage - not hidden in a floating chat bubble.

---

## Current vs New Design

### Current Homepage
- Week-by-week calendar grid
- Recipe cards displayed
- Budget tracker
- **AI chat hidden in bottom-right floating bubble** (easy to miss)

### New AI-Native Homepage
- **Large AI conversation interface at top**
- Natural language input: "Plan from today through end of year"
- Agent status cards showing what each agent does
- Recent plans below (secondary)
- Makes it obvious this is an AI-powered app

---

## Design Mockup

```
┌─────────────────────────────────────────────────────────┐
│  🏠 Aldi Meal Planner                        [Profile]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │  🤖  Your AI Meal Planning Assistant              ││
│  │                                                    ││
│  │  ┌──────────────────────────────────────────────┐││
│  │  │ "Plan from today through end of year"        │││
│  │  │                                  [Generate]  │││
│  │  └──────────────────────────────────────────────┘││
│  │                                                    ││
│  │  💡 Try: "Plan next 4 days" | "5 dinners for    ││
│  │         $50" | "Quick meals this week"           ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  Active Agents:                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │ 🍽️ Meal    │  │ 💰 Pricing │  │ 🔍 Recipe  │       │
│  │   Planner  │  │   Agent    │  │   Discovery│       │
│  │            │  │            │  │            │       │
│  │ ✅ Ready   │  │ ✅ Ready   │  │ ✅ Ready   │       │
│  └────────────┘  └────────────┘  └────────────┘       │
│                                                          │
│  Recent Conversation:                                    │
│  ┌────────────────────────────────────────────────────┐│
│  │ You: "Plan from Dec 20 through end of year"       ││
│  │                                                    ││
│  │ AI:  "I'll plan 12 days (Dec 20-31) for $75.     ││
│  │      Suggesting 6 cooking days with leftovers..." ││
│  │                                                    ││
│  │      [View Full Plan] [Adjust Budget]            ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  Your Recent Plans:                                      │
│  ┌────────────────────┐  ┌────────────────────┐        │
│  │ Dec 20-31 (12 days)│  │ Dec 10-16 (7 days) │        │
│  │ 6 meals · $53.25   │  │ 4 meals · $48.00   │        │
│  │ [View] [Edit]      │  │ [View]             │        │
│  └────────────────────┘  └────────────────────┘        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
<HomePage>
  <AIAgentHero />
    <ConversationalInput />
    <QuickPrompts />
  <AgentStatusGrid />
    <AgentCard /> x4
  <ConversationHistory />
    <ConversationMessage /> xN
  <RecentPlans />
    <PlanCard /> xN
</HomePage>
```

---

## Key Features

### 1. Conversational Input (Large & Prominent)

**Natural language examples:**
- "Plan from today through end of year"
- "Give me 5 dinners for next week under $60"
- "I need quick meals for the next 4 days"
- "What can I make with chicken and rice?"

**Visual design:**
- Large text input (not tiny like chat)
- Clear CTA button: "Generate Plan" or "Ask AI"
- Shows examples/suggestions when empty
- Voice input option (future)

### 2. Agent Status Cards

Show what each agent does + current status:

```jsx
<AgentCard
  icon="🍽️"
  name="Meal Planning Agent"
  description="Generates flexible meal plans (4-30 days) based on your budget and preferences"
  status="ready" // ready | working | offline
  lastAction="Generated 12-day plan · 2 hours ago"
  capabilities={[
    "Flexible date ranges",
    "Budget optimization",
    "Variety tracking"
  ]}
/>
```

**Agents to show:**
1. **Meal Planning Agent** - Generates plans
2. **Pricing Agent** - Calculates accurate costs
3. **Recipe Discovery Agent** - Finds new recipes
4. **Ingredient Matching Agent** - Matches to Aldi catalog
5. **Date Parsing Agent** - Understands "through end of year"

### 3. Conversation Thread

Show recent AI interactions:

```jsx
<ConversationHistory>
  <Message role="user" timestamp="2 min ago">
    Plan from today through end of year
  </Message>

  <Message role="assistant" timestamp="Just now" streaming={false}>
    <AgentThinking>
      🔍 Parsing date range... (Dec 20-31, 12 days)
      💰 Calculating budget... ($75 total, ~$6.25/meal)
      🍽️ Selecting recipes... (6 cooking days suggested)
      ✅ Plan generated!
    </AgentThinking>

    <PlanSummary>
      Planning 12 days (Dec 20-31) for $75 budget.

      I suggest cooking 6 times:
      - Dec 20: Chicken Stir Fry ($8.50)
      - Dec 22: Beef Tacos ($10.25)
      ...

      Total: $53.25
      Remaining: $21.75
    </PlanSummary>

    <ActionButtons>
      <Button>View Full Plan</Button>
      <Button variant="secondary">Adjust Budget</Button>
      <Button variant="ghost">Try Different Dates</Button>
    </ActionButtons>
  </Message>
</ConversationHistory>
```

### 4. Agent Status Indicators

Show real-time agent activity:

```jsx
// When generating plan:
<AgentStatus>
  <Step status="completed">Date Parsing Agent · Parsed "today through end of year"</Step>
  <Step status="in-progress">Meal Planning Agent · Selecting recipes...</Step>
  <Step status="pending">Cost Calculation Agent · Waiting...</Step>
  <Step status="pending">Grocery Optimizer · Waiting...</Step>
</AgentStatus>
```

### 5. Quick Actions

Pre-written prompts users can click:

```jsx
<QuickPrompts>
  <PromptChip onClick={() => runPrompt("Plan next 4 days")}>
    📅 Plan next 4 days
  </PromptChip>

  <PromptChip onClick={() => runPrompt("5 dinners under $50")}>
    💰 5 dinners under $50
  </PromptChip>

  <PromptChip onClick={() => runPrompt("Quick meals this week")}>
    ⚡ Quick meals this week
  </PromptChip>

  <PromptChip onClick={() => runPrompt("Through Christmas")}>
    🎄 Through Christmas
  </PromptChip>
</QuickPrompts>
```

---

## Implementation

### Component Files to Create

1. **`src/pages/AIHomeView.jsx`** - New AI-centric homepage
2. **`src/components/ai/AIAgentHero.jsx`** - Main hero section
3. **`src/components/ai/ConversationalInput.jsx`** - Large input field
4. **`src/components/ai/AgentStatusGrid.jsx`** - Agent status cards
5. **`src/components/ai/AgentCard.jsx`** - Individual agent card
6. **`src/components/ai/ConversationHistory.jsx`** - Chat thread
7. **`src/components/ai/ConversationMessage.jsx`** - Single message
8. **`src/components/ai/AgentThinking.jsx`** - Thinking indicator
9. **`src/components/ai/QuickPrompts.jsx`** - Pre-written prompts
10. **`src/components/ai/RecentPlans.jsx`** - Past plans grid

### API Endpoints Needed

```javascript
// Natural language planning
POST /api/ai/conversational-plan
{
  userInput: "Plan from today through end of year",
  context: { userId, currentDate, preferences }
}

Response:
{
  interpretation: {
    startDate: "2025-12-20",
    endDate: "2025-12-31",
    duration: 12,
    humanReadable: "12 days (Dec 20-31)"
  },
  plan: { ... },
  agentSteps: [
    { agent: "Date Parser", status: "completed", message: "..." },
    { agent: "Meal Planner", status: "completed", message: "..." }
  ]
}
```

### State Management

```javascript
const [conversation, setConversation] = useState([]);
const [agents, setAgents] = useState({
  mealPlanner: { status: 'ready', lastAction: null },
  pricing: { status: 'ready', lastAction: null },
  recipeDiscovery: { status: 'ready', lastAction: null },
  dateParser: { status: 'ready', lastAction: null }
});
const [currentPlan, setCurrentPlan] = useState(null);
const [isGenerating, setIsGenerating] = useState(false);

const handleUserInput = async (userInput) => {
  // Add user message to conversation
  setConversation(prev => [...prev, { role: 'user', content: userInput }]);

  // Set agents to working
  setIsGenerating(true);
  setAgents(prev => ({
    ...prev,
    dateParser: { status: 'working', lastAction: 'Parsing date range...' },
    mealPlanner: { status: 'pending', lastAction: null }
  }));

  // Call API
  const response = await fetch('/api/ai/conversational-plan', {
    method: 'POST',
    body: JSON.stringify({ userInput })
  });

  const data = await response.json();

  // Update conversation with AI response
  setConversation(prev => [...prev, {
    role: 'assistant',
    content: data.summary,
    plan: data.plan,
    agentSteps: data.agentSteps
  }]);

  // Update agent statuses
  setAgents({
    mealPlanner: { status: 'ready', lastAction: `Generated ${data.plan.duration}-day plan` },
    pricing: { status: 'ready', lastAction: `Calculated $${data.plan.totalCost}` },
    // ...
  });

  setIsGenerating(false);
  setCurrentPlan(data.plan);
};
```

---

## Visual Design System

### Colors & Icons

**Agent Icons:**
- 🍽️ Meal Planning Agent
- 💰 Pricing Agent
- 🔍 Recipe Discovery Agent
- 🛒 Grocery Optimizer
- 🗓️ Date Parser Agent
- 🥘 Ingredient Matcher

**Status Colors:**
- **Ready:** Green (#10B981)
- **Working:** Blue (#3B82F6) + animation
- **Pending:** Gray (#6B7280)
- **Error:** Red (#EF4444)

**Message Styling:**
- User messages: Right-aligned, primary color background
- AI messages: Left-aligned, card background
- Thinking steps: Subtle gray, slightly indented
- Action buttons: Prominent, easy to tap

### Responsive Design

**Desktop (>1024px):**
- 3-column agent grid
- Side-by-side conversation + plan preview
- Full-width input with large text

**Tablet (768-1024px):**
- 2-column agent grid
- Stacked conversation → plan
- Medium input size

**Mobile (<768px):**
- 1-column everything
- Scrollable conversation
- Fixed bottom input bar (like chat apps)

---

## Interactions & Animations

### 1. **Streaming Responses**

Show AI thinking in real-time:

```jsx
<Message role="assistant" streaming={true}>
  <AgentThinking>
    🔍 Date Parser: Dec 20-31 (12 days) <AnimatedDots />
  </AgentThinking>
</Message>

// Updates to:
<Message role="assistant" streaming={true}>
  <AgentThinking>
    ✅ Date Parser: Dec 20-31 (12 days)
    🍽️ Meal Planner: Selecting recipes <AnimatedDots />
  </AgentThinking>
</Message>
```

### 2. **Agent Cards Pulse**

When agent is working, card pulses/glows:

```css
.agent-card-working {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
```

### 3. **Smooth Scroll to New Messages**

Auto-scroll conversation as AI responds:

```javascript
useEffect(() => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [conversation]);
```

### 4. **Input Suggestions**

Show dynamic suggestions as user types:

```jsx
<InputSuggestions visible={input.length > 3}>
  <Suggestion>Plan from {input} through end of year</Suggestion>
  <Suggestion>{input} dinners under $50</Suggestion>
</InputSuggestions>
```

---

## Example User Flow

### Flow 1: First-time User

1. User lands on homepage
2. Sees large "Your AI Meal Planning Assistant" section
3. Placeholder text: "Try: Plan next 4 days | 5 dinners for $50"
4. Clicks quick prompt: "📅 Plan next 4 days"
5. AI responds:
   ```
   🔍 Parsing dates... (Dec 21-24, 4 days)
   💰 Budget: Using your default $75/week → $43 for 4 days
   🍽️ Selecting recipes...
   ✅ Plan generated!

   4-day plan (Dec 21-24) for ~$43:
   - Dec 21: Chicken Stir Fry ($8.50)
   - Dec 22: Beef Tacos ($10.25)
   - Dec 23: Pasta Primavera ($6.75)
   - Dec 24: Salmon ($11.50)

   Total: $37.00 (under budget!)

   [View Full Plan] [Adjust]
   ```
6. User clicks "View Full Plan" → navigates to meal plan view
7. User returns to homepage → conversation preserved

### Flow 2: Power User

1. User types: "I need 10 dinners for the next 2 weeks under $100, avoiding chicken"
2. AI parses:
   ```
   📅 Date range: Dec 21 - Jan 3 (14 days)
   💰 Budget: $100 total (~$10/meal for 10 cooking days)
   🚫 Avoiding: Chicken
   🍽️ Generating 10 recipes from Beef, Pork, Seafood, Vegetarian categories...
   ```
3. Shows detailed breakdown
4. User adjusts: "Actually make it $80"
5. AI regenerates without re-asking all details (context-aware)

---

## Future Enhancements

### Phase 2 Features

1. **Voice Input** - "Hey AI, plan dinner for tonight"
2. **Multi-turn Conversations** - AI asks clarifying questions
3. **Visual Plan Preview** - Inline calendar in conversation
4. **Smart Suggestions** - "You usually cook 4 times/week, want that?"
5. **Agent Collaboration Visualizer** - Graph showing agents working together
6. **Undo/Redo** - "Go back to previous plan"
7. **Plan Comparison** - "Show me a $50 plan vs $75 plan"
8. **Natural Language Editing** - "Swap Monday's meal with something vegetarian"

---

## Technical Implementation Notes

### Server-Sent Events (SSE) for Streaming

```javascript
// Backend: Stream agent progress
app.post('/api/ai/conversational-plan-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');

  // Parse dates
  res.write(`data: ${JSON.stringify({ agent: 'Date Parser', status: 'working' })}\n\n`);
  const dates = await dateParsingAgent.parse(input);
  res.write(`data: ${JSON.stringify({ agent: 'Date Parser', status: 'completed', result: dates })}\n\n`);

  // Generate plan
  res.write(`data: ${JSON.stringify({ agent: 'Meal Planner', status: 'working' })}\n\n`);
  const plan = await mealPlanningAgent.generate(dates);
  res.write(`data: ${JSON.stringify({ agent: 'Meal Planner', status: 'completed', result: plan })}\n\n`);

  res.write('data: [DONE]\n\n');
  res.end();
});

// Frontend: Listen to stream
const eventSource = new EventSource('/api/ai/conversational-plan-stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateAgentStatus(data);
};
```

---

## Summary

### What You Get

**Before:** Hidden chat bubble in corner, feels like afterthought
**After:** AI is the star of the show, clear value proposition

**User sees immediately:**
- "This is an AI-powered meal planning app"
- "I can just tell it what I want in plain English"
- "Multiple specialized agents working for me"
- "Real-time progress of what's happening"

**Technical benefits:**
- LangChain agents showcased prominently
- Natural language interface (no rigid forms)
- Flexible date ranges built-in
- Conversational history preserved
- Agent status transparency

---

## Next Steps

1. **Create components** - Build React components listed above
2. **API endpoints** - Implement conversational planning API
3. **Streaming** - Add SSE for real-time agent updates
4. **Polish UI** - Animations, responsive design
5. **Test with real users** - Gather feedback on conversation flow

---

**Last Updated:** 2025-12-20
**Version:** 1.0
