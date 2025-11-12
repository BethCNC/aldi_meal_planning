import dotenv from 'dotenv';
import {createClient} from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const {data, error} = await supabase
  .from('meal_plans')
  .select('*, recipes(name, category, total_cost, cost_per_serving)')
  .order('week_start_date', {ascending: false})
  .order('day_of_week');

if (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

console.log(`📅 Meal Plans in Database: ${data?.length || 0}\n`);

if (data && data.length > 0) {
  const byWeek = {};
  data.forEach(plan => {
    const week = plan.week_start_date;
    if (!byWeek[week]) byWeek[week] = [];
    byWeek[week].push(plan);
  });
  
  Object.keys(byWeek).sort().reverse().forEach(week => {
    console.log(`Week of ${week}:`);
    const plans = byWeek[week].sort((a, b) => a.day_of_week - b.day_of_week);
    plans.forEach(plan => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[plan.day_of_week];
      if (plan.is_order_out_night) {
        console.log(`  ${dayName}: 🍕 Order Out`);
      } else if (plan.is_leftover_night) {
        console.log(`  ${dayName}: 🍽️  Leftovers`);
      } else if (plan.recipes) {
        const recipe = plan.recipes;
        console.log(`  ${dayName}: ${recipe.name} (${recipe.category}) - $${recipe.total_cost?.toFixed(2)}`);
      } else {
        console.log(`  ${dayName}: Recipe ID ${plan.recipe_id}`);
      }
    });
    console.log('');
  });
} else {
  console.log('No meal plans found in database.');
}

