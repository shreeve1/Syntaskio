import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Integration, Task } from '@syntaskio/shared-types';

interface ProcessPlanProcess {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'paused';
  assignedTo: string;
  createdAt: string;
  dueDate: string;
  progress: number;
  currentStep: {
    id: string;
    name: string;
    status: string;
  };
  totalSteps: number;
  completedSteps: number;
}

interface ProcessPlanStep {
  id: string;
  processId: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assignedTo: string;
  order: number;
  estimatedDuration: number;
  dueDate: string;
  dependencies: string[];
  tags: string[];
  priority: 'low' | 'medium' | 'high';
}

interface ProcessPlanApiResponse<T> {
  data?: T;
  processes?: ProcessPlanProcess[];
  steps?: ProcessPlanStep[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

@Injectable()
export class ProcessPlanApiService {
  private readonly logger = new Logger(ProcessPlanApiService.name);
  private readonly baseUrl = 'https://api.processplan.com/v1';
  private readonly rateLimitDelay = 1000; // 1 second between requests

  constructor(private readonly httpService: HttpService) {}

  /**
   * Fetch all tasks from Process Plan (processes and steps)
   * @param integration The Process Plan integration with access token
   * @returns Array of tasks
   */
  async fetchTasks(integration: Integration): Promise<Task[]> {
    try {
      const tasks: Task[] = [];

      // Fetch active processes
      const processes = await this.fetchActiveProcesses(integration);

      // Convert processes to tasks
      for (const process of processes) {
        tasks.push(this.transformProcessToTask(process, integration.userId, integration.id));

        // Fetch steps for each process
        const steps = await this.fetchProcessSteps(integration, process.id);

        // Convert steps to tasks
        for (const step of steps) {
          tasks.push(this.transformStepToTask(step, process, integration.userId, integration.id));
        }

        // Rate limiting
        await this.delay(this.rateLimitDelay);
      }

      this.logger.log(`Fetched ${tasks.length} tasks from Process Plan`);
      return tasks;
    } catch (error) {
      this.logger.error('Failed to fetch tasks from Process Plan', error);
      throw error;
    }
  }

  /**
   * Fetch active processes from Process Plan
   * @param integration The Process Plan integration
   * @returns Array of active processes
   */
  private async fetchActiveProcesses(integration: Integration): Promise<ProcessPlanProcess[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ProcessPlanApiResponse<ProcessPlanProcess[]>>(
          `${this.baseUrl}/processes`,
          {
            headers: {
              Authorization: `Bearer ${integration.accessToken}`,
              'Content-Type': 'application/json',
            },
            params: {
              status: 'active',
              limit: 100,
            },
          },
        ),
      );

      return response.data.processes || [];
    } catch (error) {
      this.logger.error('Failed to fetch active processes', error);
      throw error;
    }
  }

  /**
   * Fetch steps for a specific process
   * @param integration The Process Plan integration
   * @param processId The process ID
   * @returns Array of process steps
   */
  private async fetchProcessSteps(
    integration: Integration,
    processId: string,
  ): Promise<ProcessPlanStep[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ProcessPlanApiResponse<ProcessPlanStep[]>>(
          `${this.baseUrl}/processes/${processId}/steps`,
          {
            headers: {
              Authorization: `Bearer ${integration.accessToken}`,
              'Content-Type': 'application/json',
            },
            params: {
              status: 'pending,in_progress',
            },
          },
        ),
      );

      return response.data.steps || [];
    } catch (error) {
      this.logger.error(`Failed to fetch steps for process ${processId}`, error);
      throw error;
    }
  }

  /**
   * Transform Process Plan process to Syntaskio task
   * @param process The Process Plan process
   * @param userId The user ID
   * @param integrationId The integration ID
   * @returns Syntaskio task
   */
  private transformProcessToTask(process: ProcessPlanProcess, userId: string, integrationId: string): Task {
    return {
      id: `processplan-process-${process.id}`,
      userId,
      integrationId,
      externalId: process.id,
      title: process.name,
      description: process.description,
      status: this.mapProcessPlanStatusToTaskStatus(process.status),
      priority: 'medium',
      dueDate: process.dueDate ? new Date(process.dueDate) : null,
      source: 'processplan',
      sourceData: {
        processId: process.id,
        status: process.status,
        progress: process.progress,
        totalSteps: process.totalSteps,
        completedSteps: process.completedSteps,
        currentStep: process.currentStep,
        assignedTo: process.assignedTo,
        type: 'process',
      },
      // Process Plan-specific fields
      processPlanProcessId: process.id,
      processPlanType: 'process',
      processPlanStatus: process.status,
      processPlanProgress: process.progress,
      processPlanAssignedTo: process.assignedTo,
      processPlanTotalSteps: process.totalSteps,
      processPlanCompletedSteps: process.completedSteps,
      createdAt: new Date(process.createdAt),
      updatedAt: new Date(),
    };
  }

  /**
   * Transform Process Plan step to Syntaskio task
   * @param step The Process Plan step
   * @param process The parent process
   * @param userId The user ID
   * @param integrationId The integration ID
   * @returns Syntaskio task
   */
  private transformStepToTask(
    step: ProcessPlanStep,
    process: ProcessPlanProcess,
    userId: string,
    integrationId: string,
  ): Task {
    return {
      id: `processplan-step-${step.id}`,
      userId,
      integrationId,
      externalId: step.id,
      title: step.name,
      description: step.description,
      status: this.mapProcessPlanStatusToTaskStatus(step.status),
      priority: step.priority,
      dueDate: step.dueDate ? new Date(step.dueDate) : null,
      source: 'processplan',
      sourceData: {
        processId: step.processId,
        processName: process.name,
        stepId: step.id,
        status: step.status,
        order: step.order,
        estimatedDuration: step.estimatedDuration,
        dependencies: step.dependencies,
        tags: step.tags,
        priority: step.priority,
        assignedTo: step.assignedTo,
        type: 'step',
      },
      // Process Plan-specific fields
      processPlanProcessId: step.processId,
      processPlanStepId: step.id,
      processPlanType: 'step',
      processPlanStatus: step.status,
      processPlanOrder: step.order,
      processPlanEstimatedDuration: step.estimatedDuration,
      processPlanDependencies: step.dependencies,
      processPlanTags: step.tags,
      processPlanAssignedTo: step.assignedTo,
      processPlanProcessName: process.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken The refresh token
   * @param clientId The Process Plan app client ID
   * @param clientSecret The Process Plan app client secret
   * @param redirectUri The redirect URI
   * @returns New token data
   */
  async refreshToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/oauth/token`,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.logger.log('Successfully refreshed Process Plan access token');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to refresh Process Plan access token', error);
      throw error;
    }
  }

  /**
   * Map Process Plan status to Syntaskio task status
   * @param processPlanStatus The Process Plan status
   * @returns Syntaskio task status
   */
  private mapProcessPlanStatusToTaskStatus(
    processPlanStatus: string,
  ): 'pending' | 'in_progress' | 'completed' {
    switch (processPlanStatus) {
      case 'pending':
        return 'pending';
      case 'in_progress':
      case 'active':
        return 'in_progress';
      case 'completed':
        return 'completed';
      case 'paused':
      case 'skipped':
      default:
        return 'pending';
    }
  }

  /**
   * Delay execution for rate limiting
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
