import axios from 'axios';

const DOCKER_BASE_URL = process.env.DOCKER_BASE_URL || 'http://localhost:3001';
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

export interface ServiceHealthStatus {
  rails: boolean;
  python: boolean;
  postgres: boolean;
  allHealthy: boolean;
}

/**
 * Check if Rails service is healthy
 */
export async function checkRailsHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${DOCKER_BASE_URL}/`, { timeout: 5000 });
    return response.status === 200;
  } catch (error: any) {
    console.error('Rails health check failed:', error.message);
    return false;
  }
}

/**
 * Check if Python service is healthy
 */
export async function checkPythonHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${PYTHON_API_URL}/`, { timeout: 5000 });
    return response.status === 200;
  } catch (error: any) {
    console.error('Python health check failed:', error.message);
    return false;
  }
}

/**
 * Check if PostgreSQL is healthy (via Rails DB connection)
 */
export async function checkPostgresHealth(): Promise<boolean> {
  try {
    // Rails root endpoint requires DB connection
    const response = await axios.get(`${DOCKER_BASE_URL}/`, { timeout: 5000 });
    return response.status === 200;
  } catch (error: any) {
    console.error('Postgres health check failed:', error.message);
    return false;
  }
}

/**
 * Check health of all services
 */
export async function checkAllServicesHealth(): Promise<ServiceHealthStatus> {
  const [rails, python, postgres] = await Promise.all([
    checkRailsHealth(),
    checkPythonHealth(),
    checkPostgresHealth(),
  ]);

  return {
    rails,
    python,
    postgres,
    allHealthy: rails && python && postgres,
  };
}

/**
 * Wait for all services to become healthy
 */
export async function waitForAllServicesHealthy(
  timeout: number = 120000,
  interval: number = 2000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await checkAllServicesHealth();

    if (status.allHealthy) {
      console.log(' All services are healthy');
      return;
    }

    console.log(
      `ó Waiting for services... Rails: ${status.rails ? '' : 'L'}, Python: ${status.python ? '' : 'L'}, Postgres: ${status.postgres ? '' : 'L'}`
    );

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Services did not become healthy within ${timeout}ms`);
}

/**
 * Get detailed service status for debugging
 */
export async function getDetailedServiceStatus(): Promise<{
  rails: { healthy: boolean; error?: string };
  python: { healthy: boolean; error?: string };
  postgres: { healthy: boolean; error?: string };
}> {
  const results = {
    rails: { healthy: false, error: undefined as string | undefined },
    python: { healthy: false, error: undefined as string | undefined },
    postgres: { healthy: false, error: undefined as string | undefined },
  };

  // Check Rails
  try {
    const response = await axios.get(`${DOCKER_BASE_URL}/`, { timeout: 5000 });
    results.rails.healthy = response.status === 200;
  } catch (error: any) {
    results.rails.error = error.message;
  }

  // Check Python
  try {
    const response = await axios.get(`${PYTHON_API_URL}/`, { timeout: 5000 });
    results.python.healthy = response.status === 200;
  } catch (error: any) {
    results.python.error = error.message;
  }

  // Check Postgres (via Rails)
  try {
    const response = await axios.get(`${DOCKER_BASE_URL}/`, { timeout: 5000 });
    results.postgres.healthy = response.status === 200;
  } catch (error: any) {
    results.postgres.error = error.message;
  }

  return results;
}
