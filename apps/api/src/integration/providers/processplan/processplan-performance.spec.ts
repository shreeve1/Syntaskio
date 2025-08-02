import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ProcessPlanApiService } from './processplan-api.service';
import { Integration } from '@syntaskio/shared-types';

describe('ProcessPlan Performance Tests', () => {
  let service: ProcessPlanApiService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessPlanApiService,
        {
          provide: HttpService,
          useValue: {
            get: vi.fn(),
            post: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProcessPlanApiService>(ProcessPlanApiService);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('Large Dataset Performance', () => {
    it('should handle 1000+ processes efficiently', async () => {
      const mockIntegration: Integration = {
        id: 'test-integration-id',
        userId: 'test-user-id',
        provider: 'processplan',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Generate 1000 mock processes
      const mockProcesses = Array.from({ length: 1000 }, (_, i) => ({
        id: `proc_${i}`,
        name: `Process ${i}`,
        description: `Description for process ${i}`,
        status: 'active',
        assignedTo: 'user@company.com',
        createdAt: '2024-08-01T10:00:00Z',
        dueDate: '2024-08-10T17:00:00Z',
        progress: Math.random(),
        currentStep: {
          id: `step_${i}_current`,
          name: `Current Step ${i}`,
          status: 'in_progress',
        },
        totalSteps: 5,
        completedSteps: Math.floor(Math.random() * 5),
      }));

      // Generate 5 steps per process (5000 total steps)
      const mockSteps = mockProcesses.flatMap((process, processIndex) =>
        Array.from({ length: 5 }, (_, stepIndex) => ({
          id: `step_${processIndex}_${stepIndex}`,
          processId: process.id,
          name: `Step ${stepIndex + 1}`,
          description: `Description for step ${stepIndex + 1}`,
          status: stepIndex < 2 ? 'completed' : stepIndex === 2 ? 'in_progress' : 'pending',
          assignedTo: 'user@company.com',
          order: stepIndex + 1,
          estimatedDuration: 120,
          dueDate: '2024-08-03T17:00:00Z',
          dependencies: stepIndex > 0 ? [`step_${processIndex}_${stepIndex - 1}`] : [],
          tags: ['test', `process-${processIndex}`],
          priority: ['low', 'medium', 'high'][stepIndex % 3],
        }))
      );

      // Mock API responses
      vi.spyOn(httpService, 'get').mockImplementation((url: string) => {
        if (url.includes('/processes') && !url.includes('/steps')) {
          return of({ data: { processes: mockProcesses } } as any);
        } else if (url.includes('/steps')) {
          const processId = url.split('/')[5]; // Extract process ID from URL
          const processSteps = mockSteps.filter(step => step.processId === processId);
          return of({ data: { steps: processSteps } } as any);
        }
        return of({ data: {} } as any);
      });

      const startTime = Date.now();
      const result = await service.fetchTasks(mockIntegration);
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      // Performance assertions
      expect(result).toHaveLength(6000); // 1000 processes + 5000 steps
      expect(executionTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Memory usage should be reasonable
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB

      console.log(`Processed 6000 tasks in ${executionTime}ms`);
      console.log(`Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
    });

    it('should handle rate limiting gracefully', async () => {
      const mockIntegration: Integration = {
        id: 'test-integration-id',
        userId: 'test-user-id',
        provider: 'processplan',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let callCount = 0;
      const rateLimitThreshold = 5;

      vi.spyOn(httpService, 'get').mockImplementation((url: string) => {
        callCount++;

        if (callCount <= rateLimitThreshold) {
          // Normal response for first few calls
          if (url.includes('/processes')) {
            return of({ data: { processes: [{ id: 'proc_1', name: 'Test Process' }] } } as any);
          } else if (url.includes('/steps')) {
            return of({ data: { steps: [] } } as any);
          }
        } else {
          // Simulate rate limiting
          const error = new Error('Rate limit exceeded');
          (error as any).response = {
            status: 429,
            headers: {
              'x-ratelimit-limit': '100',
              'x-ratelimit-remaining': '0',
              'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 60,
            },
          };
          throw error;
        }

        return of({ data: {} } as any);
      });

      const startTime = Date.now();

      try {
        await service.fetchTasks(mockIntegration);
      } catch (error) {
        expect(error.message).toContain('Rate limit exceeded');
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should fail quickly when rate limited
      expect(executionTime).toBeLessThan(5000); // Less than 5 seconds
      expect(callCount).toBeGreaterThan(rateLimitThreshold);
    });

    it('should transform large datasets efficiently', async () => {
      const mockIntegration: Integration = {
        id: 'test-integration-id',
        userId: 'test-user-id',
        provider: 'processplan',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Generate 500 processes with 10 steps each (5500 total items)
      const mockProcesses = Array.from({ length: 500 }, (_, i) => ({
        id: `proc_${i}`,
        name: `Process ${i}`,
        description: `Description for process ${i}`,
        status: 'active',
        assignedTo: 'user@company.com',
        createdAt: '2024-08-01T10:00:00Z',
        dueDate: '2024-08-10T17:00:00Z',
        progress: Math.random(),
        currentStep: {
          id: `step_${i}_current`,
          name: `Current Step ${i}`,
          status: 'in_progress',
        },
        totalSteps: 10,
        completedSteps: Math.floor(Math.random() * 10),
      }));

      vi.spyOn(httpService, 'get').mockImplementation((url: string) => {
        if (url.includes('/processes')) {
          return of({ data: { processes: mockProcesses } } as any);
        } else if (url.includes('/steps')) {
          // Return 10 steps per process
          const steps = Array.from({ length: 10 }, (_, i) => ({
            id: `step_${i}`,
            processId: 'proc_1',
            name: `Step ${i}`,
            description: `Step description ${i}`,
            status: 'pending',
            assignedTo: 'user@company.com',
            order: i,
            estimatedDuration: 120,
            dueDate: '2024-08-03T17:00:00Z',
            dependencies: [],
            tags: ['test'],
            priority: 'medium',
          }));
          return of({ data: { steps } } as any);
        }
        return of({ data: {} } as any);
      });

      const startTime = Date.now();
      const result = await service.fetchTasks(mockIntegration);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      const tasksPerSecond = result.length / (executionTime / 1000);

      // Performance assertions
      expect(result.length).toBeGreaterThan(5000);
      expect(tasksPerSecond).toBeGreaterThan(100); // Should process at least 100 tasks per second

      // Verify data integrity
      const processTasks = result.filter(task => task.processPlanType === 'process');
      const stepTasks = result.filter(task => task.processPlanType === 'step');

      expect(processTasks).toHaveLength(500);
      expect(stepTasks.length).toBeGreaterThan(4500);

      console.log(`Transformed ${result.length} tasks at ${Math.round(tasksPerSecond)} tasks/second`);
    });

    it('should handle concurrent API requests efficiently', async () => {
      const mockIntegration: Integration = {
        id: 'test-integration-id',
        userId: 'test-user-id',
        provider: 'processplan',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let apiCallCount = 0;
      const maxConcurrentCalls = 10;

      vi.spyOn(httpService, 'get').mockImplementation(async (url: string) => {
        apiCallCount++;

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));

        if (url.includes('/processes')) {
          return of({ data: { processes: [{ id: 'proc_1', name: 'Test Process' }] } } as any);
        } else if (url.includes('/steps')) {
          return of({ data: { steps: [] } } as any);
        }
        return of({ data: {} } as any);
      });

      // Run multiple concurrent fetch operations
      const promises = Array.from({ length: maxConcurrentCalls }, () =>
        service.fetchTasks(mockIntegration)
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      // Should handle concurrent requests efficiently
      expect(results).toHaveLength(maxConcurrentCalls);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(apiCallCount).toBeGreaterThanOrEqual(maxConcurrentCalls);

      console.log(`Handled ${maxConcurrentCalls} concurrent requests in ${executionTime}ms`);
    });
  });
});
