import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { TaskService } from '../task/task.service';
import { MicrosoftService } from './providers/microsoft/microsoft.service';
import { Integration, Task } from '@syntaskio/shared-types';

@Injectable()
export class TaskAggregationService {
  private readonly logger = new Logger(TaskAggregationService.name);

  constructor(
    private readonly integrationService: IntegrationService,
    private readonly taskService: TaskService,
    private readonly microsoftService: MicrosoftService,
  ) {}

  /**
   * Synchronize tasks from all integrations for a user
   * @param userId The user ID to synchronize tasks for
   * @returns Array of synchronized tasks
   */
  async syncTasksForUser(userId: string): Promise<Task[]> {
    try {
      // Get all integrations for the user
      const integrations = await this.integrationService.getIntegrationsByUserId(userId);
      
      const allTasks: Task[] = [];
      
      // For each integration, fetch and sync tasks
      for (const integration of integrations) {
        const tasks = await this.syncTasksForIntegration(integration);
        allTasks.push(...tasks);
      }
      
      this.logger.log(`Synchronized ${allTasks.length} tasks for user ${userId}`);
      return allTasks;
    } catch (error) {
      this.logger.error(`Failed to synchronize tasks for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Synchronize tasks from a specific integration
   * @param integration The integration to synchronize tasks from
   * @returns Array of synchronized tasks
   */
  async syncTasksForIntegration(integration: Integration): Promise<Task[]> {
    try {
      let tasks = [];
      
      // Fetch tasks based on the provider
      switch (integration.provider) {
        case 'microsoft':
          tasks = await this.microsoftService.fetchTasks(integration);
          break;
        // Add cases for other providers as needed
        default:
          this.logger.warn(`Unsupported provider: ${integration.provider}`);
          return [];
      }
      
      // Transform and save tasks
      const savedTasks = await this.transformAndSaveTasks(integration, tasks);
      
      this.logger.log(`Synchronized ${savedTasks.length} tasks from ${integration.provider} for user ${integration.userId}`);
      return savedTasks;
    } catch (error) {
      this.logger.error(`Failed to synchronize tasks from ${integration.provider} for user ${integration.userId}`, error);
      throw error;
    }
  }

  /**
   * Transform external tasks to internal format and save them
   * @param integration The integration the tasks belong to
   * @param externalTasks The external tasks to transform and save
   * @returns Array of saved tasks
   */
  private async transformAndSaveTasks(integration: Integration, externalTasks: any[]): Promise<Task[]> {
    try {
      const savedTasks: Task[] = [];
      
      for (const externalTask of externalTasks) {
        // Transform external task to internal format
        const taskData = this.transformExternalTask(integration, externalTask);
        
        // Save the task
        const savedTask = await this.taskService.createTask(taskData);
        savedTasks.push(savedTask);
      }
      
      return savedTasks;
    } catch (error) {
      this.logger.error(`Failed to transform and save tasks for integration ${integration.id}`, error);
      throw error;
    }
  }

  /**
   * Transform an external task to internal format
   * @param integration The integration the task belongs to
   * @param externalTask The external task to transform
   * @returns Internal task data
   */
  private transformExternalTask(integration: Integration, externalTask: any) {
    // Transform based on provider
    switch (integration.provider) {
      case 'microsoft':
        return this.taskService.transformMicrosoftTask(externalTask, integration.userId, integration.id);
      // Add cases for other providers as needed
      default:
        throw new Error(`Unsupported provider: ${integration.provider}`);
    }
  }


  /**
   * Transform Microsoft task status to internal format
   * @param microsoftStatus The Microsoft task status
   * @returns Internal task status
   */
  private transformMicrosoftTaskStatus(microsoftStatus: string): 'pending' | 'in_progress' | 'completed' {
    switch (microsoftStatus) {
      case 'completed':
        return 'completed';
      case 'inProgress':
        return 'in_progress';
      default:
        return 'pending';
    }
  }

  /**
   * Transform Microsoft task priority to internal format
   * @param microsoftPriority The Microsoft task priority
   * @returns Internal task priority
   */
  private transformMicrosoftTaskPriority(microsoftPriority: string): 'low' | 'medium' | 'high' | undefined {
    switch (microsoftPriority) {
      case 'high':
        return 'high';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }
}
