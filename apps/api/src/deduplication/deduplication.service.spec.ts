import { Test, TestingModule } from '@nestjs/testing';
import { DeduplicationService } from './deduplication.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskService } from '../task/task.service';
import { DuplicateDetectorService } from './duplicate-detector.service';
import { TaskMergeService } from './task-merge.service';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('DeduplicationService', () => {
  let service: DeduplicationService;
  let prismaService: PrismaService;
  let taskService: TaskService;
  let duplicateDetectorService: DuplicateDetectorService;
  let taskMergeService: TaskMergeService;

  const mockPrismaService = {
    duplicateCandidate: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    task: {
      count: vi.fn(),
    },
    mergedTask: {
      count: vi.fn(),
    },
  };

  const mockTaskService = {
    getTasksByUserId: vi.fn(),
  };

  const mockDuplicateDetectorService = {
    calculateDuplicateScore: vi.fn(),
  };

  const mockTaskMergeService = {
    mergeTasks: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeduplicationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TaskService,
          useValue: mockTaskService,
        },
        {
          provide: DuplicateDetectorService,
          useValue: mockDuplicateDetectorService,
        },
        {
          provide: TaskMergeService,
          useValue: mockTaskMergeService,
        },
      ],
    }).compile();

    service = module.get<DeduplicationService>(DeduplicationService);
    prismaService = module.get<PrismaService>(PrismaService);
    taskService = module.get<TaskService>(TaskService);
    duplicateDetectorService = module.get<DuplicateDetectorService>(DuplicateDetectorService);
    taskMergeService = module.get<TaskMergeService>(TaskMergeService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectDuplicatesForUser', () => {
    const mockTasks = [
      {
        id: 'task-1',
        userId: 'user-1',
        title: 'Fix login bug',
        description: 'Users cannot log in',
        status: 'pending',
        priority: 'high',
        source: 'microsoft',
        isMerged: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'task-2',
        userId: 'user-1',
        title: 'Login issue',
        description: 'Login not working',
        status: 'pending',
        priority: 'medium',
        source: 'connectwise',
        isMerged: false,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    it('should detect duplicates and auto-merge high confidence matches', async () => {
      mockTaskService.getTasksByUserId.mockResolvedValue(mockTasks);
      mockDuplicateDetectorService.calculateDuplicateScore.mockResolvedValue({
        titleSimilarity: 0.9,
        descriptionSimilarity: 0.8,
        temporalProximity: 0.9,
        assigneeMatch: 0.0,
        priorityMatch: 0.0,
        overallScore: 0.8,
        confidence: 'high',
      });

      mockPrismaService.duplicateCandidate.findFirst.mockResolvedValue(null);
      mockPrismaService.duplicateCandidate.create.mockResolvedValue({
        id: 'candidate-1',
        task1Id: 'task-1',
        task2Id: 'task-2',
        overallScore: 0.8,
        confidence: 'high',
        status: 'pending',
        createdAt: new Date(),
      });

      mockTaskMergeService.mergeTasks.mockResolvedValue({
        mergedTask: { id: 'merged-1' },
        originalTasks: ['task-1', 'task-2'],
      });

      mockPrismaService.duplicateCandidate.update.mockResolvedValue({});

      const result = await service.detectDuplicatesForUser('user-1');

      expect(result.duplicates).toHaveLength(1);
      expect(result.autoMerged).toHaveLength(1);
      expect(result.autoMerged[0]).toBe('merged-1');
      expect(mockTaskMergeService.mergeTasks).toHaveBeenCalledWith({
        taskIds: ['task-1', 'task-2'],
        userId: 'user-1',
        mergedBy: 'auto',
      });
    });

    it('should create suggestions for medium confidence matches', async () => {
      mockTaskService.getTasksByUserId.mockResolvedValue(mockTasks);
      mockDuplicateDetectorService.calculateDuplicateScore.mockResolvedValue({
        titleSimilarity: 0.7,
        descriptionSimilarity: 0.6,
        temporalProximity: 0.5,
        assigneeMatch: 0.0,
        priorityMatch: 0.0,
        overallScore: 0.65,
        confidence: 'medium',
      });

      mockPrismaService.duplicateCandidate.findFirst.mockResolvedValue(null);
      mockPrismaService.duplicateCandidate.create.mockResolvedValue({
        id: 'candidate-1',
        task1Id: 'task-1',
        task2Id: 'task-2',
        overallScore: 0.65,
        confidence: 'medium',
        status: 'pending',
        createdAt: new Date(),
      });

      const result = await service.detectDuplicatesForUser('user-1');

      expect(result.duplicates).toHaveLength(1);
      expect(result.autoMerged).toHaveLength(0);
      expect(result.suggestions).toHaveLength(1);
      expect(mockTaskMergeService.mergeTasks).not.toHaveBeenCalled();
    });

    it('should skip already merged tasks', async () => {
      const tasksWithMerged = [
        { ...mockTasks[0], isMerged: true },
        mockTasks[1],
      ];

      mockTaskService.getTasksByUserId.mockResolvedValue(tasksWithMerged);

      const result = await service.detectDuplicatesForUser('user-1');

      expect(result.duplicates).toHaveLength(0);
      expect(result.autoMerged).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
      expect(mockDuplicateDetectorService.calculateDuplicateScore).not.toHaveBeenCalled();
    });

    it('should handle insufficient tasks gracefully', async () => {
      mockTaskService.getTasksByUserId.mockResolvedValue([mockTasks[0]]);

      const result = await service.detectDuplicatesForUser('user-1');

      expect(result.duplicates).toHaveLength(0);
      expect(result.autoMerged).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });
  });

  describe('getDuplicateCandidates', () => {
    it('should return paginated duplicate candidates', async () => {
      const mockCandidates = [
        {
          id: 'candidate-1',
          task1Id: 'task-1',
          task2Id: 'task-2',
          titleSimilarity: 0.9,
          descriptionSimilarity: 0.8,
          temporalProximity: 0.7,
          assigneeMatch: 0.0,
          priorityMatch: 1.0,
          overallScore: 0.8,
          confidence: 'high',
          status: 'pending',
          createdAt: new Date(),
          task1: { userId: 'user-1' },
          task2: { userId: 'user-1' },
        },
      ];

      mockPrismaService.duplicateCandidate.findMany.mockResolvedValue(mockCandidates);
      mockPrismaService.duplicateCandidate.count.mockResolvedValue(1);

      const result = await service.getDuplicateCandidates('user-1', 'pending', 1, 10);

      expect(result.candidates).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getDeduplicationStats', () => {
    it('should return comprehensive statistics', async () => {
      mockPrismaService.task.count.mockResolvedValue(100);
      mockPrismaService.mergedTask.count.mockResolvedValue(10);
      mockPrismaService.duplicateCandidate.count
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(8) // approved
        .mockResolvedValueOnce(2) // rejected
        .mockResolvedValueOnce(12); // auto_merged

      const result = await service.getDeduplicationStats('user-1');

      expect(result.totalTasks).toBe(100);
      expect(result.mergedTasks).toBe(10);
      expect(result.pendingCandidates).toBe(5);
      expect(result.approvedCandidates).toBe(8);
      expect(result.rejectedCandidates).toBe(2);
      expect(result.autoMergedCandidates).toBe(12);
      expect(result.totalCandidates).toBe(27);
    });
  });
});
