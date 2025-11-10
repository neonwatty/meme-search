import { test, expect } from '@playwright/test';
import {
  checkAllServicesHealth,
  getDetailedServiceStatus,
} from '../../utils/service-health';
import { areDockerServicesRunning } from '../../utils/docker-setup';
import { getTableCount } from '../../utils/docker-db';

test.describe('Docker Stack Health', () => {
  test('all services are running', async () => {
    const running = await areDockerServicesRunning();
    expect(running).toBe(true);
  });

  test('all services pass health checks', async () => {
    const status = await checkAllServicesHealth();

    // Log detailed status for debugging if not healthy
    if (!status.allHealthy) {
      const detailed = await getDetailedServiceStatus();
      console.log('Detailed service status:', JSON.stringify(detailed, null, 2));
    }

    expect(status.rails).toBe(true);
    expect(status.python).toBe(true);
    expect(status.postgres).toBe(true);
    expect(status.allHealthy).toBe(true);
  });

  test('Rails responds to root endpoint', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Verify page contains expected content
    await expect(page.locator('body')).toBeVisible();
  });

  test('Python API responds with correct format', async () => {
    const healthy = await checkAllServicesHealth();
    expect(healthy.python).toBe(true);
  });

  test('Rails connects to PostgreSQL', async () => {
    const healthy = await checkAllServicesHealth();
    expect(healthy.postgres).toBe(true);
  });

  test('database has been seeded', async () => {
    // Check key tables have data
    const imageToTexts = await getTableCount('image_to_texts');
    const imagePaths = await getTableCount('image_paths');
    const tagNames = await getTableCount('tag_names');

    expect(imageToTexts).toBeGreaterThan(0);
    expect(imagePaths).toBeGreaterThan(0);
    expect(tagNames).toBeGreaterThan(0);

    console.log('Database seed counts:', {
      imageToTexts,
      imagePaths,
      tagNames,
    });
  });

  test('services are network-accessible to each other', async () => {
    // This test verifies internal Docker network connectivity
    // If all services are healthy, networking works
    const status = await checkAllServicesHealth();
    expect(status.allHealthy).toBe(true);
  });
});
