import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CONTAINER_NAME = 'meme_search_e2e_postgres';
const RAILS_CONTAINER = 'meme_search_e2e_rails';
const DB_NAME = 'meme_search_e2e';
const DB_USER = 'postgres';

/**
 * Execute SQL query in Docker PostgreSQL container
 */
export async function executeDockerSQL(query: string): Promise<string> {
  const command = `docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -t -c "${query}"`;

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('NOTICE')) {
      console.error('SQL stderr:', stderr);
    }
    return stdout.trim();
  } catch (error: any) {
    console.error('SQL execution failed:', error.message);
    throw new Error(`SQL execution failed: ${error.message}`);
  }
}

/**
 * Reset Docker database (truncate all tables)
 */
export async function resetDockerDatabase(): Promise<void> {
  console.log('= Resetting Docker database...');

  const tables = [
    'image_embeddings',
    'image_tags',
    'image_cores',
    'image_paths',
    'tag_names',
    'image_to_texts',
  ];

  for (const table of tables) {
    try {
      await executeDockerSQL(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
      console.log(` Truncated ${table}`);
    } catch (error: any) {
      // Table might not exist yet
      console.warn(`Warning: Could not truncate ${table}:`, error.message);
    }
  }

  console.log(' Database reset complete');
}

/**
 * Seed Docker database with test data
 */
export async function seedDockerDatabase(): Promise<void> {
  console.log('<1 Seeding Docker database...');

  // Run Rails db:seed via Docker
  const command = `docker exec ${RAILS_CONTAINER} bin/rails db:seed`;

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.error('Seed stderr:', stderr);
    }
    console.log('Seed stdout:', stdout);
    console.log(' Database seeded');
  } catch (error: any) {
    throw new Error(`Database seeding failed: ${error.message}`);
  }
}

/**
 * Get table row count
 */
export async function getTableCount(tableName: string): Promise<number> {
  const result = await executeDockerSQL(`SELECT COUNT(*) FROM ${tableName};`);
  return parseInt(result, 10);
}

/**
 * Get ImageCore status by ID
 */
export async function getImageCoreStatus(id: number): Promise<string> {
  const result = await executeDockerSQL(
    `SELECT status FROM image_cores WHERE id = ${id};`
  );
  return result.trim();
}

/**
 * Get all ImageCore records
 */
export async function getAllImageCores(): Promise<any[]> {
  const result = await executeDockerSQL(
    `SELECT id, status, description FROM image_cores;`
  );

  // Parse pipe-separated output
  const rows = result.split('\n').filter((line) => line.trim());
  return rows.map((row) => {
    const [id, status, description] = row.split('|').map((s) => s.trim());
    return { id: parseInt(id, 10), status, description };
  });
}

/**
 * Wait for ImageCore to reach specific status
 */
export async function waitForImageCoreStatus(
  id: number,
  targetStatus: string,
  timeout: number = 30000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await getImageCoreStatus(id);

    if (status === targetStatus) {
      console.log(` ImageCore ${id} reached status: ${targetStatus}`);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `ImageCore ${id} did not reach status ${targetStatus} within ${timeout}ms`
  );
}
