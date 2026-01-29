# Aldi Meal Planner 2.0 - Complete Application Overview

**Comprehensive Guide for AI Model Understanding**

This document provides a complete overview of the Aldi Meal Planner 2.0 application, including its purpose, goals, requirements, user flow, UI/UX design, and technical architecture.

---

## 🎯 Purpose & Problem Statement

### Core Problem
**Neurodivergent users (ADHD, Autism) experience decision paralysis when meal planning, causing them to abandon the process entirely or default to expensive takeout.**

Traditional meal planning apps fail because they assume users **CAN** make decisions when presented with organized options. This app removes decisions entirely, not just organizes them.

### Why This Matters
- **90% abandonment rate** in traditional apps (users give up after 5-15 minutes)
- **15-20 decisions required** per session → decision fatigue
- **30+ minutes** to complete → too long, causes anxiety
- **$200+/week** spent on takeout when overwhelmed
- **8/10 anxiety level** when attempting meal planning

### Solution Approach
A conversational AI agent that:
- Asks **ONE question**: "How many days?"
- Makes **ALL decisions automatically** (recipe selection, day assignment, grocery list)
- Delivers **print-ready grocery list in 30 seconds**
- Eliminates **15-20 decision points → just 1**

---

## 📊 Success Metrics & Goals

### Primary Goals
1. **Completion Rate**: 95% of users complete meal plan generation (vs 10% in traditional apps)
2. **Time to Value**: Grocery list ready in < 30 seconds (vs 30+ minutes)
3. **Decision Reduction**: From 15-20 decisions → 1 decision (95% reduction)
4. **Cost Savings**: Average weekly spending reduced by 50% ($200 → $100)
5. **Anxiety Reduction**: From 8/10 → 2/10 (75% reduction)

### Target User Outcomes
- **Time saved**: 29.5 minutes per week
- **Money saved**: $100 per week ($5,200/year)
- **Stress reduced**: 75% reduction in meal planning anxiety
- **Confidence gained**: Successful planning without struggle

---

## 👥 Target Users

### Primary Persona: Neurodivergent Meal Planner
- **Age**: 25-45
- **Diagnosis**: ADHD, Autism, or both
- **Income**: $30k-$60k
- **Location**: Urban/suburban

### Key Pain Points
1. **Decision paralysis** - Too many choices overwhelm
2. **Executive dysfunction** - Can't break down complex tasks
3. **Time blindness** - Loses track of planning time
4. **Sensory overload** - Too much visual information
5. **Anxiety** - Fear of making "wrong" choices

### User Goals
- Reduce weekly food spending
- Eliminate daily "what's for dinner?" stress
- Have groceries ready without thinking
- Feel accomplished, not overwhelmed

---

## 🎨 Design Principles (MUST FOLLOW)

### Principle 1: Automation Over Customization
**Make decisions FOR users, not WITH them.**
- AI makes all choices automatically
- Users only answer: "How many days?"
- No recipe selection, no day assignment, no ingredient swaps
- **Implementation**: AI selects recipes based on variety, cost, and preferences automatically

### Principle 2: Accessibility-First
**WCAG AAA compliance, triple input modality, zero barriers.**
- **WCAG AAA** compliance (not just AA)
- **Triple input modality**: Voice, button, text for every action
- **Keyboard navigation** for all interactions
- **Screen reader** optimized (NVDA, JAWS, VoiceOver)
- **High contrast** mode available
- **Reduced motion** support
- **Implementation**: Every action must support voice, button, and keyboard input

### Principle 3: Single-Screen Flow
**No navigation, no tabs, vertical scroll only.**
- One screen, one purpose
- Vertical scroll for content
- No hamburger menus, no tab navigation, no back buttons
- Progressive disclosure (show more as needed)
- **Implementation**: All content on one page, scroll down to see more

### Principle 4: Instant Value
**Grocery list first, details second.**
- Show grocery list immediately after generation
- Recipe details are secondary (expandable)
- Print button prominent
- Total cost visible upfront
- Minimal loading states
- **Implementation**: Grocery list appears first, recipes shown below

### Principle 5: Graceful Degradation
**Works even if components fail.**
- App functions if AI fails (fallback recipes)
- Works without voice input (button/text always available)
- Functions offline (cached recipes)
- Handles API errors gracefully
- **Implementation**: Fallback algorithms, cached data, error recovery

---

## 🔄 User Flow

### Primary Flow: Happy Path (95% of users)

```
1. User opens app (0-5 seconds)
   - Sees clean, minimal interface
   - Single question: "How many days?"
   - Voice, button, or text input available
   - No overwhelming options

2. User selects days (5-10 seconds)
   - Answers "7 days" (default, can change)
   - Voice: "seven days" → 7
   - Button: Click number
   - Text: Type number
   - Instant confirmation

3. AI generates plan (10-30 seconds)
   - Conversational AI explains what it's doing
   - "I'm selecting 7 recipes with good variety..."
   - "I'm balancing proteins across the week..."
   - Progress visible but not overwhelming
   - No user decisions required

4. Grocery list appears (30 seconds)
   - Grocery list shown FIRST (instant value)
   - Total cost prominently displayed
   - Organized by category
   - Print button at top
   - Recipe details expandable below

5. Optional review (30-60 seconds)
   - Recipes shown below grocery list
   - Can expand to see details
   - Can regenerate if needed (one click)
   - No pressure to review
```

**Total Time**: 30 seconds  
**Decisions Required**: 1 (number of days)  
**Anxiety Level**: 2/10

### Alternative Flow: Regeneration (5% of users)
- User generates plan
- Sees grocery list
- Clicks "Generate New Plan"
- AI generates different plan
- User satisfied

**Total Time**: 60 seconds  
**Decisions Required**: 2 (days + regenerate)

---

## 🖥️ UI/UX Design

### Visual Hierarchy
1. **Primary**: Days selector (largest, most prominent)
2. **Secondary**: Grocery list (appears after generation)
3. **Tertiary**: Recipe details (expandable, below list)

### Layout Structure
- **Single page**: No navigation, no tabs, vertical scroll only
- **Above the fold**: Days selector with clear call-to-action
- **Below the fold**: Grocery list (after generation), then recipes
- **No modals**: All content on main page (except error states)

### Conversational Elements
- AI explains actions: "I'm selecting recipes..."
- Confirms inputs: "7 days, got it!"
- Shows progress: "Generating your plan..."
- Celebrates completion: "Your grocery list is ready!"

### Color & Typography
- **Font**: Plus Jakarta Sans (from design tokens)
- **Colors**: Light/dark mode support
- **Primary color**: Apple green (#8fc766)
- **Contrast**: 7:1 for normal text, 4.5:1 for large text (WCAG AAA)

### Accessibility Features
- Voice input available for all actions
- Keyboard navigation (Tab, Enter, Arrow keys)
- Screen reader optimized (ARIA labels, live regions)
- High contrast mode toggle
- Reduced motion support (`prefers-reduced-motion`)

---

## 📦 Core Components

### 1. DaysSelector Component
**Purpose**: Primary input - user selects number of days

**Features**:
- Number input (1-14 days, default: 7)
- Voice input support ("seven days" → 7)
- Keyboard navigation (Tab to focus, Enter to submit)
- Screen reader optimized
- Visual feedback on change

**Accessibility**:
- ARIA label: "Select number of days for meal plan"
- Voice, button, and keyboard input all supported

### 2. ConversationUI Component
**Purpose**: Displays AI conversation during meal plan generation

**Features**:
- Message bubbles (user/assistant)
- Loading indicator during generation
- Smooth animations (respects reduced motion)
- Auto-scroll to latest message
- Accessible live regions

**Message Flow**:
1. User: "7 days"
2. Assistant: "Got it! Generating your 7-day meal plan..."
3. Assistant: "I'm selecting recipes with good variety..."
4. Assistant: "Your meal plan is ready!"

### 3. GroceryList Component
**Purpose**: Displays aggregated grocery list with print functionality

**Features**:
- Grouped by category (produce, meat, dairy, etc.)
- Print-optimized layout
- Total cost prominently displayed
- Checkboxes for shopping (optional)
- Print button at top
- Keyboard accessible

**Accessibility**:
- ARIA label: "Grocery list for meal plan"
- Keyboard: Tab through items, Enter to print
- Screen reader announces categories and items

### 4. RecipeCard Component
**Purpose**: Displays individual recipe information (expandable)

**Features**:
- Collapsible details (expanded by click)
- Cost per serving displayed
- Ingredient list
- Instructions
- Image (if available)
- Category badge

**Accessibility**:
- ARIA expanded state
- Keyboard: Enter/Space to expand
- Screen reader announces recipe details

### 5. LoadingSpinner Component
**Purpose**: Shows loading state during meal plan generation

**Features**:
- Animated spinner (respects `prefers-reduced-motion`)
- Optional message
- Accessible to screen readers

---

## 🏗️ Technical Architecture

### Tech Stack

**Frontend**:
- React 19.1.1
- Vite 5.4.21 (build tool)
- Tailwind CSS 3.4.17 (styling)
- React Router DOM 7.9.5 (routing)
- Headless UI 2.2.9 (accessible components)
- @react-pdf/renderer 4.3.1 (PDF generation)

**Backend**:
- Node.js (ES Modules)
- Express 4.18.2
- Google Gemini 1.5 Pro (AI agent)
- LangChain 1.2.2 (structured output)
- Supabase (PostgreSQL database)
- @supabase/supabase-js 2.79.0

### System Architecture

```
┌─────────────────┐
│   React Frontend │  (Vite + React 19)
│   (User Interface)│
└────────┬─────────┘
         │ HTTP/WebSocket
         │
┌────────▼─────────┐
│  Express Backend  │  (Node.js + Express)
│  (API + AI Agent) │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌───▼────┐
│Supabase│ │ Gemini │
│(Postgres)│ │  AI   │
└────────┘ └────────┘
```

### Database Schema

**Core Tables**:
- `recipes` - Recipe metadata, costs, instructions
- `ingredients` - Ingredient data with Aldi pricing
- `recipe_ingredients` - Junction table linking recipes to ingredients
- `meal_plans` - User meal plans
- `meal_plan_meals` - Individual meals in a plan
- `recipe_history` - Tracks recipe usage to prevent repeats

### AI Agent Flow

```
User Input (days)
    ↓
DaysSelector Component
    ↓
API Call: POST /api/meal-plan/generate
    ↓
Backend: mealPlanningAgent.js
    ↓
1. Fetch Recipes from Supabase
2. Get User Preferences
3. Get Recent Meal Plans (avoid repeats)
4. Build Prompt with Constraints
    ↓
Gemini 1.5 Pro API
    ↓
Structured Output (Zod Schema)
    ↓
Validate & Save to Supabase
    ↓
Generate Grocery List
    ↓
Return to Frontend
```

### API Endpoints

**Meal Planning**:
```
POST /api/meal-plan/generate
Body: { days: number, userId: string, budget?: number }
Response: { plan: MealPlan, groceryList: GroceryList }
```

**Grocery List**:
```
GET /api/grocery-list/:planId
Response: { items: GroceryItem[], totalCost: number }
```

**Recipes**:
```
GET /api/recipes
Query: { category?, maxCost?, limit? }
Response: { recipes: Recipe[] }
```

---

## ✅ Critical Requirements (MUST HAVE)

### Functional Requirements
1. **Single Question Input**: User only answers "How many days?" (1-14)
2. **Automatic Recipe Selection**: AI selects recipes based on variety, cost, preferences
3. **Automatic Day Assignment**: AI assigns meals to days automatically
4. **Grocery List Generation**: Automatically aggregates ingredients, calculates costs
5. **Print Functionality**: Grocery list must be print-optimized
6. **Recipe Variety**: No same protein category 2 days in a row, no repeats within 4 weeks
7. **Budget Constraints**: Must respect weekly budget (default: $100/week)
8. **Cost Calculation**: Accurate ingredient costs based on Aldi pricing

### Accessibility Requirements
1. **WCAG AAA Compliance**: All text 7:1 contrast, large text 4.5:1
2. **Triple Input Modality**: Every action supports voice, button, and keyboard
3. **Screen Reader Support**: Full compatibility with NVDA, JAWS, VoiceOver
4. **Keyboard Navigation**: All functions accessible via keyboard
5. **High Contrast Mode**: Toggle for high contrast display
6. **Reduced Motion**: Respects `prefers-reduced-motion` media query

### Performance Requirements
1. **Time to First Paint**: < 1 second
2. **Time to Interactive**: < 2 seconds
3. **Meal Plan Generation**: < 30 seconds
4. **API Response Time**: < 500ms (non-AI endpoints)
5. **Database Queries**: < 100ms

### Reliability Requirements
1. **Graceful Degradation**: Works if AI fails (fallback recipes)
2. **Offline Support**: Cached recipes work offline
3. **Error Handling**: Clear error messages, retry options
4. **No Single Point of Failure**: App functions even if components fail

---

## 🚫 What This App Is NOT

- ❌ **Not a recipe discovery app** - Recipes are pre-selected from database
- ❌ **Not a customization tool** - Limited user choices (only days)
- ❌ **Not a social platform** - No sharing, no reviews, no social features
- ❌ **Not a nutrition tracker** - Focus is on planning, not tracking nutrition
- ❌ **Not a grocery delivery service** - Just generates the list, user shops at Aldi
- ❌ **Not a meal prep scheduler** - Focus is on planning, not prep scheduling

---

## 🎯 Key Features

### Core Features
1. **Days Selection**: User selects 1-14 days (default: 7)
2. **AI Meal Plan Generation**: Automatic recipe selection and day assignment
3. **Grocery List**: Aggregated, categorized, cost-calculated list
4. **Print Functionality**: Print-optimized grocery list
5. **Recipe Details**: Expandable recipe cards with ingredients and instructions
6. **Regeneration**: One-click option to generate a different plan

### AI Features
1. **Conversational Interface**: AI explains what it's doing
2. **Variety Enforcement**: Ensures protein rotation, no recent repeats
3. **Budget Optimization**: Selects recipes within budget constraints
4. **Cost Calculation**: Accurate ingredient cost aggregation

### Accessibility Features
1. **Voice Input**: Web Speech API for voice commands
2. **Keyboard Navigation**: Full keyboard support
3. **Screen Reader**: Optimized for assistive technologies
4. **High Contrast Mode**: Toggle for visual accessibility
5. **Reduced Motion**: Respects user motion preferences

---

## 📱 User Experience Details

### First-Time User Experience
1. Opens app → sees clean interface
2. Sees "How many days?" question
3. Default shows 7 days (can change)
4. Clicks/submits → AI generates plan
5. Sees grocery list immediately
6. Can print and shop

**No onboarding required** - the interface is self-explanatory

### Returning User Experience
1. Opens app → sees last generated plan (if available)
2. Can regenerate with one click
3. Or generate new plan for different number of days

### Error States
- **AI Generation Fails**: Shows fallback recipes, explains issue, offers retry
- **Network Error**: Shows cached recipes, explains offline mode
- **Invalid Input**: Clear error message, suggests valid range (1-14)

### Loading States
- **During Generation**: Shows conversational messages, loading spinner
- **Brief**: < 2 seconds for non-AI operations
- **AI Generation**: 10-30 seconds with progress updates

---

## 🎨 Design System

### Design Tokens
- **Font Family**: Plus Jakarta Sans
- **Font Weights**: Light, Regular, Medium, SemiBold, Bold, ExtraBold
- **Colors**: Stone (neutral), Apple (primary), Blueberry (secondary), Tomato (danger), Lemon (warning)
- **Spacing**: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px, 128px
- **Border Radius**: 0, 0.125rem, 0.25rem, 0.375rem, 0.5rem, 0.75rem, 1rem, 9999px (full)

### Component Styles
- **Buttons**: Primary (apple green), Secondary (blueberry blue), Ghost
- **Inputs**: White background, stone border, apple focus ring
- **Cards**: White background, subtle border, rounded corners
- **Badges**: Success (apple), Warning (lemon), Danger (tomato), Neutral (stone)

---

## 🔐 Security & Privacy

### Security Measures
- **API Keys**: Server-side only (never exposed in frontend)
- **User Data**: Row-level security in Supabase
- **Input Validation**: Zod schemas for all inputs
- **Rate Limiting**: Implemented on API endpoints
- **CORS**: Configured for production domain

### Privacy
- **User Authentication**: Optional (can work without login)
- **Data Storage**: Meal plans stored per user (if authenticated)
- **No Tracking**: No analytics, no user tracking
- **Local Storage**: Cached recipes for offline use

---

## 📈 Success Indicators

### Primary Metrics
- ✅ 95% completion rate
- ✅ 30-second average time to grocery list
- ✅ 1 decision required (vs 15-20)
- ✅ 2/10 anxiety level (vs 8/10)

### Secondary Metrics
- ✅ 90% weekly return usage
- ✅ 85% print grocery list
- ✅ 80% complete shopping
- ✅ 75% cost savings achieved

---

## 🚀 Development Phases

### Phase 1: Foundation (Weeks 1-2)
- Set up React project
- Configure Gemini API
- Build DaysSelector component
- Implement basic conversation flow

### Phase 2: Plan Generation (Weeks 3-4)
- Set up Supabase database
- Migrate recipes from Notion
- Build recipe selection algorithm
- Create GroceryList component

### Phase 3: Accessibility (Weeks 5-6)
- Add voice input
- Implement keyboard shortcuts
- Add high contrast mode
- WCAG AAA compliance

### Phase 4: Recipe Expansion (Weeks 7-8)
- Expand to 50+ recipes
- Balance protein distribution
- Verify costs

### Phase 5: User Testing (Weeks 9-10)
- Test with 6-8 neurodivergent users
- Iterate based on feedback
- Validate metrics

### Phase 6: Portfolio (Weeks 11-12)
- Create 20-slide case study
- Record demo video
- Write developer docs

---

## 💡 Key Differentiators

### What Makes This App Unique
1. **Decision Elimination**: Removes decisions entirely, not just organizes them
2. **Conversational AI**: Explains what it's doing, builds trust
3. **Instant Value**: Grocery list in 30 seconds, not 30 minutes
4. **Accessibility-First**: WCAG AAA, triple input modality
5. **Single-Screen Flow**: No navigation, no tabs, no complexity
6. **Graceful Degradation**: Works even when components fail

### Competitive Advantages
- **95% completion rate** vs 10% in traditional apps
- **1 decision** vs 15-20 decisions
- **30 seconds** vs 30+ minutes
- **Designed for neurodivergent users** from the ground up
- **Accessibility is core**, not an afterthought

---

## 📝 Implementation Notes

### Critical Implementation Details
1. **AI Prompt Engineering**: Must include budget constraints, variety requirements, recent recipe exclusions
2. **Recipe Selection Algorithm**: Ensures no protein repeats, respects budget, avoids recent recipes
3. **Grocery List Aggregation**: Sums quantities by ingredient, groups by category, calculates total cost
4. **Error Handling**: Always provide fallback, never show blank screen
5. **Accessibility**: Every component must be tested with screen readers

### Code Quality Standards
- **Type Safety**: Use Zod for validation, TypeScript for type checking
- **Error Handling**: Try-catch blocks, clear error messages
- **Performance**: Lazy loading, code splitting, optimized queries
- **Testing**: Unit tests for components, integration tests for flows
- **Documentation**: Clear comments, README files, API documentation

---

## 🎯 Summary

**Aldi Meal Planner 2.0** is a meal planning application designed specifically for neurodivergent users (ADHD, Autism) that eliminates decision fatigue by automating all meal planning decisions. The app asks one question ("How many days?"), uses AI to automatically select recipes and generate a grocery list, and delivers a print-ready shopping list in 30 seconds.

**Key Innovation**: Removing decisions entirely, not just organizing them.

**Success Metrics**: 95% completion rate, 30-second time to value, 1 decision required, 75% anxiety reduction.

**Technical Stack**: React 19, Vite, Tailwind CSS, Node.js, Express, Google Gemini 1.5 Pro, Supabase (PostgreSQL).

**Accessibility**: WCAG AAA compliant, triple input modality (voice/button/keyboard), screen reader optimized.

**Design Principles**: Automation over customization, accessibility-first, single-screen flow, instant value, graceful degradation.

---

**Last Updated**: December 20, 2024  
**Version**: 2.0  
**Status**: In Development

