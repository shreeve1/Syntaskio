import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskService } from '../task/task.service';
import { DuplicateDetectorService } from './duplicate-detector.service';
import { TaskMergeService } from './task-merge.service';
import { DeduplicationService } from './deduplication.service';
import { DeduplicationController } from './deduplication.controller';
import { DuplicateDetectionPipelineService } from './duplicate-detection-pipeline.service';

@Module({
  controllers: [DeduplicationController],
  providers: [
    PrismaService,
    TaskService,
    DuplicateDetectorService,
    TaskMergeService,
    DeduplicationService,
    DuplicateDetectionPipelineService,
  ],
  exports: [
    DuplicateDetectorService,
    TaskMergeService,
    DeduplicationService,
    DuplicateDetectionPipelineService,
  ],
})
export class DeduplicationModule {}
