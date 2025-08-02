import { Injectable, Logger } from '@nestjs/common';
import { Task, DuplicateDetectionConfig } from '@syntaskio/shared-types';
import { DuplicateDetectorService } from './duplicate-detector.service';
import { DeduplicationService } from './deduplication.service';
import { TaskMergeService } from './task-merge.service';

@Injectable()
export class DuplicateDetectionPipelineService {
  private readonly logger = new Logger(DuplicateDetectionPipelineService.name);

  constructor(
    private duplicateDetectorService: DuplicateDetectorService,
    private deduplicationService: DeduplicationService,
    private taskMergeService: TaskMergeService,
  ) {}

  /**
   * Process a new task for duplicate detection during task aggregation
   * This is called by the task aggregation service when new tasks are synced
   */
  async processNewTaskForDuplicates(
    newTask: Task,
    existingUserTasks: Task[],
    config?: Partial<DuplicateDetectionConfig>
  ): Promise<{
    isDuplicate: boolean;
    mergedTaskId?: string;
    duplicateCandidateId?: string;
    autoMerged: boolean;
  }> {
    try {
      this.logger.log(`Processing new task for duplicates: ${newTask.id}`);

      // Filter out already merged tasks and the new task itself
      const candidateTasks = existingUserTasks.filter(
        task => !task.isMerged && task.id !== newTask.id
      );

      if (candidateTasks.length === 0) {
        return { isDuplicate: false, autoMerged: false };
      }

      let bestMatch: {
        task: Task;
        score: any;
      } | null = null;

      // Find the best matching task
      for (const candidateTask of candidateTasks) {
        const score = await this.duplicateDetectorService.calculateDuplicateScore(
          newTask,
          candidateTask,
          config
        );

        if (score.overallScore >= (config?.suggestionThreshold || 0.60)) {
          if (!bestMatch || score.overallScore > bestMatch.score.overallScore) {
            bestMatch = { task: candidateTask, score };
          }
        }
      }

      if (!bestMatch) {
        return { isDuplicate: false, autoMerged: false };
      }

      // Create duplicate candidate record
      const candidate = await this.deduplicationService.createDuplicateCandidatePublic(
        newTask,
        bestMatch.task,
        bestMatch.score
      );

      // Auto-merge if confidence is high enough
      if (bestMatch.score.confidence === 'high' && 
          bestMatch.score.overallScore >= (config?.autoMergeThreshold || 0.75)) {
        try {
          const mergeResult = await this.taskMergeService.mergeTasks({
            taskIds: [newTask.id, bestMatch.task.id],
            userId: newTask.userId,
            mergedBy: 'auto',
          });

          // Update candidate status
          await this.deduplicationService.updateCandidateStatusPublic(
            candidate.id,
            'auto_merged'
          );

          this.logger.log(`Auto-merged tasks ${newTask.id} and ${bestMatch.task.id} into ${mergeResult.mergedTask.id}`);

          return {
            isDuplicate: true,
            mergedTaskId: mergeResult.mergedTask.id,
            duplicateCandidateId: candidate.id,
            autoMerged: true,
          };
        } catch (error) {
          this.logger.error(`Failed to auto-merge tasks ${newTask.id} and ${bestMatch.task.id}`, error);
          
          return {
            isDuplicate: true,
            duplicateCandidateId: candidate.id,
            autoMerged: false,
          };
        }
      }

      return {
        isDuplicate: true,
        duplicateCandidateId: candidate.id,
        autoMerged: false,
      };
    } catch (error) {
      this.logger.error(`Failed to process new task for duplicates: ${newTask.id}`, error);
      return { isDuplicate: false, autoMerged: false };
    }
  }

  /**
   * Background job to detect duplicates in existing tasks
   * This should be run periodically to find duplicates in historical data
   */
  async runBackgroundDuplicateDetection(
    userId: string,
    batchSize: number = 50,
    config?: Partial<DuplicateDetectionConfig>
  ): Promise<{
    processed: number;
    duplicatesFound: number;
    autoMerged: number;
    errors: number;
  }> {
    try {
      this.logger.log(`Starting background duplicate detection for user: ${userId}`);

      const result = await this.deduplicationService.detectDuplicatesForUser(
        userId,
        config
      );

      return {
        processed: result.duplicates.length,
        duplicatesFound: result.duplicates.length,
        autoMerged: result.autoMerged.length,
        errors: 0,
      };
    } catch (error) {
      this.logger.error(`Background duplicate detection failed for user: ${userId}`, error);
      return {
        processed: 0,
        duplicatesFound: 0,
        autoMerged: 0,
        errors: 1,
      };
    }
  }

  /**
   * Optimize duplicate detection performance for large datasets
   */
  async optimizedDuplicateDetection(
    tasks: Task[],
    config?: Partial<DuplicateDetectionConfig>
  ): Promise<{
    candidates: Array<{
      task1: Task;
      task2: Task;
      score: any;
    }>;
    processingTime: number;
  }> {
    const startTime = Date.now();
    const candidates: Array<{ task1: Task; task2: Task; score: any }> = [];

    try {
      // Pre-filter tasks by source to avoid unnecessary comparisons
      const tasksBySource = tasks.reduce((acc, task) => {
        if (!acc[task.source]) acc[task.source] = [];
        acc[task.source].push(task);
        return acc;
      }, {} as Record<string, Task[]>);

      // Only compare tasks from different sources
      const sources = Object.keys(tasksBySource);
      for (let i = 0; i < sources.length; i++) {
        for (let j = i + 1; j < sources.length; j++) {
          const source1Tasks = tasksBySource[sources[i]];
          const source2Tasks = tasksBySource[sources[j]];

          for (const task1 of source1Tasks) {
            for (const task2 of source2Tasks) {
              const score = await this.duplicateDetectorService.calculateDuplicateScore(
                task1,
                task2,
                config
              );

              if (score.overallScore >= (config?.suggestionThreshold || 0.60)) {
                candidates.push({ task1, task2, score });
              }
            }
          }
        }
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`Optimized duplicate detection completed in ${processingTime}ms, found ${candidates.length} candidates`);

      return { candidates, processingTime };
    } catch (error) {
      this.logger.error('Optimized duplicate detection failed', error);
      return { candidates, processingTime: Date.now() - startTime };
    }
  }

  /**
   * Real-time duplicate checking for task updates
   */
  async checkTaskUpdateForDuplicates(
    updatedTask: Task,
    existingUserTasks: Task[],
    config?: Partial<DuplicateDetectionConfig>
  ): Promise<{
    newDuplicates: string[];
    resolvedDuplicates: string[];
  }> {
    try {
      // This would be called when a task is updated to check if it now matches
      // or no longer matches existing duplicates
      const newDuplicates: string[] = [];
      const resolvedDuplicates: string[] = [];

      // Implementation would check for new matches and resolved matches
      // This is a placeholder for the real-time update logic

      return { newDuplicates, resolvedDuplicates };
    } catch (error) {
      this.logger.error(`Failed to check task update for duplicates: ${updatedTask.id}`, error);
      return { newDuplicates: [], resolvedDuplicates: [] };
    }
  }
}
