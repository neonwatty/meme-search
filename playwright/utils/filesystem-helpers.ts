import * as fs from 'fs';
import * as path from 'path';

/**
 * Filesystem helpers for E2E tests
 * Manages test image files in meme directories
 */

const MEMES_DIR = path.join(__dirname, '../../meme_search_pro/meme_search_app/public/memes');

/**
 * Copy a file from source to destination
 *
 * @param sourcePath - Absolute path to source file
 * @param destPath - Absolute path to destination file
 */
export async function copyFile(sourcePath: string, destPath: string): Promise<void> {
  try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Copied file: ${path.basename(destPath)}`);
  } catch (error) {
    console.error(`❌ Failed to copy file: ${error}`);
    throw error;
  }
}

/**
 * Delete a file if it exists
 *
 * @param filePath - Absolute path to file
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Deleted file: ${path.basename(filePath)}`);
    } else {
      console.log(`⚠️ File doesn't exist, skipping delete: ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Failed to delete file: ${error}`);
    throw error;
  }
}

/**
 * Check if a file exists
 *
 * @param filePath - Absolute path to file
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Get full path to a meme directory
 *
 * @param dirName - Directory name (e.g., 'test_valid_directory')
 */
export function getMemesDirPath(dirName: string): string {
  return path.join(MEMES_DIR, dirName);
}

/**
 * Get full path to a file in a meme directory
 *
 * @param dirName - Directory name
 * @param fileName - File name
 */
export function getMemeFilePath(dirName: string, fileName: string): string {
  return path.join(MEMES_DIR, dirName, fileName);
}

/**
 * Get source test image path (from test_valid_directory)
 */
export function getTestImageSource(): string {
  return getMemeFilePath('test_valid_directory', 'test_image.jpg');
}

/**
 * Add a test image to a directory by copying from test_valid_directory
 *
 * @param dirName - Target directory name
 * @param fileName - Name for the new file
 */
export async function addTestImage(dirName: string, fileName: string): Promise<void> {
  const sourcePath = getTestImageSource();
  const destPath = getMemeFilePath(dirName, fileName);

  if (!fileExists(sourcePath)) {
    throw new Error(`Source test image not found: ${sourcePath}`);
  }

  await copyFile(sourcePath, destPath);
}

/**
 * Remove a test image from a directory
 *
 * @param dirName - Directory name
 * @param fileName - File name to remove
 */
export async function removeTestImage(dirName: string, fileName: string): Promise<void> {
  const filePath = getMemeFilePath(dirName, fileName);
  await deleteFile(filePath);
}

/**
 * Clean up test images (remove all .jpg files except test_image.jpg from test directories)
 * Call this in afterEach to ensure clean state
 */
export async function cleanupTestImages(): Promise<void> {
  const testDirs = ['test_valid_directory', 'test_empty_directory'];

  for (const dirName of testDirs) {
    const dirPath = getMemesDirPath(dirName);

    if (!fs.existsSync(dirPath)) {
      continue;
    }

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      // Keep test_image.jpg in test_valid_directory, remove all other images
      if (file === 'test_image.jpg' && dirName === 'test_valid_directory') {
        continue;
      }

      // Remove .jpg, .jpeg, .png, .webp files (but not .gitkeep)
      if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
        const filePath = path.join(dirPath, file);
        await deleteFile(filePath);
      }
    }
  }

  // Ensure test_image.jpg exists in test_valid_directory
  const testImagePath = getMemeFilePath('test_valid_directory', 'test_image.jpg');
  if (!fs.existsSync(testImagePath)) {
    // Copy from example_memes_1
    const sourcePath = getMemeFilePath('example_memes_1', 'all the fucks.jpg');
    if (fs.existsSync(sourcePath)) {
      await copyFile(sourcePath, testImagePath);
    }
  }

  console.log('✅ Cleaned up test images');
}

/**
 * List all image files in a directory
 *
 * @param dirName - Directory name
 */
export function listImagesInDir(dirName: string): string[] {
  const dirPath = getMemesDirPath(dirName);

  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = fs.readdirSync(dirPath);
  return files.filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));
}
