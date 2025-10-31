import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

const RAILS_APP_DIR = path.join(__dirname, '../../meme_search_pro/meme_search_app');

/**
 * Reset and seed the test database with fixture data
 * This runs the Rails rake task to prepare and seed the test database
 */
export async function resetTestDatabase(): Promise<void> {
  console.log('Resetting test database...');

  try {
    const { stdout, stderr } = await execAsync(
      'mise exec -- bin/rails db:test:reset_and_seed RAILS_ENV=test',
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
    const { stdout, stderr } = await execAsync(
      'mise exec -- bin/rails db:test:seed RAILS_ENV=test',
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
    const { stdout, stderr } = await execAsync(
      'mise exec -- bin/rails db:test:clean RAILS_ENV=test',
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
