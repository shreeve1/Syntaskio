import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskService } from '../task/task.service';
import { DuplicateDetectorService } from './duplicate-detector.service';
import { TaskMergeService } from './task-merge.service';
import { 
  Task,
  DuplicateCandidate,
  DuplicateDetectionResult,
  DuplicateDetectionConfig,
  DuplicateReviewRequest,
  DuplicateReviewResponse,
  MergeTaskRequest
} from '@syntaskio/shared-types';

@Injectable()
export class DeduplicationService {
  private readonly logger = new Logger(DeduplicationService.name);

  constructor(
    private prisma: PrismaService,
    private taskService: TaskService,
    private duplicateDetectorService: DuplicateDetectorService,
    private taskMergeService: TaskMergeService,
  ) {}

  /**
   * Detect duplicates for a user's tasks
   */
  async detectDuplicatesForUser(
    userId: string,
    config?: Partial<DuplicateDetectionConfig>
  ): Promise<DuplicateDetectionResult> {
    try {
      this.logger.log(`Starting duplicate detection for user: ${userId}`);

      // Get all non-merged tasks for the user
      const tasks = await this.taskService.getTasksByUserId(userId);
      const nonMergedTasks = tasks.filter(task => !task.isMerged);

      if (nonMergedTasks.length < 2) {
        return {
          duplicates: [],
          autoMerged: [],
          suggestions: [],
        };
      }

      const duplicates: DuplicateCandidate[] = [];
      const autoMerged: string[] = [];
      const suggestions: DuplicateCandidate[] = [];

      // Compare each task with every other task
      for (let i = 0; i < nonMergedTasks.length; i++) {
        for (let j = i + 1; j < nonMergedTasks.length; j++) {
          const task1 = nonMergedTasks[i];
          const task2 = nonMergedTasks[j];

          // Skip if already processed this pair
          const existingCandidate = await this.findExistingCandidate(task1.id, task2.id);
          if (existingCandidate) {
            continue;
          }

          const score = await this.duplicateDetectorService.calculateDuplicateScore(
            task1,
            task2,
            config
          );

          if (score.overallScore >= (config?.suggestionThreshold || 0.60)) {
            const candidate = await this.createDuplicateCandidate(task1, task2, score);
            duplicates.push(candidate);

            if (score.confidence === 'high' && score.overallScore >= (config?.autoMergeThreshold || 0.75)) {
              // Auto-merge high confidence duplicates
              try {
                const mergeRequest: MergeTaskRequest = {
                  taskIds: [task1.id, task2.id],
                  userId,
                  mergedBy: 'auto',
                };

                const mergeResult = await this.taskMergeService.mergeTasks(mergeRequest);
                autoMerged.push(mergeResult.mergedTask.id);

                // Update candidate status
                await this.updateCandidateStatus(candidate.id, 'auto_merged');
              } catch (error) {
                this.logger.error(`Failed to auto-merge tasks ${task1.id} and ${task2.id}`, error);
                suggestions.push(candidate);
              }
            } else {
              suggestions.push(candidate);
            }
          }
        }
      }

      this.logger.log(`Duplicate detection completed for user ${userId}: ${duplicates.length} duplicates found, ${autoMerged.length} auto-merged`);

      return {
        duplicates,
        autoMerged,
        suggestions,
      };
    } catch (error) {
      this.logger.error(`Failed to detect duplicates for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get duplicate candidates for review
   */
  async getDuplicateCandidates(
    userId: string,
    status?: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;
      
      const where: any = {
        OR: [
          { task1: { userId } },
          { task2: { userId } },
        ],
      };

      if (status) {
        where.status = status;
      }

      const [candidates, total] = await Promise.all([
        this.prisma.duplicateCandidate.findMany({
          where,
          include: {
            task1: true,
            task2: true,
          },
          orderBy: { overallScore: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.duplicateCandidate.count({ where }),
      ]);

      const mappedCandidates = candidates.map(candidate => this.mapPrismaToDuplicateCandidate(candidate));

      return {
        candidates: mappedCandidates,
        total,
        page,
        limit,
        hasMore: skip + candidates.length < total,
      };
    } catch (error) {
      this.logger.error(`Failed to get duplicate candidates for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Review a duplicate candidate
   */
  async reviewDuplicateCandidate(request: DuplicateReviewRequest): Promise<DuplicateReviewResponse> {
    const { candidateId, userId, action } = request;

    try {
      const candidate = await this.prisma.duplicateCandidate.findUnique({
        where: { id: candidateId },
        include: {
          task1: true,
          task2: true,
        },
      });

      if (!candidate) {
        throw new NotFoundException('Duplicate candidate not found');
      }

      // Verify user owns the tasks
      if (candidate.task1.userId !== userId && candidate.task2.userId !== userId) {
        throw new NotFoundException('Duplicate candidate not found');
      }

      let mergedTask = undefined;

      if (action === 'approve') {
        // Merge the tasks
        const mergeRequest: MergeTaskRequest = {
          taskIds: [candidate.task1Id, candidate.task2Id],
          userId,
          mergedBy: 'manual',
        };

        const mergeResult = await this.taskMergeService.mergeTasks(mergeRequest);
        mergedTask = mergeResult.mergedTask;

        // Update candidate status
        await this.updateCandidateStatus(candidateId, 'approved', userId);
      } else {
        // Reject the candidate
        await this.updateCandidateStatus(candidateId, 'rejected', userId);
      }

      const updatedCandidate = await this.prisma.duplicateCandidate.findUnique({
        where: { id: candidateId },
        include: {
          task1: true,
          task2: true,
        },
      });

      return {
        candidate: this.mapPrismaToDuplicateCandidate(updatedCandidate!),
        mergedTask,
      };
    } catch (error) {
      this.logger.error(`Failed to review duplicate candidate: ${candidateId}`, error);
      throw error;
    }
  }

  /**
   * Get deduplication statistics for a user
   */
  async getDeduplicationStats(userId: string) {
    try {
      const [
        totalTasks,
        mergedTasks,
        pendingCandidates,
        approvedCandidates,
        rejectedCandidates,
        autoMergedCandidates,
      ] = await Promise.all([
        this.prisma.task.count({ where: { userId } }),
        this.prisma.mergedTask.count({ where: { userId } }),
        this.prisma.duplicateCandidate.count({
          where: {
            OR: [{ task1: { userId } }, { task2: { userId } }],
            status: 'pending',
          },
        }),
        this.prisma.duplicateCandidate.count({
          where: {
            OR: [{ task1: { userId } }, { task2: { userId } }],
            status: 'approved',
          },
        }),
        this.prisma.duplicateCandidate.count({
          where: {
            OR: [{ task1: { userId } }, { task2: { userId } }],
            status: 'rejected',
          },
        }),
        this.prisma.duplicateCandidate.count({
          where: {
            OR: [{ task1: { userId } }, { task2: { userId } }],
            status: 'auto_merged',
          },
        }),
      ]);

      return {
        totalTasks,
        mergedTasks,
        pendingCandidates,
        approvedCandidates,
        rejectedCandidates,
        autoMergedCandidates,
        totalCandidates: pendingCandidates + approvedCandidates + rejectedCandidates + autoMergedCandidates,
      };
    } catch (error) {
      this.logger.error(`Failed to get deduplication stats for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Find existing duplicate candidate for task pair
   */
  private async findExistingCandidate(task1Id: string, task2Id: string) {
    return await this.prisma.duplicateCandidate.findFirst({
      where: {
        OR: [
          { task1Id, task2Id },
          { task1Id: task2Id, task2Id: task1Id },
        ],
      },
    });
  }

  /**
   * Create a duplicate candidate record
   */
  private async createDuplicateCandidate(task1: Task, task2: Task, score: any): Promise<DuplicateCandidate> {
    const candidate = await this.prisma.duplicateCandidate.create({
      data: {
        task1Id: task1.id,
        task2Id: task2.id,
        titleSimilarity: score.titleSimilarity,
        descriptionSimilarity: score.descriptionSimilarity,
        temporalProximity: score.temporalProximity,
        assigneeMatch: score.assigneeMatch,
        priorityMatch: score.priorityMatch,
        overallScore: score.overallScore,
        confidence: score.confidence,
      },
    });

    return this.mapPrismaToDuplicateCandidate(candidate);
  }

  /**
   * Update candidate status
   */
  private async updateCandidateStatus(candidateId: string, status: string, reviewedBy?: string) {
    await this.prisma.duplicateCandidate.update({
      where: { id: candidateId },
      data: {
        status,
        reviewedBy,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Create a duplicate candidate record (public method for pipeline)
   */
  async createDuplicateCandidatePublic(task1: Task, task2: Task, score: any): Promise<DuplicateCandidate> {
    return this.createDuplicateCandidate(task1, task2, score);
  }

  /**
   * Update candidate status (public method for pipeline)
   */
  async updateCandidateStatusPublic(candidateId: string, status: string, reviewedBy?: string): Promise<void> {
    await this.updateCandidateStatus(candidateId, status, reviewedBy);
  }

  /**
   * Map Prisma duplicate candidate to shared-types interface
   */
  private mapPrismaToDuplicateCandidate(candidate: any): DuplicateCandidate {
    return {
      id: candidate.id,
      task1Id: candidate.task1Id,
      task2Id: candidate.task2Id,
      score: {
        titleSimilarity: candidate.titleSimilarity,
        descriptionSimilarity: candidate.descriptionSimilarity,
        temporalProximity: candidate.temporalProximity,
        assigneeMatch: candidate.assigneeMatch,
        priorityMatch: candidate.priorityMatch,
        overallScore: candidate.overallScore,
        confidence: candidate.confidence,
      },
      status: candidate.status,
      reviewedBy: candidate.reviewedBy,
      reviewedAt: candidate.reviewedAt,
      createdAt: candidate.createdAt,
    };
  }
}
