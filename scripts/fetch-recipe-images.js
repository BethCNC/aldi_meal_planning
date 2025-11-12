import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { load as loadHtml } from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.resolve(PROJECT_ROOT, 'public', 'recipe-images');

const UNSPLASH_BASE_URL = 'https://source.unsplash.com/featured/?';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ensureDirectory = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const slugify = (input = '') =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'recipe';

const getExtensionFromContentType = (contentType = '') => {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
};

const buildAbsoluteUrl = (imageUrl, sourceUrl) => {
  if (!imageUrl) return null;
  try {
    return new URL(imageUrl, sourceUrl).href;
  } catch (error) {
    return null;
  }
};

const fetchHtml = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'AldiMealPlannerBot/1.0 (+https://github.com/bethcartrette/aldi-meal-planner)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      console.warn(`⚠️  Unable to fetch ${url}: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.warn(`⚠️  Failed to fetch ${url}: ${error.message}`);
    return null;
  }
};

const extractImageFromHtml = (html, sourceUrl) => {
  if (!html) return null;

  const $ = loadHtml(html);
  const metaTags = [
    'meta[property="og:image"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
  ];

  for (const selector of metaTags) {
    const candidate = $(selector).attr('content');
    const resolved = buildAbsoluteUrl(candidate, sourceUrl);
    if (resolved) {
      return resolved;
    }
  }

  const firstImg = $('img').first().attr('src');
  return buildAbsoluteUrl(firstImg, sourceUrl);
};

const fetchUnsplashImage = (recipeName) => {
  const query = encodeURIComponent(`${recipeName || 'recipe'} food`);
  return `${UNSPLASH_BASE_URL}${query}`;
};

const downloadImage = async (imageUrl, destinationPath) => {
  const response = await fetch(imageUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'AldiMealPlannerBot/1.0 (+https://github.com/bethcartrette/aldi-meal-planner)',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(destinationPath, Buffer.from(arrayBuffer));
};

const updateRecipeImage = async (recipeId, imagePath) => {
  const { error } = await supabase
    .from('recipes')
    .update({ image_url: imagePath, updated_at: new Date().toISOString() })
    .eq('id', recipeId);

  if (error) {
    throw new Error(`Supabase update failed: ${error.message}`);
  }
};

export const processRecipeImage = async (recipe, { force = false } = {}) => {
  const alreadyHasImage = Boolean(recipe.image_url && recipe.image_url.trim().length > 0);
  if (alreadyHasImage && !force) {
    return { status: 'skipped', reason: 'existing-image' };
  }

  const slug = slugify(recipe.name || recipe.id);
  let imageUrl = null;

  if (recipe.source_url) {
    const html = await fetchHtml(recipe.source_url);
    imageUrl = extractImageFromHtml(html, recipe.source_url);
  }

  if (!imageUrl) {
    imageUrl = fetchUnsplashImage(recipe.name);
  }

  if (!imageUrl) {
    return { status: 'skipped', reason: 'no-image' };
  }

  let extension = 'jpg';
  try {
    const headResponse = await fetch(imageUrl, { method: 'HEAD', redirect: 'follow' });
    if (headResponse.ok) {
      const contentType = headResponse.headers.get('content-type') || '';
      extension = getExtensionFromContentType(contentType);
    }
  } catch (error) {
    console.warn(`   ⚠️  Unable to determine image type, defaulting to jpg (${error.message})`);
  }

  const fileName = `${slug}.${extension}`;
  const filePath = path.join(PUBLIC_DIR, fileName);
  const publicPath = `/recipe-images/${fileName}`;

  await downloadImage(imageUrl, filePath);
  await updateRecipeImage(recipe.id, publicPath);

  return { status: 'updated', imageUrl: publicPath };
};

export const fetchRecipeImages = async ({ force = false } = {}) => {
  console.log('\n🖼  Fetching recipe images');
  console.log('════════════════════════════════════════════════════════════\n');

  await ensureDirectory(PUBLIC_DIR);

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, name, source_url, image_url')
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch recipes: ${error.message}`);
  }

  const summary = {
    updated: 0,
    skippedExisting: 0,
    skippedMissing: 0,
    errors: 0,
  };

  for (const recipe of recipes) {
    console.log(`➡️  ${recipe.name}`);
    try {
      const result = await processRecipeImage(recipe, { force });
      if (result.status === 'updated') {
        summary.updated += 1;
        console.log(`   ✅ Image saved to ${result.imageUrl}`);
      } else if (result.reason === 'existing-image') {
        summary.skippedExisting += 1;
        console.log('   ⏭  Skipped (already has image)');
      } else {
        summary.skippedMissing += 1;
        console.log('   ⚠️  No image could be determined');
      }
    } catch (err) {
      summary.errors += 1;
      console.error(`   ❌ Failed: ${err.message}`);
    }
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📊 Summary');
  console.log(`   ✅ Updated: ${summary.updated}`);
  console.log(`   ⏭  Skipped (existing image): ${summary.skippedExisting}`);
  console.log(`   ⚠️  Skipped (no image found): ${summary.skippedMissing}`);
  console.log(`   ❌ Errors: ${summary.errors}`);
  console.log('\nDone!\n');

  return summary;
};

const runFromCli = async () => {
  const args = process.argv.slice(2);
  const force = args.includes('--force');

  try {
    await fetchRecipeImages({ force });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runFromCli();
}
