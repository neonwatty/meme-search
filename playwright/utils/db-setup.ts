import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

const RAILS_APP_DIR = path.join(__dirname, '../../meme_search_pro/meme_search_app');

/**
 * Check if mise is available in the current environment
 */
async function isMiseAvailable(): Promise<boolean> {
  try {
    await execAsync('which mise');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the command prefix based on environment
 * Uses 'mise exec --' locally, direct execution in CI
 */
async function getCommandPrefix(): Promise<string> {
  const hasMise = await isMiseAvailable();
  return hasMise ? 'mise exec -- ' : '';
}

/**
 * Reset and seed the test database with fixture data
 * This runs the Rails rake task to prepare and seed the test database
 *
 * In CI, database is already prepared and seeded before tests start,
 * so we skip reset to avoid truncation issues with the running Rails server
 */
export async function resetTestDatabase(): Promise<void> {
  // In CI, database is already prepared and seeded before tests
  // Skip reset to avoid truncation issues with active Rails server connections
  if (process.env.CI === 'true') {
    console.log('Skipping database reset in CI (already prepared)');
    return;
  }

  console.log('Resetting test database...');

  try {
    const prefix = await getCommandPrefix();
    const { stdout, stderr } = await execAsync(
      `${prefix}bin/rails db:test:reset_and_seed RAILS_ENV=test`,
      {
        cwd: RAILS_APP_DIR,
        env: { ...process.env, RAILS_ENV: 'test' },
      }
    );

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('✅ Test database reset complete');
  } catch (error) {
    console.error('❌ Failed to reset test database:', error);
    throw error;
  }
}

/**
 * Seed the test database without resetting schema
 * Faster than full reset, use when schema hasn't changed
 */
export async function seedTestDatabase(): Promise<void> {
  console.log('Seeding test database...');

  try {
    const prefix = await getCommandPrefix();
    const { stdout, stderr } = await execAsync(
      `${prefix}bin/rails db:test:seed RAILS_ENV=test`,
      {
        cwd: RAILS_APP_DIR,
        env: { ...process.env, RAILS_ENV: 'test' },
      }
    );

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('✅ Test database seeded');
  } catch (error) {
    console.error('❌ Failed to seed test database:', error);
    throw error;
  }
}

/**
 * Clean the test database (remove all test data)
 */
export async function cleanTestDatabase(): Promise<void> {
  console.log('Cleaning test database...');

  try {
    const prefix = await getCommandPrefix();
    const { stdout, stderr } = await execAsync(
      `${prefix}bin/rails db:test:clean RAILS_ENV=test`,
      {
        cwd: RAILS_APP_DIR,
        env: { ...process.env, RAILS_ENV: 'test' },
      }
    );

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('✅ Test database cleaned');
  } catch (error) {
    console.error('❌ Failed to clean test database:', error);
    throw error;
  }
}
