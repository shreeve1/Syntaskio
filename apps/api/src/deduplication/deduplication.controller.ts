import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request,
  Logger,
  BadRequestException 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DuplicateDetectorService } from './duplicate-detector.service';
import { TaskMergeService } from './task-merge.service';
import { DeduplicationService } from './deduplication.service';
import { 
  MergeTaskRequest, 
  UnmergeTaskRequest, 
  DuplicateReviewRequest,
  DuplicateDetectionConfig 
} from '@syntaskio/shared-types';

@Controller('deduplication')
@UseGuards(JwtAuthGuard)
export class DeduplicationController {
  private readonly logger = new Logger(DeduplicationController.name);

  constructor(
    private duplicateDetectorService: DuplicateDetectorService,
    private taskMergeService: TaskMergeService,
    private deduplicationService: DeduplicationService,
  ) {}

  /**
   * Get duplicate candidates for review
   */
  @Get('candidates')
  async getDuplicateCandidates(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    try {
      const userId = req.user.uid;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        throw new BadRequestException('Invalid pagination parameters');
      }

      const candidates = await this.deduplicationService.getDuplicateCandidates(
        userId,
        status,
        pageNum,
        limitNum
      );

      return {
        success: true,
        data: candidates,
      };
    } catch (error) {
      this.logger.error('Failed to get duplicate candidates', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Run duplicate detection on user's tasks
   */
  @Post('detect')
  async detectDuplicates(
    @Request() req: any,
    @Body() config?: Partial<DuplicateDetectionConfig>
  ) {
    try {
      const userId = req.user.uid;
      
      const result = await this.deduplicationService.detectDuplicatesForUser(
        userId,
        config
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to detect duplicates', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Merge tasks manually
   */
  @Post('merge')
  async mergeTasks(
    @Request() req: any,
    @Body() mergeRequest: Omit<MergeTaskRequest, 'userId'>
  ) {
    try {
      const userId = req.user.uid;
      
      const request: MergeTaskRequest = {
        ...mergeRequest,
        userId,
      };

      const result = await this.taskMergeService.mergeTasks(request);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to merge tasks', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Unmerge a merged task
   */
  @Post('unmerge')
  async unmergeTasks(
    @Request() req: any,
    @Body() unmergeRequest: Omit<UnmergeTaskRequest, 'userId'>
  ) {
    try {
      const userId = req.user.uid;
      
      const request: UnmergeTaskRequest = {
        ...unmergeRequest,
        userId,
      };

      const result = await this.taskMergeService.unmergeTasks(request);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to unmerge tasks', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Review a duplicate candidate (approve or reject)
   */
  @Post('review')
  async reviewDuplicateCandidate(
    @Request() req: any,
    @Body() reviewRequest: Omit<DuplicateReviewRequest, 'userId'>
  ) {
    try {
      const userId = req.user.uid;
      
      const request: DuplicateReviewRequest = {
        ...reviewRequest,
        userId,
      };

      const result = await this.deduplicationService.reviewDuplicateCandidate(request);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to review duplicate candidate', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get merged tasks for user
   */
  @Get('merged-tasks')
  async getMergedTasks(@Request() req: any) {
    try {
      const userId = req.user.uid;
      
      const mergedTasks = await this.taskMergeService.getMergedTasksByUserId(userId);

      return {
        success: true,
        data: mergedTasks,
      };
    } catch (error) {
      this.logger.error('Failed to get merged tasks', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get a specific merged task
   */
  @Get('merged-tasks/:id')
  async getMergedTask(
    @Request() req: any,
    @Param('id') id: string
  ) {
    try {
      const userId = req.user.uid;
      
      const mergedTask = await this.taskMergeService.getMergedTaskById(id, userId);

      if (!mergedTask) {
        return {
          success: false,
          error: 'Merged task not found',
        };
      }

      return {
        success: true,
        data: mergedTask,
      };
    } catch (error) {
      this.logger.error('Failed to get merged task', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get duplicate detection statistics
   */
  @Get('stats')
  async getDeduplicationStats(@Request() req: any) {
    try {
      const userId = req.user.uid;
      
      const stats = await this.deduplicationService.getDeduplicationStats(userId);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('Failed to get deduplication stats', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
