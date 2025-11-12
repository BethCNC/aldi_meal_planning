import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const exec = promisify(execCallback);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECALCULATE_COSTS_SCRIPT = path.resolve(__dirname, 'recalculate-all-recipe-costs.js');
const FETCH_IMAGES_SCRIPT = path.resolve(__dirname, 'fetch-recipe-images.js');

const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    skipCosts: args.includes('--skip-costs'),
    skipImages: args.includes('--skip-images'),
    forceImages: args.includes('--force-images'),
  };
};

const runCommand = async (command, label) => {
  console.log(`\n▶️  ${label}`);
  console.log('════════════════════════════════════════════════════════════\n');
  try {
    const { stdout, stderr } = await exec(command, { stdio: 'inherit' });
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  } catch (error) {
    console.error(`❌ ${label} failed:`, error.stderr || error.message);
    throw error;
  }
};

const main = async () => {
  const options = parseArgs();
  console.log('\n🚀 Processing all recipes');
  console.log('════════════════════════════════════════════════════════════');

  if (!options.skipCosts) {
    await runCommand(`node "${RECALCULATE_COSTS_SCRIPT}"`, 'Recalculating recipe costs');
  } else {
    console.log('\n⏭  Skipping cost recalculation (per flag)');
  }

  if (!options.skipImages) {
    const forceFlag = options.forceImages ? ' --force' : '';
    await runCommand(`node "${FETCH_IMAGES_SCRIPT}"${forceFlag}`, 'Fetching recipe images');
  } else {
    console.log('\n⏭  Skipping image fetching (per flag)');
  }

  console.log('\n✅ Recipe processing complete\n');
};

main().catch((error) => {
  console.error('\n❌ Recipe processing failed:', error.message || error);
  process.exit(1);
});
