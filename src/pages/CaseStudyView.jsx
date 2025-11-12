import { Card } from '../components/ui/Card';

export function CaseStudyView() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-bold mb-4">Aldi Meal Planner</h1>
        <p className="text-xl text-stone-600">A Case Study in ADHD-Friendly Product Design</p>
      </header>
      
      {/* Section 1: Project Overview */}
      <Card className="p-8 mb-8">
        <h2 className="text-3xl font-bold mb-6">1. Project Overview</h2>
        <div className="prose max-w-none">
          <p className="text-lg mb-4">
            <strong>Problem Statement:</strong> Daily decision-making about food causes constant anxiety 
            and leads to expensive, unhealthy takeout. The user needs decisions removed entirely, not just organized.
          </p>
          <p className="mb-4">
            <strong>Role:</strong> Solo Product Designer & Developer
          </p>
          <p className="mb-4">
            <strong>Timeline:</strong> 4 weeks (compressed to rapid development)
          </p>
          <p className="mb-4">
            <strong>Tools:</strong> React, Supabase, Tailwind CSS, OpenAI API, Vercel
          </p>
        </div>
      </Card>
      
      {/* Section 2: Discovery & Research */}
      <Card className="p-8 mb-8">
        <h2 className="text-3xl font-bold mb-6">2. Discovery & Research</h2>
        <div className="prose max-w-none">
          <h3 className="text-xl font-bold mb-3">Key Insight Discovered</h3>
          <p className="mb-4">
            The real problem isn't "meal planning"—it's <strong>decision paralysis caused by 
            ADHD/Autism/ARFID</strong> that leads to expensive takeout and constant anxiety.
          </p>
          
          <h3 className="text-xl font-bold mb-3">Current State Analysis</h3>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>No meal planning currently happens</li>
            <li>Wait until last minute → order DoorDash or takeout</li>
            <li>Daily decision paralysis about food</li>
            <li>Constant background anxiety about meals</li>
            <li>$200/week spent on food (groceries + takeout combined)</li>
            <li>Target: Reduce to $100-120/week</li>
          </ul>
          
          <h3 className="text-xl font-bold mb-3">Success Metrics</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Quantitative:</strong> Weekly budget: $100/week target, Planning time: Maximum 1 hour per week</li>
            <li><strong>Qualitative:</strong> Eliminate constant food-related anxiety, Remove daily decision-making burden</li>
          </ul>
        </div>
      </Card>
      
      {/* Section 3: Problem Definition */}
      <Card className="p-8 mb-8">
        <h2 className="text-3xl font-bold mb-6">3. Problem Definition</h2>
        <div className="prose max-w-none">
          <h3 className="text-xl font-bold mb-3">Core Problem Statement</h3>
          <blockquote className="border-l-4 border-surface-primary pl-4 italic text-lg mb-6">
            "Daily decision-making about food causes constant anxiety and leads to expensive, 
            unhealthy takeout. I need decisions removed entirely, not just organized."
          </blockquote>
          
          <h3 className="text-xl font-bold mb-3">User Journey: Current State vs Ideal State</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold mb-2">Current State (Anxiety Cycle)</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Sunday: Anxiety about planning, avoidance</li>
                <li>Monday-Friday: Decision paralysis → DoorDash ($30-40/day)</li>
                <li>Saturday: Guilt about spending/waste</li>
                <li>Background: Constant low-level anxiety</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-2">Ideal State (Automated System)</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Sunday: Review auto-generated plan (10 min)</li>
                <li>Monday: Shop with organized list</li>
                <li>Monday-Friday: Check plan, cook, no decisions</li>
                <li>Background: Peace knowing what's for dinner</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Section 4: Information Architecture */}
      <Card className="p-8 mb-8">
        <h2 className="text-3xl font-bold mb-6">4. Information Architecture</h2>
        <div className="prose max-w-none">
          <h3 className="text-xl font-bold mb-3">System Requirements (ADHD-Specific)</h3>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li><strong>Zero user input required</strong> for plan generation - system picks meals automatically</li>
            <li><strong>Familiar, safe recipe rotation</strong> - 10-15 recipes user already likes</li>
            <li><strong>Clear, linear workflow</strong> - No branching paths or configuration screens</li>
            <li><strong>Visual hierarchy</strong> - Bold headings, checklist format, minimal text</li>
            <li><strong>Anxiety-reducing features</strong> - Cost shown upfront, time estimates, leftover nights built in</li>
          </ul>
          
          <h3 className="text-xl font-bold mb-3">Database Architecture</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Ingredients:</strong> Aldi price database with package sizes and base unit conversions</li>
            <li><strong>Recipes:</strong> Safe recipe collection with cost calculations</li>
            <li><strong>Meal Plans:</strong> Weekly calendar with recipe relations</li>
            <li><strong>Grocery Lists:</strong> Generated shopping lists with pantry deduction</li>
            <li><strong>User Pantry:</strong> Track items on hand with expiration tracking</li>
          </ul>
        </div>
      </Card>
      
      {/* Section 5: Design Process */}
      <Card className="p-8 mb-8">
        <h2 className="text-3xl font-bold mb-6">5. Design Process</h2>
        <div className="prose max-w-none">
          <h3 className="text-xl font-bold mb-3">Design Principles</h3>
          <ol className="list-decimal list-inside mb-6 space-y-3">
            <li><strong>Remove decisions, don't organize them</strong> - System decides, user approves</li>
            <li><strong>Reduce cognitive load</strong> - Single column layouts, clear hierarchy, minimal text</li>
            <li><strong>Provide structure and routine</strong> - Consistent weekly format, predictable rotation</li>
            <li><strong>Satisfy completion drive</strong> - Checkboxes everywhere, status indicators, progress tracking</li>
            <li><strong>Eliminate anxiety triggers</strong> - Show costs upfront, permission to deviate</li>
          </ol>
          
          <h3 className="text-xl font-bold mb-3">Key UX Decisions</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>TODAY prominently highlighted</strong> - No searching for current day</li>
            <li><strong>Budget always visible</strong> - Transparency, no surprises</li>
            <li><strong>Single primary action per screen</strong> - Reduces decision fatigue</li>
            <li><strong>Leftover/Order Out nights built in</strong> - Reduces cooking burden</li>
            <li><strong>Pantry-First enhancement</strong> - Reduces waste by using existing ingredients</li>
          </ul>
        </div>
      </Card>
      
      {/* Section 6: Technical Implementation */}
      <Card className="p-8 mb-8">
        <h2 className="text-3xl font-bold mb-6">6. Technical Implementation</h2>
        <div className="prose max-w-none">
          <h3 className="text-xl font-bold mb-3">Tech Stack</h3>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li><strong>Frontend:</strong> React + Vite, Tailwind CSS, Headless UI</li>
            <li><strong>Backend:</strong> Supabase (PostgreSQL + RPC functions)</li>
            <li><strong>AI Integration:</strong> OpenAI API for recipe matching fallback</li>
            <li><strong>Deployment:</strong> Vercel</li>
          </ul>
          
          <h3 className="text-xl font-bold mb-3">Key Features</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Hybrid Recipe Matching:</strong> Rule-based first (fast), AI fallback when needed</li>
            <li><strong>Pantry-First Algorithm:</strong> Prioritizes recipes using existing pantry items</li>
            <li><strong>Automatic Cost Calculation:</strong> Real-time recipe costs from ingredient prices</li>
            <li><strong>Grocery List Generation:</strong> Consolidates ingredients, deducts pantry, groups by store layout</li>
            <li><strong>Protein Rotation:</strong> Prevents same protein 3x in a row</li>
          </ul>
          
          <h3 className="text-xl font-bold mb-3">Database Schema</h3>
          <p className="mb-4">
            PostgreSQL tables with proper relations, indexes for performance, and RPC functions 
            for complex queries (recipe matching, pantry deduction).
          </p>
        </div>
      </Card>
      
      {/* Section 7: Outcomes & Validation */}
      <Card className="p-8 mb-8">
        <h2 className="text-3xl font-bold mb-6">7. Outcomes & Validation</h2>
        <div className="prose max-w-none">
          <h3 className="text-xl font-bold mb-3">Expected Results</h3>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div>
              <div className="text-3xl font-bold text-success mb-2">$100-120</div>
              <p className="text-sm">Weekly food spending (down from $200)</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-surface-primary mb-2">10 min</div>
              <p className="text-sm">Weekly planning time (down from hours of anxiety)</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-success mb-2">0</div>
              <p className="text-sm">Daily meal decisions (fully automated)</p>
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-3">Success Criteria</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>All 5 views functional (Pantry Input, Suggestions, Weekly Plan, Grocery List, Recipe Detail)</li>
            <li>Pantry-First feature working end-to-end</li>
            <li>Meal plan generation within budget 95% of time</li>
            <li>Grocery list with pantry deduction accurate</li>
            <li>Mobile responsive and accessible</li>
          </ul>
        </div>
      </Card>
      
      {/* Section 8: Reflection */}
      <Card className="p-8 mb-8">
        <h2 className="text-3xl font-bold mb-6">8. Reflection</h2>
        <div className="prose max-w-none">
          <h3 className="text-xl font-bold mb-3">What Worked Well</h3>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>Starting with user research revealed the real problem wasn't organization, but decision paralysis</li>
            <li>ADHD-specific design principles led to cleaner, more effective UX</li>
            <li>Hybrid AI approach balances speed (rule-based) with intelligence (OpenAI fallback)</li>
            <li>Pantry-First feature addresses real waste reduction need</li>
          </ul>
          
          <h3 className="text-xl font-bold mb-3">What I'd Do Differently</h3>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>Build mobile-first from the start (most users shop on mobile)</li>
            <li>Add more recipe variety earlier in the process</li>
            <li>Implement pantry expiration reminders sooner</li>
            <li>Test with real users earlier to validate assumptions</li>
          </ul>
          
          <h3 className="text-xl font-bold mb-3">Key Learnings</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Design for the user you have:</strong> ADHD-specific needs changed everything</li>
            <li><strong>Automate decisions:</strong> Don't just organize them</li>
                          <li><strong>Structure reduces anxiety:</strong> Predictability &gt; flexibility for neurodivergent users</li>
            <li><strong>Systems thinking matters:</strong> Not just UI, but data + automation + AI integration</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
