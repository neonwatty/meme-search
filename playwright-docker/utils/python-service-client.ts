/**
 * Python Service HTTP Client
 *
 * Type-safe client for interacting with the Python image-to-text service
 * running in Docker at http://localhost:8000
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

export interface AddJobRequest {
  image_id: string;
  image_path: string;
  model_id: string;
  webhook_url_description?: string;
  webhook_url_status?: string;
}

export interface AddJobResponse {
  message: string;
  job_id: number;
  image_id: number;
}

export interface QueueStatusResponse {
  total_jobs: number;
  status_breakdown: Record<string, number>;
}

export interface JobInfo {
  id: number;
  image_id: number;
  image_path: string;
  model_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  model_loaded?: boolean;
}

export class PythonServiceClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Add a job to the processing queue
   */
  async addJob(request: AddJobRequest): Promise<AddJobResponse> {
    try {
      const response = await this.client.post<AddJobResponse>('/add_job', request);
      return response.data;
    } catch (error) {
      this.handleError('addJob', error);
      throw error;
    }
  }

  /**
   * Check the job queue status
   */
  async checkQueue(): Promise<QueueStatusResponse> {
    try {
      const response = await this.client.get<QueueStatusResponse>('/check_queue');
      return response.data;
    } catch (error) {
      this.handleError('checkQueue', error);
      throw error;
    }
  }

  /**
   * Remove a job from the queue
   */
  async removeJob(jobId: number): Promise<{ message: string }> {
    try {
      const response = await this.client.delete(`/remove_job/${jobId}`);
      return response.data;
    } catch (error) {
      this.handleError('removeJob', error);
      throw error;
    }
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await this.client.get<HealthResponse>('/');
      return response.data;
    } catch (error) {
      this.handleError('checkHealth', error);
      throw error;
    }
  }

  /**
   * Wait for service to become healthy
   */
  async waitForHealth(timeoutMs: number = 30000, pollIntervalMs: number = 1000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const health = await this.checkHealth();
        if (health.status === 'healthy' || health.status === 'ok') {
          console.log(`✓ Python service is healthy at ${this.baseURL}`);
          return;
        }
      } catch (error) {
        // Service not responding yet, continue polling
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Python service did not become healthy within ${timeoutMs}ms`);
  }

  /**
   * Get job count by status
   */
  async getJobCountByStatus(status: 'pending' | 'processing' | 'completed' | 'failed'): Promise<number> {
    try {
      const queueStatus = await this.checkQueue();
      return queueStatus.status_breakdown[status] || 0;
    } catch (error) {
      this.handleError('getJobCountByStatus', error);
      throw error;
    }
  }

  /**
   * Wait for queue to be empty (all jobs completed or failed)
   */
  async waitForQueueEmpty(timeoutMs: number = 60000, pollIntervalMs: number = 2000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const queueStatus = await this.checkQueue();
        const pending = queueStatus.status_breakdown['pending'] || 0;
        const processing = queueStatus.status_breakdown['processing'] || 0;

        if (pending === 0 && processing === 0) {
          console.log(`✓ Python queue is empty`);
          return;
        }

        console.log(`⏳ Queue: ${pending} pending, ${processing} processing`);
      } catch (error) {
        console.warn(`Warning: Failed to check queue status: ${error}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Queue did not become empty within ${timeoutMs}ms`);
  }

  /**
   * Get the base URL of the service
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Handle HTTP errors with informative messages
   */
  private handleError(method: string, error: unknown): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        // Server responded with error status
        console.error(
          `PythonServiceClient.${method} failed: ${axiosError.response.status} ${axiosError.response.statusText}`,
          axiosError.response.data
        );
      } else if (axiosError.request) {
        // Request made but no response
        console.error(
          `PythonServiceClient.${method} failed: No response from ${this.baseURL}`,
          axiosError.message
        );
      } else {
        // Error setting up request
        console.error(`PythonServiceClient.${method} failed: ${axiosError.message}`);
      }
    } else {
      console.error(`PythonServiceClient.${method} failed:`, error);
    }
  }
}

/**
 * Default Python service client instance
 */
export const pythonClient = new PythonServiceClient();
