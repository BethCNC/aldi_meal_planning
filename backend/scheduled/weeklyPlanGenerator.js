import { supabase } from '../supabase/client.js';
import { generateWeeklyMealPlan } from '../algorithms/mealPlanGenerator.js';
import { log } from '../utils/scraper.js';

export async function runWeeklyPlanGeneration() {
  log('Starting scheduled weekly meal plan generation...');
  
  const today = new Date().getDay(); // 0-6
  
  // 1. Find users who want plans generated today
  const { data: users, error } = await supabase
    .from('user_preferences')
    .select('user_id, weekly_budget')
    .eq('meal_plan_day', today);
    
  if (error) {
    log(`Failed to fetch users: ${error.message}`, 'error');
    return;
  }
  
  if (!users || users.length === 0) {
    log('No users scheduled for today.');
    return;
  }
  
  log(`Generating plans for ${users.length} users...`);
  
  for (const user of users) {
    try {
      log(`Generating for user ${user.user_id}...`);
      
      const nextMonday = new Date();
      nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
      const weekStartDate = nextMonday.toISOString().split('T')[0];
      
      await generateWeeklyMealPlan({
        budget: user.weekly_budget || 100, // Default to $100 if not set
        servings: 4,
        weekStartDate,
        userId: user.user_id,
        usePantryFirst: true 
      });
      
      log(`✓ Plan generated for ${user.user_id}`, 'success');
    } catch (err) {
      log(`Failed for user ${user.user_id}: ${err.message}`, 'error');
    }
  }
  
  log('Weekly plan generation complete.', 'success');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWeeklyPlanGeneration();
}

