import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecipeData() {
  console.log('\n🔍 Checking Recipe Data for Missing Ingredient Links\n');
  console.log('════════════════════════════════════════════════════════════\n');

  try {
    // Get recipes missing costs
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('*')
      .or('total_cost.is.null,cost_per_serving.is.null')
      .order('name');

    if (error) throw error;

    console.log(`📋 Checking ${recipes.length} recipes...\n`);

    for (const recipe of recipes) {
      console.log(`\n📝 ${recipe.name}`);
      console.log(`   ID: ${recipe.id}`);
      console.log(`   Servings: ${recipe.servings || 'missing'}`);
      console.log(`   Category: ${recipe.category || 'missing'}`);
      
      // Check for ingredient text in various fields
      if (recipe.instructions) {
        const instrLength = recipe.instructions.length;
        console.log(`   Instructions: ${instrLength} characters`);
        if (instrLength > 0 && instrLength < 500) {
          console.log(`   Preview: ${recipe.instructions.substring(0, 200)}...`);
        }
      } else {
        console.log(`   Instructions: missing`);
      }

      // Check if there's any other text field we can use
      const fields = Object.keys(recipe);
      const textFields = fields.filter(f => {
        const value = recipe[f];
        return typeof value === 'string' && value.length > 50;
      });
      
      if (textFields.length > 0) {
        console.log(`   Other text fields: ${textFields.join(', ')}`);
      }

      // Check for source URL (might help us fetch ingredient data)
      if (recipe.source_url) {
        console.log(`   Source URL: ${recipe.source_url}`);
      }
    }

    console.log('\n\n════════════════════════════════════════════════════════════');
    console.log('\n💡 Next Steps:\n');
    console.log('If recipes have ingredient text in instructions or another field,');
    console.log('we can parse it and create ingredient links.\n');
    console.log('If not, you can:');
    console.log('  1. Add ingredient text manually in Supabase Table Editor');
    console.log('  2. Use the source URLs to fetch recipe data');
    console.log('  3. Create ingredient links manually\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkRecipeData();
