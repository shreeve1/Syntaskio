import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Task, CreateTaskData, UpdateTaskData } from '@syntaskio/shared-types';

export interface TaskFilters {
  page: number;
  limit: number;
  status?: 'pending' | 'in_progress' | 'completed';
  source?: 'microsoft' | 'connectwise' | 'processplan';
  priority?: 'low' | 'medium' | 'high';
  search?: string;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(private prisma: PrismaService) {}

  async createTask(createTaskData: CreateTaskData): Promise<Task> {
    try {
      // Check if task already exists for this integration and external ID
      const existingTask = await this.prisma.task.findUnique({
        where: {
          integrationId_externalId: {
            integrationId: createTaskData.integrationId,
            externalId: createTaskData.externalId,
          },
        },
      });

      if (existingTask) {
        // If task exists, update it instead of creating a new one
        return this.updateTask(existingTask.id, {
          title: createTaskData.title,
          description: createTaskData.description,
          status: createTaskData.status,
          priority: createTaskData.priority,
          dueDate: createTaskData.dueDate,
          sourceData: createTaskData.sourceData,
        });
      }

      const task = await this.prisma.task.create({
        data: {
          userId: createTaskData.userId,
          integrationId: createTaskData.integrationId,
          externalId: createTaskData.externalId,
          title: createTaskData.title,
          description: createTaskData.description,
          status: createTaskData.status,
          priority: createTaskData.priority,
          dueDate: createTaskData.dueDate,
          source: createTaskData.source,
          sourceData: createTaskData.sourceData,
        },
      });

      // Map Prisma model to shared-types interface
      const mappedTask: Task = {
        id: task.id,
        userId: task.userId,
        integrationId: task.integrationId,
        externalId: task.externalId,
        title: task.title,
        description: task.description,
        status: task.status as 'pending' | 'in_progress' | 'completed',
        priority: task.priority as 'low' | 'medium' | 'high',
        dueDate: task.dueDate,
        source: task.source as 'microsoft' | 'connectwise' | 'processplan',
        sourceData: task.sourceData as object,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };

      this.logger.log(`Task created: ${task.id}`);
      return mappedTask;
    } catch (error) {
      this.logger.error(`Failed to create task`, error);
      throw error;
    }
  }

  async getTaskById(id: string): Promise<Task | null> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id },
      });

      if (!task) {
        return null;
      }

      // Map Prisma model to shared-types interface
      const mappedTask: Task = {
        id: task.id,
        userId: task.userId,
        integrationId: task.integrationId,
        externalId: task.externalId,
        title: task.title,
        description: task.description,
        status: task.status as 'pending' | 'in_progress' | 'completed',
        priority: task.priority as 'low' | 'medium' | 'high',
        dueDate: task.dueDate,
        source: task.source as 'microsoft' | 'connectwise' | 'processplan',
        sourceData: task.sourceData as object,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };

      return mappedTask;
    } catch (error) {
      this.logger.error(`Failed to find task by ID: ${id}`, error);
      throw error;
    }
  }

  async getTasksByIntegrationId(integrationId: string): Promise<Task[]> {
    try {
      const tasks = await this.prisma.task.findMany({
        where: { integrationId },
        orderBy: { createdAt: 'desc' },
      });

      // Map Prisma models to shared-types interfaces
      const mappedTasks: Task[] = tasks.map(task => ({
        id: task.id,
        userId: task.userId,
        integrationId: task.integrationId,
        externalId: task.externalId,
        title: task.title,
        description: task.description,
        status: task.status as 'pending' | 'in_progress' | 'completed',
        priority: task.priority as 'low' | 'medium' | 'high',
        dueDate: task.dueDate,
        source: task.source as 'microsoft' | 'connectwise' | 'processplan',
        sourceData: task.sourceData as object,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }));

      return mappedTasks;
    } catch (error) {
      this.logger.error(`Failed to find tasks for integration ${integrationId}`, error);
      throw error;
    }
  }

  async getTasksByUserId(userId: string): Promise<Task[]> {
    try {
      const tasks = await this.prisma.task.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      // Map Prisma models to shared-types interfaces
      const mappedTasks: Task[] = tasks.map(task => ({
        id: task.id,
        userId: task.userId,
        integrationId: task.integrationId,
        externalId: task.externalId,
        title: task.title,
        description: task.description,
        status: task.status as 'pending' | 'in_progress' | 'completed',
        priority: task.priority as 'low' | 'medium' | 'high',
        dueDate: task.dueDate,
        source: task.source as 'microsoft' | 'connectwise' | 'processplan',
        sourceData: task.sourceData as object,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }));

      return mappedTasks;
    } catch (error) {
      this.logger.error(`Failed to find tasks for user ${userId}`, error);
      throw error;
    }
  }

  async getTasksByUserIdWithPagination(userId: string, filters: TaskFilters): Promise<TaskListResponse> {
    try {
      const { page, limit, status, source, priority, search } = filters;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { userId };

      if (status) {
        where.status = status;
      }

      if (source) {
        where.source = source;
      }

      if (priority) {
        where.priority = priority;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get total count for pagination
      const total = await this.prisma.task.count({ where });

      // Get paginated tasks
      const tasks = await this.prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // Map Prisma models to shared-types interfaces
      const mappedTasks: Task[] = tasks.map(task => ({
        id: task.id,
        userId: task.userId,
        integrationId: task.integrationId,
        externalId: task.externalId,
        title: task.title,
        description: task.description,
        status: task.status as 'pending' | 'in_progress' | 'completed',
        priority: task.priority as 'low' | 'medium' | 'high',
        dueDate: task.dueDate,
        source: task.source as 'microsoft' | 'connectwise' | 'processplan',
        sourceData: task.sourceData as object,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }));

      const hasMore = skip + tasks.length < total;

      this.logger.log(`Retrieved ${mappedTasks.length} tasks (page ${page}) for user: ${userId}`);

      return {
        tasks: mappedTasks,
        total,
        page,
        limit,
        hasMore,
      };
    } catch (error) {
      this.logger.error(`Failed to get paginated tasks for user: ${userId}`, error);
      throw error;
    }
  }

  async updateTask(id: string, updateTaskData: UpdateTaskData): Promise<Task> {
    try {
      const task = await this.prisma.task.update({
        where: { id },
        data: updateTaskData,
      });

      // Map Prisma model to shared-types interface
      const mappedTask: Task = {
        id: task.id,
        userId: task.userId,
        integrationId: task.integrationId,
        externalId: task.externalId,
        title: task.title,
        description: task.description,
        status: task.status as 'pending' | 'in_progress' | 'completed',
        priority: task.priority as 'low' | 'medium' | 'high',
        dueDate: task.dueDate,
        source: task.source as 'microsoft' | 'connectwise' | 'processplan',
        sourceData: task.sourceData as object,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };

      this.logger.log(`Task updated: ${id}`);
      return mappedTask;
    } catch (error) {
      this.logger.error(`Failed to update task: ${id}`, error);
      
      if (error.code === 'P2025') {
        throw new NotFoundException('Task not found');
      }
      
      throw error;
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      await this.prisma.task.delete({
        where: { id },
      });

      this.logger.log(`Task deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete task: ${id}`, error);
      
      if (error.code === 'P2025') {
        throw new NotFoundException('Task not found');
      }
      
      throw error;
    }
  }

  async deleteTasksByIntegrationId(integrationId: string): Promise<void> {
    try {
      await this.prisma.task.deleteMany({
        where: { integrationId },
      });

      this.logger.log(`Tasks deleted for integration: ${integrationId}`);
    } catch (error) {
      this.logger.error(`Failed to delete tasks for integration: ${integrationId}`, error);
      throw error;
    }
  }

  /**
   * Transform Microsoft Todo task to internal task format
   * @param microsoftTask The Microsoft Todo task
   * @param userId The user ID
   * @param integrationId The integration ID
   * @returns Transformed task data
   */
  transformMicrosoftTask(microsoftTask: any, userId: string, integrationId: string): CreateTaskData {
    // Map Microsoft Todo status to internal status
    let status: 'pending' | 'in_progress' | 'completed' = 'pending';
    if (microsoftTask.status === 'completed') {
      status = 'completed';
    } else if (microsoftTask.status === 'inProgress') {
      status = 'in_progress';
    }

    // Map Microsoft Todo priority to internal priority
    let priority: 'low' | 'medium' | 'high' | undefined;
    if (microsoftTask.importance === 'high') {
      priority = 'high';
    } else if (microsoftTask.importance === 'normal') {
      priority = 'medium';
    } else if (microsoftTask.importance === 'low') {
      priority = 'low';
    }

    return {
      userId,
      integrationId,
      externalId: microsoftTask.id,
      title: microsoftTask.title,
      description: microsoftTask.body?.content || undefined,
      status,
      priority,
      dueDate: microsoftTask.dueDateTime ? new Date(microsoftTask.dueDateTime.dateTime) : undefined,
      source: 'microsoft',
      sourceData: microsoftTask,
    };
  }
}
