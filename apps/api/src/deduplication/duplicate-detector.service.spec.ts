import { Test, TestingModule } from '@nestjs/testing';
import { DuplicateDetectorService } from './duplicate-detector.service';
import { Task } from '@syntaskio/shared-types';

describe('DuplicateDetectorService', () => {
  let service: DuplicateDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DuplicateDetectorService],
    }).compile();

    service = module.get<DuplicateDetectorService>(DuplicateDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateDuplicateScore', () => {
    const createMockTask = (overrides: Partial<Task> = {}): Task => ({
      id: 'test-id',
      userId: 'user-1',
      integrationId: 'integration-1',
      externalId: 'external-1',
      title: 'Test Task',
      description: 'Test description',
      status: 'pending',
      priority: 'medium',
      dueDate: new Date('2024-01-01'),
      source: 'microsoft',
      sourceData: {},
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    });

    it('should return zero score for same source and external ID', async () => {
      const task1 = createMockTask({ source: 'microsoft', externalId: 'same-id' });
      const task2 = createMockTask({ source: 'microsoft', externalId: 'same-id' });

      const score = await service.calculateDuplicateScore(task1, task2);

      expect(score.overallScore).toBe(0);
      expect(score.confidence).toBe('low');
    });

    it('should calculate high similarity for identical titles', async () => {
      const task1 = createMockTask({ 
        title: 'Fix login bug',
        source: 'microsoft',
        externalId: 'ext-1'
      });
      const task2 = createMockTask({ 
        title: 'Fix login bug',
        source: 'connectwise',
        externalId: 'ext-2'
      });

      const score = await service.calculateDuplicateScore(task1, task2);

      expect(score.titleSimilarity).toBeGreaterThan(0.9);
    });

    it('should calculate medium similarity for similar titles', async () => {
      const task1 = createMockTask({ 
        title: 'Fix login bug',
        source: 'microsoft',
        externalId: 'ext-1'
      });
      const task2 = createMockTask({ 
        title: 'Resolve login issue',
        source: 'connectwise',
        externalId: 'ext-2'
      });

      const score = await service.calculateDuplicateScore(task1, task2);

      expect(score.titleSimilarity).toBeGreaterThan(0.3);
      expect(score.titleSimilarity).toBeLessThan(0.9);
    });

    it('should calculate low similarity for different titles', async () => {
      const task1 = createMockTask({ 
        title: 'Fix login bug',
        source: 'microsoft',
        externalId: 'ext-1'
      });
      const task2 = createMockTask({ 
        title: 'Update database schema',
        source: 'connectwise',
        externalId: 'ext-2'
      });

      const score = await service.calculateDuplicateScore(task1, task2);

      expect(score.titleSimilarity).toBeLessThan(0.4);
    });

    it('should calculate description similarity correctly', async () => {
      const task1 = createMockTask({ 
        description: 'Users cannot log in to the application',
        source: 'microsoft',
        externalId: 'ext-1'
      });
      const task2 = createMockTask({ 
        description: 'Login functionality is not working',
        source: 'connectwise',
        externalId: 'ext-2'
      });

      const score = await service.calculateDuplicateScore(task1, task2);

      expect(score.descriptionSimilarity).toBeGreaterThan(0.2);
    });

    it('should calculate temporal proximity correctly', async () => {
      const baseDate = new Date('2024-01-01');
      const task1 = createMockTask({ 
        createdAt: baseDate,
        dueDate: new Date('2024-01-05'),
        source: 'microsoft',
        externalId: 'ext-1'
      });
      const task2 = createMockTask({ 
        createdAt: new Date('2024-01-02'), // 1 day difference
        dueDate: new Date('2024-01-06'), // 1 day difference
        source: 'connectwise',
        externalId: 'ext-2'
      });

      const score = await service.calculateDuplicateScore(task1, task2);

      expect(score.temporalProximity).toBeGreaterThan(0.8);
    });

    it('should calculate assignee match for ConnectWise tasks', async () => {
      const task1 = createMockTask({ 
        source: 'connectwise',
        connectWiseAssignedTo: 'john.doe@company.com',
        externalId: 'ext-1'
      });
      const task2 = createMockTask({ 
        source: 'connectwise',
        connectWiseAssignedTo: 'john.doe@company.com',
        externalId: 'ext-2'
      });

      const score = await service.calculateDuplicateScore(task1, task2);

      expect(score.assigneeMatch).toBe(1);
    });

    it('should calculate priority match correctly', async () => {
      const task1 = createMockTask({ 
        priority: 'high',
        source: 'microsoft',
        externalId: 'ext-1'
      });
      const task2 = createMockTask({ 
        priority: 'high',
        source: 'connectwise',
        externalId: 'ext-2'
      });

      const score = await service.calculateDuplicateScore(task1, task2);

      expect(score.priorityMatch).toBe(1);
    });

    it('should calculate overall score with proper weighting', async () => {
      const task1 = createMockTask({ 
        title: 'Fix login bug',
        description: 'Users cannot log in',
        priority: 'high',
        createdAt: new Date('2024-01-01'),
        source: 'microsoft',
        externalId: 'ext-1'
      });
      const task2 = createMockTask({ 
        title: 'Fix login bug',
        description: 'Users cannot log in',
        priority: 'high',
        createdAt: new Date('2024-01-01'),
        source: 'connectwise',
        externalId: 'ext-2'
      });

      const score = await service.calculateDuplicateScore(task1, task2);

      // Should be high confidence due to identical content
      expect(score.overallScore).toBeGreaterThan(0.8);
      expect(score.confidence).toBe('high');
    });

    it('should determine confidence levels correctly', async () => {
      const task1 = createMockTask({ source: 'microsoft', externalId: 'ext-1' });
      
      // High confidence case
      const highConfidenceTask = createMockTask({ 
        title: task1.title,
        description: task1.description,
        priority: task1.priority,
        source: 'connectwise',
        externalId: 'ext-2'
      });

      const highScore = await service.calculateDuplicateScore(task1, highConfidenceTask);
      expect(highScore.confidence).toBe('high');

      // Medium confidence case
      const mediumConfidenceTask = createMockTask({ 
        title: 'Similar but different title',
        source: 'connectwise',
        externalId: 'ext-3'
      });

      const mediumScore = await service.calculateDuplicateScore(task1, mediumConfidenceTask);
      expect(['medium', 'low']).toContain(mediumScore.confidence);
    });
  });

  describe('text similarity algorithms', () => {
    it('should handle empty strings correctly', async () => {
      const task1 = createMockTask({ 
        title: '',
        description: '',
        source: 'microsoft',
        externalId: 'ext-1'
      });
      const task2 = createMockTask({ 
        title: 'Some title',
        description: 'Some description',
        source: 'connectwise',
        externalId: 'ext-2'
      });

      const score = await service.calculateDuplicateScore(task1, task2);

      expect(score.titleSimilarity).toBe(0);
      expect(score.descriptionSimilarity).toBe(0);
    });

    it('should handle null descriptions correctly', async () => {
      const task1 = createMockTask({ 
        description: undefined,
        source: 'microsoft',
        externalId: 'ext-1'
      });
      const task2 = createMockTask({ 
        description: undefined,
        source: 'connectwise',
        externalId: 'ext-2'
      });

      const score = await service.calculateDuplicateScore(task1, task2);

      expect(score.descriptionSimilarity).toBe(1); // Both null should be considered identical
    });
  });

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: 'test-id',
    userId: 'user-1',
    integrationId: 'integration-1',
    externalId: 'external-1',
    title: 'Test Task',
    description: 'Test description',
    status: 'pending',
    priority: 'medium',
    dueDate: new Date('2024-01-01'),
    source: 'microsoft',
    sourceData: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });
});
