import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

const COMPOSE_FILE = 'docker-compose.e2e.yml';

/**
 * Check if Docker Compose services are running
 */
export async function areDockerServicesRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker compose -f ${COMPOSE_FILE} ps --services --filter "status=running" 2>/dev/null`
    );

    const runningServices = stdout
      .trim()
      .split('\n')
      .filter((s) => s.length > 0);

    // Should have 3 services: postgres, rails-app, python-service
    return runningServices.length === 3;
  } catch (error) {
    return false;
  }
}

/**
 * Get Docker Compose service logs
 */
export async function getDockerServiceLogs(
  service: 'postgres' | 'rails-app' | 'python-service',
  tailLines: number = 50
): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `docker compose -f ${COMPOSE_FILE} logs --tail=${tailLines} ${service}`
    );
    return stdout;
  } catch (error: any) {
    return `Error fetching logs: ${error.message}`;
  }
}

/**
 * Execute command in Rails container
 */
export async function execInRailsContainer(command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `docker exec meme_search_e2e_rails ${command}`
    );
    return stdout.trim();
  } catch (error: any) {
    throw new Error(`Failed to execute in Rails container: ${error.message}`);
  }
}

/**
 * Execute command in Python container
 */
export async function execInPythonContainer(command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `docker exec meme_search_e2e_python ${command}`
    );
    return stdout.trim();
  } catch (error: any) {
    throw new Error(`Failed to execute in Python container: ${error.message}`);
  }
}

/**
 * Verify Docker Compose file exists and is valid
 */
export function verifyDockerComposeFile(): boolean {
  try {
    return fs.existsSync(COMPOSE_FILE);
  } catch (error) {
    return false;
  }
}

/**
 * Get container status for all services
 */
export async function getContainerStatus(): Promise<{
  postgres: string;
  rails: string;
  python: string;
}> {
  try {
    const { stdout } = await execAsync(
      `docker compose -f ${COMPOSE_FILE} ps --format json`
    );

    const containers = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    const status = {
      postgres: 'not_running',
      rails: 'not_running',
      python: 'not_running',
    };

    containers.forEach((container: any) => {
      if (container.Service === 'postgres') {
        status.postgres = container.State;
      } else if (container.Service === 'rails-app') {
        status.rails = container.State;
      } else if (container.Service === 'python-service') {
        status.python = container.State;
      }
    });

    return status;
  } catch (error: any) {
    console.error('Failed to get container status:', error.message);
    return {
      postgres: 'error',
      rails: 'error',
      python: 'error',
    };
  }
}
