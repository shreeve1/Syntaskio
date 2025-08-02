import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  Task, 
  MergedTask, 
  TaskSource, 
  MergeTaskRequest, 
  MergeTaskResponse, 
  UnmergeTaskRequest, 
  UnmergeTaskResponse 
} from '@syntaskio/shared-types';

@Injectable()
export class TaskMergeService {
  private readonly logger = new Logger(TaskMergeService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Merge multiple tasks into a single merged task
   */
  async mergeTasks(request: MergeTaskRequest): Promise<MergeTaskResponse> {
    const { taskIds, userId, mergedBy, primaryTaskId } = request;

    if (taskIds.length < 2) {
      throw new BadRequestException('At least 2 tasks are required for merging');
    }

    try {
      // Fetch all tasks to be merged
      const tasks = await this.prisma.task.findMany({
        where: {
          id: { in: taskIds },
          userId,
        },
      });

      if (tasks.length !== taskIds.length) {
        throw new NotFoundException('One or more tasks not found or not owned by user');
      }

      // Check if any tasks are already merged
      const alreadyMerged = tasks.filter(task => task.mergedTaskId);
      if (alreadyMerged.length > 0) {
        throw new BadRequestException('One or more tasks are already merged');
      }

      // Determine primary task (for title/description)
      const primaryTask = primaryTaskId 
        ? tasks.find(t => t.id === primaryTaskId) || tasks[0]
        : tasks[0];

      // Create merged task
      const mergedTask = await this.createMergedTask(tasks, primaryTask, mergedBy);

      // Update original tasks to reference merged task
      await this.prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: { 
          mergedTaskId: mergedTask.id,
          isMerged: true,
        },
      });

      // Create task sources records
      await this.createTaskSources(mergedTask.id, tasks);

      this.logger.log(`Merged ${taskIds.length} tasks into merged task: ${mergedTask.id}`);

      return {
        mergedTask: this.mapPrismaToMergedTask(mergedTask, tasks),
        originalTasks: taskIds,
      };
    } catch (error) {
      this.logger.error(`Failed to merge tasks: ${taskIds.join(', ')}`, error);
      throw error;
    }
  }

  /**
   * Unmerge a merged task back to individual tasks
   */
  async unmergeTasks(request: UnmergeTaskRequest): Promise<UnmergeTaskResponse> {
    const { mergedTaskId, userId } = request;

    try {
      // Find the merged task
      const mergedTask = await this.prisma.mergedTask.findFirst({
        where: {
          id: mergedTaskId,
          userId,
        },
        include: {
          sources: true,
        },
      });

      if (!mergedTask) {
        throw new NotFoundException('Merged task not found');
      }

      // Get original tasks
      const originalTaskIds = mergedTask.sources.map(source => source.originalTaskId);
      const originalTasks = await this.prisma.task.findMany({
        where: { id: { in: originalTaskIds } },
      });

      // Restore original tasks
      await this.prisma.task.updateMany({
        where: { id: { in: originalTaskIds } },
        data: { 
          mergedTaskId: null,
          isMerged: false,
        },
      });

      // Delete task sources
      await this.prisma.mergedTaskSource.deleteMany({
        where: { mergedTaskId },
      });

      // Delete merged task
      await this.prisma.mergedTask.delete({
        where: { id: mergedTaskId },
      });

      this.logger.log(`Unmerged task: ${mergedTaskId}, restored ${originalTaskIds.length} tasks`);

      return {
        restoredTasks: originalTaskIds,
      };
    } catch (error) {
      this.logger.error(`Failed to unmerge task: ${mergedTaskId}`, error);
      throw error;
    }
  }

  /**
   * Get merged task by ID
   */
  async getMergedTaskById(id: string, userId: string): Promise<MergedTask | null> {
    try {
      const mergedTask = await this.prisma.mergedTask.findFirst({
        where: { id, userId },
        include: {
          sources: {
            include: {
              originalTask: true,
            },
          },
        },
      });

      if (!mergedTask) {
        return null;
      }

      return this.mapPrismaToMergedTaskWithSources(mergedTask);
    } catch (error) {
      this.logger.error(`Failed to get merged task: ${id}`, error);
      throw error;
    }
  }

  /**
   * Get all merged tasks for a user
   */
  async getMergedTasksByUserId(userId: string): Promise<MergedTask[]> {
    try {
      const mergedTasks = await this.prisma.mergedTask.findMany({
        where: { userId },
        include: {
          sources: {
            include: {
              originalTask: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return mergedTasks.map(task => this.mapPrismaToMergedTaskWithSources(task));
    } catch (error) {
      this.logger.error(`Failed to get merged tasks for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Create a new merged task record
   */
  private async createMergedTask(
    tasks: any[],
    primaryTask: any,
    mergedBy: 'auto' | 'manual'
  ) {
    // Determine merged task properties
    const title = primaryTask.title;
    const description = primaryTask.description;
    const status = this.determineMergedStatus(tasks);
    const priority = this.determineMergedPriority(tasks);
    const dueDate = this.determineMergedDueDate(tasks);

    return await this.prisma.mergedTask.create({
      data: {
        userId: primaryTask.userId,
        title,
        description,
        status,
        priority,
        dueDate,
        mergedBy,
        confidence: mergedBy === 'auto' ? 0.75 : null, // Default confidence for auto-merge
      },
    });
  }

  /**
   * Create task source records for merged task
   */
  private async createTaskSources(mergedTaskId: string, tasks: any[]) {
    const sourcesData = tasks.map(task => ({
      mergedTaskId,
      originalTaskId: task.id,
      source: task.source,
      originalTitle: task.title,
      originalDescription: task.description,
      originalStatus: task.status,
      integrationId: task.integrationId,
      lastSyncAt: task.updatedAt,
    }));

    await this.prisma.mergedTaskSource.createMany({
      data: sourcesData,
    });
  }

  /**
   * Determine merged task status from source tasks
   */
  private determineMergedStatus(tasks: any[]): string {
    const statuses = tasks.map(task => task.status);
    
    // If any task is completed, merged task is completed
    if (statuses.includes('completed')) {
      return 'completed';
    }
    
    // If any task is in progress, merged task is in progress
    if (statuses.includes('in_progress')) {
      return 'in_progress';
    }
    
    // Otherwise, pending
    return 'pending';
  }

  /**
   * Determine merged task priority from source tasks
   */
  private determineMergedPriority(tasks: any[]): string | null {
    const priorities = tasks
      .map(task => task.priority)
      .filter(priority => priority !== null);

    if (priorities.length === 0) return null;

    // Return highest priority
    if (priorities.includes('high')) return 'high';
    if (priorities.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Determine merged task due date (earliest non-null due date)
   */
  private determineMergedDueDate(tasks: any[]): Date | null {
    const dueDates = tasks
      .map(task => task.dueDate)
      .filter(date => date !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    return dueDates.length > 0 ? dueDates[0] : null;
  }

  /**
   * Map Prisma merged task to shared-types interface
   */
  private mapPrismaToMergedTask(prismaTask: any, originalTasks: any[]): MergedTask {
    const sources: TaskSource[] = originalTasks.map(task => ({
      taskId: task.id,
      source: task.source,
      originalTitle: task.title,
      originalDescription: task.description,
      originalStatus: task.status,
      integrationId: task.integrationId,
      lastSyncAt: task.updatedAt,
    }));

    const allSources = [...new Set(originalTasks.map(task => task.source))];
    const sourceData = originalTasks.reduce((acc, task) => {
      acc[task.source] = task.sourceData;
      return acc;
    }, {});

    return {
      id: prismaTask.id,
      userId: prismaTask.userId,
      title: prismaTask.title,
      description: prismaTask.description,
      status: prismaTask.status,
      priority: prismaTask.priority,
      dueDate: prismaTask.dueDate,
      sourceIds: originalTasks.map(task => task.id),
      sources,
      mergedAt: prismaTask.createdAt,
      mergedBy: prismaTask.mergedBy,
      confidence: prismaTask.confidence,
      allSources,
      sourceData,
      createdAt: prismaTask.createdAt,
      updatedAt: prismaTask.updatedAt,
    };
  }

  /**
   * Map Prisma merged task with sources to shared-types interface
   */
  private mapPrismaToMergedTaskWithSources(prismaTask: any): MergedTask {
    const sources: TaskSource[] = prismaTask.sources.map((source: any) => ({
      taskId: source.originalTaskId,
      source: source.source,
      originalTitle: source.originalTitle,
      originalDescription: source.originalDescription,
      originalStatus: source.originalStatus,
      integrationId: source.integrationId,
      lastSyncAt: source.lastSyncAt,
    }));

    const allSources = [...new Set(sources.map(source => source.source))];
    const sourceData = prismaTask.sources.reduce((acc: any, source: any) => {
      if (source.originalTask?.sourceData) {
        acc[source.source] = source.originalTask.sourceData;
      }
      return acc;
    }, {});

    return {
      id: prismaTask.id,
      userId: prismaTask.userId,
      title: prismaTask.title,
      description: prismaTask.description,
      status: prismaTask.status,
      priority: prismaTask.priority,
      dueDate: prismaTask.dueDate,
      sourceIds: sources.map(source => source.taskId),
      sources,
      mergedAt: prismaTask.createdAt,
      mergedBy: prismaTask.mergedBy,
      confidence: prismaTask.confidence,
      allSources,
      sourceData,
      createdAt: prismaTask.createdAt,
      updatedAt: prismaTask.updatedAt,
    };
  }
}
