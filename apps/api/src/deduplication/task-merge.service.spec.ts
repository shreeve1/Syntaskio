import { Test, TestingModule } from '@nestjs/testing';
import { TaskMergeService } from './task-merge.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('TaskMergeService', () => {
  let service: TaskMergeService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    task: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    mergedTask: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    mergedTaskSource: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskMergeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TaskMergeService>(TaskMergeService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mergeTasks', () => {
    const mockTasks = [
      {
        id: 'task-1',
        userId: 'user-1',
        title: 'Fix login bug',
        description: 'Users cannot log in',
        status: 'pending',
        priority: 'high',
        dueDate: new Date('2024-01-05'),
        source: 'microsoft',
        integrationId: 'integration-1',
        mergedTaskId: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'task-2',
        userId: 'user-1',
        title: 'Login issue',
        description: 'Login not working',
        status: 'in_progress',
        priority: 'medium',
        dueDate: new Date('2024-01-10'),
        source: 'connectwise',
        integrationId: 'integration-2',
        mergedTaskId: null,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    const mockMergedTask = {
      id: 'merged-task-1',
      userId: 'user-1',
      title: 'Fix login bug',
      description: 'Users cannot log in',
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date('2024-01-05'),
      mergedBy: 'manual',
      confidence: null,
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
    };

    it('should successfully merge tasks', async () => {
      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.mergedTask.create.mockResolvedValue(mockMergedTask);
      mockPrismaService.task.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.mergedTaskSource.createMany.mockResolvedValue({ count: 2 });

      const request = {
        taskIds: ['task-1', 'task-2'],
        userId: 'user-1',
        mergedBy: 'manual' as const,
      };

      const result = await service.mergeTasks(request);

      expect(result.mergedTask.id).toBe('merged-task-1');
      expect(result.mergedTask.title).toBe('Fix login bug');
      expect(result.mergedTask.status).toBe('in_progress');
      expect(result.mergedTask.priority).toBe('high');
      expect(result.mergedTask.dueDate).toEqual(new Date('2024-01-05'));
      expect(result.originalTasks).toEqual(['task-1', 'task-2']);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['task-1', 'task-2'] },
          userId: 'user-1',
        },
      });

      expect(mockPrismaService.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['task-1', 'task-2'] } },
        data: {
          mergedTaskId: 'merged-task-1',
          isMerged: true,
        },
      });
    });

    it('should throw error if less than 2 tasks provided', async () => {
      const request = {
        taskIds: ['task-1'],
        userId: 'user-1',
        mergedBy: 'manual' as const,
      };

      await expect(service.mergeTasks(request)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if tasks not found', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([mockTasks[0]]); // Only one task found

      const request = {
        taskIds: ['task-1', 'task-2'],
        userId: 'user-1',
        mergedBy: 'manual' as const,
      };

      await expect(service.mergeTasks(request)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if tasks already merged', async () => {
      const alreadyMergedTasks = [
        { ...mockTasks[0], mergedTaskId: 'existing-merge' },
        mockTasks[1],
      ];
      mockPrismaService.task.findMany.mockResolvedValue(alreadyMergedTasks);

      const request = {
        taskIds: ['task-1', 'task-2'],
        userId: 'user-1',
        mergedBy: 'manual' as const,
      };

      await expect(service.mergeTasks(request)).rejects.toThrow(BadRequestException);
    });

    it('should use primary task for title and description', async () => {
      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.mergedTask.create.mockResolvedValue(mockMergedTask);
      mockPrismaService.task.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.mergedTaskSource.createMany.mockResolvedValue({ count: 2 });

      const request = {
        taskIds: ['task-1', 'task-2'],
        userId: 'user-1',
        mergedBy: 'manual' as const,
        primaryTaskId: 'task-2',
      };

      await service.mergeTasks(request);

      expect(mockPrismaService.mergedTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Login issue', // Should use task-2's title
          description: 'Login not working', // Should use task-2's description
        }),
      });
    });

    it('should determine merged status correctly', async () => {
      const tasksWithDifferentStatuses = [
        { ...mockTasks[0], status: 'completed' },
        { ...mockTasks[1], status: 'pending' },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(tasksWithDifferentStatuses);
      mockPrismaService.mergedTask.create.mockResolvedValue({
        ...mockMergedTask,
        status: 'completed',
      });
      mockPrismaService.task.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.mergedTaskSource.createMany.mockResolvedValue({ count: 2 });

      const request = {
        taskIds: ['task-1', 'task-2'],
        userId: 'user-1',
        mergedBy: 'manual' as const,
      };

      await service.mergeTasks(request);

      expect(mockPrismaService.mergedTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'completed', // Should be completed since one task is completed
        }),
      });
    });

    it('should determine merged priority correctly', async () => {
      const tasksWithDifferentPriorities = [
        { ...mockTasks[0], priority: 'low' },
        { ...mockTasks[1], priority: 'high' },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(tasksWithDifferentPriorities);
      mockPrismaService.mergedTask.create.mockResolvedValue({
        ...mockMergedTask,
        priority: 'high',
      });
      mockPrismaService.task.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.mergedTaskSource.createMany.mockResolvedValue({ count: 2 });

      const request = {
        taskIds: ['task-1', 'task-2'],
        userId: 'user-1',
        mergedBy: 'manual' as const,
      };

      await service.mergeTasks(request);

      expect(mockPrismaService.mergedTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: 'high', // Should be highest priority
        }),
      });
    });

    it('should determine earliest due date', async () => {
      const tasksWithDifferentDueDates = [
        { ...mockTasks[0], dueDate: new Date('2024-01-10') },
        { ...mockTasks[1], dueDate: new Date('2024-01-05') },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(tasksWithDifferentDueDates);
      mockPrismaService.mergedTask.create.mockResolvedValue({
        ...mockMergedTask,
        dueDate: new Date('2024-01-05'),
      });
      mockPrismaService.task.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.mergedTaskSource.createMany.mockResolvedValue({ count: 2 });

      const request = {
        taskIds: ['task-1', 'task-2'],
        userId: 'user-1',
        mergedBy: 'manual' as const,
      };

      await service.mergeTasks(request);

      expect(mockPrismaService.mergedTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dueDate: new Date('2024-01-05'), // Should be earliest due date
        }),
      });
    });
  });

  describe('unmergeTasks', () => {
    const mockMergedTaskWithSources = {
      id: 'merged-task-1',
      userId: 'user-1',
      sources: [
        { originalTaskId: 'task-1' },
        { originalTaskId: 'task-2' },
      ],
    };

    it('should successfully unmerge tasks', async () => {
      mockPrismaService.mergedTask.findFirst.mockResolvedValue(mockMergedTaskWithSources);
      mockPrismaService.task.findMany.mockResolvedValue([
        { id: 'task-1' },
        { id: 'task-2' },
      ]);
      mockPrismaService.task.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.mergedTaskSource.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaService.mergedTask.delete.mockResolvedValue(mockMergedTaskWithSources);

      const request = {
        mergedTaskId: 'merged-task-1',
        userId: 'user-1',
      };

      const result = await service.unmergeTasks(request);

      expect(result.restoredTasks).toEqual(['task-1', 'task-2']);

      expect(mockPrismaService.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['task-1', 'task-2'] } },
        data: {
          mergedTaskId: null,
          isMerged: false,
        },
      });

      expect(mockPrismaService.mergedTaskSource.deleteMany).toHaveBeenCalledWith({
        where: { mergedTaskId: 'merged-task-1' },
      });

      expect(mockPrismaService.mergedTask.delete).toHaveBeenCalledWith({
        where: { id: 'merged-task-1' },
      });
    });

    it('should throw error if merged task not found', async () => {
      mockPrismaService.mergedTask.findFirst.mockResolvedValue(null);

      const request = {
        mergedTaskId: 'non-existent',
        userId: 'user-1',
      };

      await expect(service.unmergeTasks(request)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMergedTaskById', () => {
    it('should return merged task if found', async () => {
      const mockMergedTaskWithSources = {
        id: 'merged-task-1',
        userId: 'user-1',
        title: 'Merged Task',
        sources: [
          {
            originalTaskId: 'task-1',
            source: 'microsoft',
            originalTitle: 'Original Task 1',
            originalTask: { sourceData: { key: 'value' } },
          },
        ],
      };

      mockPrismaService.mergedTask.findFirst.mockResolvedValue(mockMergedTaskWithSources);

      const result = await service.getMergedTaskById('merged-task-1', 'user-1');

      expect(result).toBeDefined();
      expect(result!.id).toBe('merged-task-1');
      expect(result!.sources).toHaveLength(1);
    });

    it('should return null if merged task not found', async () => {
      mockPrismaService.mergedTask.findFirst.mockResolvedValue(null);

      const result = await service.getMergedTaskById('non-existent', 'user-1');

      expect(result).toBeNull();
    });
  });
});
