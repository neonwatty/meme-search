/**
 * Workflow helper functions for Docker E2E tests
 *
 * These functions provide high-level operations for testing cross-service workflows:
 * - Image path and ImageCore creation
 * - Description generation triggering
 * - Status monitoring
 * - Python service interaction
 * - Vector search operations
 * - Embedding management
 */

import { execInRailsContainer, execInPythonContainer } from './docker-setup';
import { executeDockerSQL } from './docker-db';
import { STATUS_MAP, ImageStatus, DEFAULT_TIMEOUTS } from '../fixtures/test-data';

export interface ImagePathConfig {
  path: string;
  description?: string;
}

export interface ImageCoreData {
  id: number;
  name: string;
  description: string | null;
  status: number;
  image_path_id: number;
}

export interface PythonQueueStatus {
  total_jobs: number;
  pending: number;
  processing: number;
}

/**
 * Add an image path via Rails console (or find existing)
 */
export async function addImagePath(
  path: string
): Promise<{ id: number }> {
  const escapedPath = path.replace(/'/g, "\\'");

  const command = `bin/rails runner "path = ImagePath.find_or_create_by!(name: '${escapedPath}'); puts path.id"`;

  const result = await execInRailsContainer(command);
  const id = parseInt(result.trim());

  if (isNaN(id)) {
    throw new Error(`Failed to parse ImagePath ID from result: ${result}`);
  }

  console.log(`✓ Found/Created ImagePath ${id}: ${path}`);
  return { id };
}

/**
 * Create a test ImageCore record directly in database
 */
export async function createTestImage(
  fileName: string = 'sample.jpg',
  imagePathId?: number
): Promise<number> {
  // If no imagePathId provided, use existing example_memes_1 directory
  if (!imagePathId) {
    const imagePath = await addImagePath('example_memes_1');
    imagePathId = imagePath.id;
  }

  const escapedName = fileName.replace(/'/g, "''");

  const result = await executeDockerSQL(
    `INSERT INTO image_cores (name, image_path_id, status, created_at, updated_at)
     VALUES ('${escapedName}', ${imagePathId}, 0, NOW(), NOW())
     RETURNING id;`
  );

  const id = parseInt(result.trim());

  if (isNaN(id)) {
    throw new Error(`Failed to parse ImageCore ID from result: ${result}`);
  }

  console.log(`✓ Created ImageCore ${id}: ${fileName}`);
  return id;
}

/**
 * Trigger description generation for an image via Rails
 *
 * This simulates the user clicking "Generate Description" in the UI,
 * which makes an HTTP POST to the Python service /add_job endpoint.
 */
export async function triggerDescriptionGeneration(imageId: number): Promise<void> {
  const command = `bin/rails runner "
    require 'net/http'
    require 'uri'
    require 'json'

    image = ImageCore.find(${imageId})
    image_path = ImagePath.find(image.image_path_id)
    model = ImageToText.find_by(current: true) || ImageToText.first

    # Construct full file path
    full_path = File.join(image_path.name, image.name)

    uri = URI('http://python-service:8000/add_job')
    http = Net::HTTP.new(uri.host, uri.port)
    request = Net::HTTP::Post.new(uri)
    request['Content-Type'] = 'application/json'
    params = {
      'image_core_id' => image.id,
      'image_path' => full_path,
      'model' => (model&.name || 'test')
    }
    request.body = params.to_json

    response = http.request(request)
    puts response.code
    puts response.body if response.code != '200'
  "`;

  try {
    const result = await execInRailsContainer(command);
    const statusCode = result.split('\n')[0].trim();

    if (statusCode !== '200') {
      throw new Error(`Description generation failed with status ${statusCode}: ${result}`);
    }

    console.log(`✓ Triggered description generation for ImageCore ${imageId}`);
  } catch (error: any) {
    console.error(`Failed to trigger description generation: ${error.message}`);
    throw error;
  }
}

/**
 * Wait for image to reach specific status
 *
 * Polls the database every second until the target status is reached or timeout occurs.
 */
export async function waitForImageStatus(
  imageId: number,
  targetStatus: ImageStatus,
  timeoutMs: number = DEFAULT_TIMEOUTS.description_generation
): Promise<void> {
  const targetStatusValue = STATUS_MAP[targetStatus];
  const startTime = Date.now();

  console.log(`⏳ Waiting for ImageCore ${imageId} to reach status '${targetStatus}' (${targetStatusValue})...`);

  while (Date.now() - startTime < timeoutMs) {
    const result = await executeDockerSQL(
      `SELECT status FROM image_cores WHERE id = ${imageId};`
    );

    const currentStatus = parseInt(result.trim());

    if (currentStatus === targetStatusValue) {
      const duration = Date.now() - startTime;
      console.log(`✓ ImageCore ${imageId} reached status '${targetStatus}' after ${duration}ms`);
      return;
    }

    // Check if failed
    if (currentStatus === STATUS_MAP.failed) {
      throw new Error(`ImageCore ${imageId} transitioned to 'failed' status while waiting for '${targetStatus}'`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const currentResult = await executeDockerSQL(
    `SELECT status FROM image_cores WHERE id = ${imageId};`
  );
  const finalStatus = parseInt(currentResult.trim());
  const finalStatusName = Object.keys(STATUS_MAP).find(
    key => STATUS_MAP[key as ImageStatus] === finalStatus
  ) || 'unknown';

  throw new Error(
    `ImageCore ${imageId} did not reach status '${targetStatus}' within ${timeoutMs}ms. ` +
    `Final status: ${finalStatusName} (${finalStatus})`
  );
}

/**
 * Get current image status as numeric value
 */
export async function getImageStatus(imageId: number): Promise<number> {
  const result = await executeDockerSQL(
    `SELECT status FROM image_cores WHERE id = ${imageId};`
  );

  return parseInt(result.trim());
}

/**
 * Get current image status as string name
 */
export async function getImageStatusName(imageId: number): Promise<string> {
  const status = await getImageStatus(imageId);
  return Object.keys(STATUS_MAP).find(
    key => STATUS_MAP[key as ImageStatus] === status
  ) || 'unknown';
}

/**
 * Check Python service job queue status
 *
 * Queries the SQLite database directly to get queue statistics.
 */
export async function checkPythonQueue(): Promise<PythonQueueStatus> {
  const command = `python3 -c "
import sqlite3
import json

try:
    conn = sqlite3.connect('/app/db/job_queue.db')
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) FROM jobs')
    total = cursor.fetchone()[0]

    # Note: Python service's jobs table has no status column
    # All jobs in the table are pending/processing
    result = {'total': total, 'pending': total, 'processing': 0}
    print(json.dumps(result))

    conn.close()
except Exception as e:
    print(json.dumps({'error': str(e)}))
"`;

  try {
    const result = await execInPythonContainer(command);
    const data = JSON.parse(result);

    if (data.error) {
      throw new Error(`Python queue check failed: ${data.error}`);
    }

    return {
      total_jobs: data.total,
      pending: data.pending,
      processing: data.processing,
    };
  } catch (error: any) {
    console.error(`Failed to check Python queue: ${error.message}`);
    throw error;
  }
}

/**
 * Perform vector search via Rails
 *
 * Computes query embedding and finds nearest neighbors.
 */
export async function vectorSearch(
  query: string,
  limit: number = 10
): Promise<ImageCoreData[]> {
  const escapedQuery = query.replace(/'/g, "\\'");

  const command = `bin/rails runner "
    # Compute query embedding
    embedding = \\$embedding_model.call('${escapedQuery}')

    # Find neighbors
    results = ImageEmbedding.limit(${limit}).nearest_neighbors(
      :embedding,
      embedding,
      distance: 'cosine'
    ).map(&:image_core).uniq.compact

    # Output in parseable format
    results.each do |img|
      puts [img.id, img.name, img.description || '', img.status, img.image_path_id].join('|')
    end
  "`;

  try {
    const result = await execInRailsContainer(command);

    if (!result || result.trim() === '') {
      return [];
    }

    const lines = result.trim().split('\n');
    return lines.map(line => {
      const [id, name, description, status, image_path_id] = line.split('|');
      return {
        id: parseInt(id),
        name,
        description: description || null,
        status: parseInt(status),
        image_path_id: parseInt(image_path_id),
      };
    });
  } catch (error: any) {
    console.error(`Vector search failed: ${error.message}`);
    throw error;
  }
}

/**
 * Refresh embeddings for an image
 *
 * Chunks the description and creates embedding records.
 */
export async function refreshEmbeddings(imageId: number): Promise<void> {
  const command = `bin/rails runner "
    image = ImageCore.find(${imageId})
    image.refresh_description_embeddings

    embedding_count = ImageEmbedding.where(image_core_id: ${imageId}).count
    puts embedding_count
  "`;

  try {
    const result = await execInRailsContainer(command);
    const count = parseInt(result.trim());

    console.log(`✓ Refreshed embeddings for ImageCore ${imageId}: ${count} embedding(s) created`);
  } catch (error: any) {
    console.error(`Failed to refresh embeddings: ${error.message}`);
    throw error;
  }
}

/**
 * Create test image with description already generated
 *
 * This bypasses the async generation process for faster test setup.
 */
export async function createTestImageWithDescription(
  description: string,
  tags: string[] = [],
  fileName?: string
): Promise<number> {
  // Create base image
  const imageId = await createTestImage(fileName);

  // Update description and status directly
  const escapedDesc = description.replace(/'/g, "''");
  await executeDockerSQL(
    `UPDATE image_cores SET description = '${escapedDesc}', status = 3 WHERE id = ${imageId};`
  );

  console.log(`✓ Set description for ImageCore ${imageId}`);

  // Add tags if provided
  if (tags.length > 0) {
    for (const tagName of tags) {
      const escapedTag = tagName.replace(/'/g, "''");

      // Create or get tag (using INSERT ... ON CONFLICT)
      const tagResult = await executeDockerSQL(
        `INSERT INTO tag_names (name, color, created_at, updated_at)
         VALUES ('${escapedTag}', '#000000', NOW(), NOW())
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id;`
      );
      const tagId = parseInt(tagResult.trim());

      // Associate with image
      await executeDockerSQL(
        `INSERT INTO image_tags (image_core_id, tag_name_id, created_at, updated_at)
         VALUES (${imageId}, ${tagId}, NOW(), NOW());`
      );

      console.log(`✓ Added tag '${tagName}' to ImageCore ${imageId}`);
    }
  }

  // Refresh embeddings
  await refreshEmbeddings(imageId);

  return imageId;
}

/**
 * Delete an image and clean up related records
 */
export async function deleteTestImage(imageId: number): Promise<void> {
  // Delete embeddings first (foreign key constraint)
  await executeDockerSQL(
    `DELETE FROM image_embeddings WHERE image_core_id = ${imageId};`
  );

  // Delete image tags
  await executeDockerSQL(
    `DELETE FROM image_tags WHERE image_core_id = ${imageId};`
  );

  // Delete image core
  await executeDockerSQL(
    `DELETE FROM image_cores WHERE id = ${imageId};`
  );

  console.log(`✓ Deleted ImageCore ${imageId} and related records`);
}

/**
 * Get image description
 */
export async function getImageDescription(imageId: number): Promise<string | null> {
  const result = await executeDockerSQL(
    `SELECT description FROM image_cores WHERE id = ${imageId};`
  );

  const description = result.trim();
  return description === '' ? null : description;
}

/**
 * Get embedding count for an image
 */
export async function getEmbeddingCount(imageId: number): Promise<number> {
  const result = await executeDockerSQL(
    `SELECT COUNT(*) FROM image_embeddings WHERE image_core_id = ${imageId};`
  );

  return parseInt(result.trim());
}

/**
 * Wait for a condition to be true with polling
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeoutMs: number,
  pollIntervalMs: number = 1000,
  description: string = 'condition'
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      const duration = Date.now() - startTime;
      console.log(`✓ ${description} satisfied after ${duration}ms`);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
}

/**
 * Keyword search (non-vector) via Rails
 */
export async function keywordSearch(
  query: string,
  limit: number = 10
): Promise<ImageCoreData[]> {
  const escapedQuery = query.replace(/'/g, "\\'");

  const command = `bin/rails runner "
    results = ImageCore.search_any_word('${escapedQuery}').limit(${limit})

    results.each do |img|
      puts [img.id, img.name, img.description || '', img.status, img.image_path_id].join('|')
    end
  "`;

  try {
    const result = await execInRailsContainer(command);

    if (!result || result.trim() === '') {
      return [];
    }

    const lines = result.trim().split('\n');
    return lines.map(line => {
      const [id, name, description, status, image_path_id] = line.split('|');
      return {
        id: parseInt(id),
        name,
        description: description || null,
        status: parseInt(status),
        image_path_id: parseInt(image_path_id),
      };
    });
  } catch (error: any) {
    console.error(`Keyword search failed: ${error.message}`);
    throw error;
  }
}
