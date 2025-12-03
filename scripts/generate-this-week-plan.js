/**
 * Generate meal plan for this week using the meal plan generator
 * Prioritizes the 4 new recipes we just added
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Try service role key first (for admin access), then anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set VITE_SUPABASE_URL and either:');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (for admin access), or');
  console.error('   - VITE_SUPABASE_ANON_KEY (requires user auth)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// New recipe IDs to prioritize
const NEW_RECIPE_IDS = [
  'efe9291f-3a24-49ab-af90-89438b06c526', // Lemon Garlic Butter Chicken and Asparagus
  'a5f5fc9e-7d77-458c-be04-13599b510882', // Copycat Crunchwraps
  'cbfb0761-e675-471f-9962-165e8d4368f5', // Teriyaki Chicken and Crispy Brussel Sprout & Broccoli Bowls
  '16609c3f-87e9-4ac0-92e8-cbe197a3133e'  // One Pot Creamy Cheesy Beef Pasta
];

async function generateThisWeekPlan() {
  console.log('\n🎯 Generating Meal Plan for This Week\n');
  console.log('════════════════════════════════════════════════════════════\n');

  // Get current user (or use service role if available)
  let userId;
  const isServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (isServiceRole) {
    // Using service role - get first user or prompt for user ID
    console.log('🔑 Using service role key (admin access)\n');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError || !users || users.length === 0) {
      console.error('❌ Could not find any users. Please create a user account first.');
      return;
    }
    
    // Use first user (or you could prompt for email)
    userId = users[0].id;
    console.log(`✅ Using user: ${users[0].email || userId}\n`);
  } else {
    // Using anon key - need authenticated session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Not authenticated. Please either:');
      console.error('   1. Log in to the app and generate plan there, or');
      console.error('   2. Set SUPABASE_SERVICE_ROLE_KEY in .env for admin access\n');
      return;
    }
    userId = user.id;
    console.log(`✅ Authenticated as: ${user.email || userId}\n`);
  }

  // Calculate week start date (Monday)
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString().split('T')[0];

  console.log(`📅 Week Start: ${weekStartDate} (Monday)\n`);

  // Fetch the 4 new recipes
  const { data: newRecipes, error: recipesError } = await supabase
    .from('recipes')
    .select('*')
    .in('id', NEW_RECIPE_IDS);

  if (recipesError) {
    console.error('❌ Error fetching new recipes:', recipesError.message);
    return;
  }

  if (!newRecipes || newRecipes.length < 4) {
    console.warn(`⚠️  Only found ${newRecipes?.length || 0} of 4 new recipes. Continuing anyway...\n`);
  } else {
    console.log(`✅ Found all 4 new recipes:\n`);
    newRecipes.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.name}`);
      console.log(`      Category: ${r.category} | Cost: $${r.total_cost?.toFixed(2) || '0.00'}\n`);
    });
  }

  // Delete existing meal plan for this week
  const { error: deleteError } = await supabase
    .from('meal_plans')
    .delete()
    .eq('week_start_date', weekStartDate)
    .eq('user_id', userId);

  if (deleteError) {
    console.warn('⚠️  Warning: Failed to delete existing plan:', deleteError.message);
  }

  // Build meal plan: Mon/Tue/Thu/Sat = Cook, Wed/Fri/Sun = Leftovers
  const weekPlan = [
    { dayOfWeek: 0, dayName: 'Sunday', recipeId: null, isLeftoverNight: true },
    { dayOfWeek: 1, dayName: 'Monday', recipeId: newRecipes[0]?.id },
    { dayOfWeek: 2, dayName: 'Tuesday', recipeId: newRecipes[1]?.id },
    { dayOfWeek: 3, dayName: 'Wednesday', recipeId: null, isLeftoverNight: true },
    { dayOfWeek: 4, dayName: 'Thursday', recipeId: newRecipes[2]?.id },
    { dayOfWeek: 5, dayName: 'Friday', recipeId: null, isLeftoverNight: true },
    { dayOfWeek: 6, dayName: 'Saturday', recipeId: newRecipes[3]?.id },
  ];

  // Create meal plan entries
  const entries = weekPlan.map(meal => ({
    user_id: userId,
    week_start_date: weekStartDate,
    day_of_week: meal.dayOfWeek,
    meal_type: 'dinner',
    recipe_id: meal.recipeId,
    is_leftover_night: meal.isLeftoverNight || false,
    is_order_out_night: false,
    status: 'planned'
  }));

  const { error: insertError } = await supabase
    .from('meal_plans')
    .upsert(entries, {
      onConflict: 'user_id,week_start_date,day_of_week,meal_type'
    });

  if (insertError) {
    console.error('❌ Failed to create meal plan:', insertError.message);
    console.error('   Details:', insertError);
    return;
  }

  // Calculate total cost
  const totalCost = newRecipes.reduce((sum, r) => sum + (r.total_cost || 0), 0);

  console.log('✅ Meal Plan Created Successfully!\n');
  console.log('════════════════════════════════════════════════════════════');
  console.log('📋 THIS WEEK\'S MEAL PLAN');
  console.log('════════════════════════════════════════════════════════════\n');
  
  weekPlan.forEach(day => {
    if (day.isLeftoverNight) {
      console.log(`   ${day.dayName.padEnd(9)} → 🍽️  Leftover Night (no cooking)`);
    } else {
      const recipe = newRecipes.find(r => r.id === day.recipeId);
      if (recipe) {
        console.log(`   ${day.dayName.padEnd(9)} → ${recipe.name}`);
        console.log(`   ${''.padEnd(9)}    $${recipe.total_cost?.toFixed(2) || '0.00'} | ${recipe.category} | ${recipe.servings || 4} servings\n`);
      } else {
        console.log(`   ${day.dayName.padEnd(9)} → ⚠️  Recipe not found`);
      }
    }
  });
  
  console.log('════════════════════════════════════════════════════════════');
  console.log(`\n💰 Total Cost: $${totalCost.toFixed(2)}`);
  console.log(`📊 Average per meal: $${(totalCost / 4).toFixed(2)}`);
  console.log(`\n✨ View your meal plan in the app!\n`);
}

generateThisWeekPlan().catch(console.error);

