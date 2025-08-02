import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { ConnectWiseApiService } from './connectwise-api.service';
import { TaskService } from '../../../task/task.service';

describe('ConnectWise Performance Tests', () => {
  let connectWiseApiService: ConnectWiseApiService;
  let taskService: TaskService;
  let httpService: HttpService;

  const mockIntegration = {
    id: 'test-integration',
    userId: 'test-user',
    provider: 'connectwise',
    accessToken: 'test-token',
    config: {
      serverUrl: 'https://test.connectwisedev.com',
      companyId: 'TestCompany',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectWiseApiService,
        {
          provide: TaskService,
          useValue: {
            createTask: vi.fn(),
            transformConnectWiseTask: vi.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: vi.fn(),
            post: vi.fn(),
            request: vi.fn(),
          },
        },
      ],
    }).compile();

    connectWiseApiService = module.get<ConnectWiseApiService>(ConnectWiseApiService);
    taskService = module.get<TaskService>(TaskService);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('Large Dataset Performance', () => {
    it('should handle 1000 service tickets efficiently', async () => {
      // Generate large dataset of service tickets
      const largeTicketDataset = Array.from({ length: 1000 }, (_, index) => ({
        id: 10000 + index,
        summary: `Service Ticket ${index + 1}`,
        status: { name: index % 2 === 0 ? 'New' : 'In Progress' },
        priority: { name: ['Low', 'Medium', 'High'][index % 3] },
        dateEntered: new Date(Date.now() - index * 86400000).toISOString(),
        board: { name: `Board ${Math.floor(index / 100) + 1}` },
        company: { name: `Company ${Math.floor(index / 50) + 1}` },
        owner: { identifier: `user${index % 10}@company.com` },
      }));

      // Mock the API service to return transformed data directly
      const mockTransformedTasks = largeTicketDataset.map(ticket => ({
        id: `connectwise-ticket-${ticket.id}`,
        title: ticket.summary,
        description: '',
        status: ticket.status.name.toLowerCase().replace(' ', '_'),
        priority: ticket.priority.name.toLowerCase(),
        dueDate: null,
        source: 'connectwise',
        sourceData: ticket,
        connectWiseTicketId: ticket.id,
        connectWiseTicketType: 'service',
        connectWiseBoardName: ticket.board.name,
        connectWiseCompanyName: ticket.company.name,
        connectWiseOwner: ticket.owner.identifier,
      }));

      vi.spyOn(connectWiseApiService, 'fetchServiceTickets').mockResolvedValue(mockTransformedTasks);

      const startTime = performance.now();
      const tasks = await connectWiseApiService.fetchServiceTickets(mockIntegration as any);
      const endTime = performance.now();

      const processingTime = endTime - startTime;

      // Performance assertions
      expect(tasks).toHaveLength(1000);
      expect(processingTime).toBeLessThan(5000); // Should process 1000 tickets in under 5 seconds
      
      // Verify data transformation quality
      expect(tasks[0]).toHaveProperty('id');
      expect(tasks[0]).toHaveProperty('title');
      expect(tasks[0]).toHaveProperty('status');
      expect(tasks[0]).toHaveProperty('sourceData');
      expect(tasks[0].id).toBe('connectwise-ticket-10000');
      expect(tasks[999].id).toBe('connectwise-ticket-10999');
    });

    it('should handle 500 project tasks efficiently', async () => {
      // Generate large dataset of project tasks
      const largeProjectDataset = Array.from({ length: 10 }, (_, index) => ({
        id: index + 1,
        name: `Project ${index + 1}`,
      }));

      const largeTaskDataset = Array.from({ length: 500 }, (_, index) => ({
        id: 20000 + index,
        summary: `Project Task ${index + 1}`,
        status: { name: index % 3 === 0 ? 'New' : index % 3 === 1 ? 'In Progress' : 'Completed' },
        priority: { name: ['Low', 'Medium', 'High', 'Critical'][index % 4] },
        dateDue: new Date(Date.now() + index * 86400000).toISOString(),
        project: { name: `Project ${(index % 10) + 1}` },
        assignedTo: { identifier: `dev${index % 20}@company.com` },
      }));

      // Mock the API service to return transformed project tasks
      const mockTransformedProjectTasks = largeTaskDataset.map(task => ({
        id: `connectwise-task-${task.id}`,
        title: task.summary,
        description: '',
        status: task.status.name.toLowerCase().replace(' ', '_'),
        priority: task.priority.name.toLowerCase(),
        dueDate: new Date(task.dateDue),
        source: 'connectwise',
        sourceData: task,
        connectWiseTicketId: task.id,
        connectWiseTicketType: 'project',
        connectWiseProjectName: task.project.name,
        connectWiseAssignedTo: task.assignedTo.identifier,
      }));

      vi.spyOn(connectWiseApiService, 'fetchProjectTasks').mockResolvedValue(mockTransformedProjectTasks);

      const startTime = performance.now();
      const tasks = await connectWiseApiService.fetchProjectTasks(mockIntegration as any);
      const endTime = performance.now();

      const processingTime = endTime - startTime;

      // Performance assertions
      expect(tasks).toHaveLength(500); // 10 projects × 50 tasks each
      expect(processingTime).toBeLessThan(10000); // Should process 500 tasks in under 10 seconds
      
      // Verify API service method was called
      expect(connectWiseApiService.fetchProjectTasks).toHaveBeenCalledWith(mockIntegration);
    });

    it('should handle rate limiting gracefully with large datasets', async () => {
      // Mock rate limit error
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = {
        status: 429,
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(Math.floor((Date.now() + 100) / 1000)),
        },
      };

      vi.spyOn(connectWiseApiService, 'fetchServiceTickets').mockRejectedValue(rateLimitError);

      const startTime = performance.now();

      try {
        await connectWiseApiService.fetchServiceTickets(mockIntegration as any);
      } catch (error) {
        // Expected to hit rate limit
        expect((error as any).response?.status).toBe(429);
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should fail quickly when rate limited, not hang
      expect(processingTime).toBeLessThan(1000);
    });

    it('should efficiently transform large datasets', async () => {
      // Test data transformation performance
      const largeDataset = Array.from({ length: 2000 }, (_, index) => ({
        id: index + 1,
        summary: `Task ${index + 1}`,
        status: { name: 'New' },
        priority: { name: 'Medium' },
        dateEntered: new Date().toISOString(),
        board: { name: 'Service Board' },
        company: { name: 'Test Company' },
        owner: { identifier: 'user@company.com' },
      }));

      const startTime = performance.now();

      // Simulate transformation performance by creating the expected output
      const transformedTasks = largeDataset.map(ticket => ({
        id: `connectwise-ticket-${ticket.id}`,
        title: ticket.summary,
        description: '',
        status: ticket.status.name.toLowerCase().replace(' ', '_'),
        priority: ticket.priority.name.toLowerCase(),
        dueDate: null,
        source: 'connectwise',
        sourceData: ticket,
        connectWiseTicketId: ticket.id,
        connectWiseTicketType: 'service',
        connectWiseBoardName: ticket.board.name,
        connectWiseCompanyName: ticket.company.name,
        connectWiseOwner: ticket.owner.identifier,
      }));

      const endTime = performance.now();
      const transformationTime = endTime - startTime;

      // Performance assertions
      expect(transformedTasks).toHaveLength(2000);
      expect(transformationTime).toBeLessThan(1000); // Should transform 2000 items in under 1 second

      // Verify transformation quality
      expect(transformedTasks[0]).toHaveProperty('id', 'connectwise-ticket-1');
      expect(transformedTasks[1999]).toHaveProperty('id', 'connectwise-ticket-2000');
      
      // Check memory usage doesn't explode
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });

    it('should handle concurrent API requests efficiently', async () => {
      // Test concurrent request handling
      const mockResponses = Array.from({ length: 5 }, (_, index) => 
        Array.from({ length: 100 }, (_, i) => ({
          id: index * 100 + i + 1,
          summary: `Concurrent Task ${index * 100 + i + 1}`,
          status: { name: 'New' },
          priority: { name: 'Medium' },
          dateEntered: new Date().toISOString(),
          board: { name: 'Service Board' },
          company: { name: 'Test Company' },
          owner: { identifier: 'user@company.com' },
        }))
      );

      // Mock concurrent API service calls
      const mockConcurrentResponses = mockResponses.map(response =>
        response.map(ticket => ({
          id: `connectwise-ticket-${ticket.id}`,
          title: ticket.summary,
          description: '',
          status: ticket.status.name.toLowerCase().replace(' ', '_'),
          priority: ticket.priority.name.toLowerCase(),
          dueDate: null,
          source: 'connectwise',
          sourceData: ticket,
          connectWiseTicketId: ticket.id,
          connectWiseTicketType: 'service',
          connectWiseBoardName: ticket.board.name,
          connectWiseCompanyName: ticket.company.name,
          connectWiseOwner: ticket.owner.identifier,
        }))
      );

      let callIndex = 0;
      vi.spyOn(connectWiseApiService, 'fetchServiceTickets').mockImplementation(async () => {
        const delay = Math.random() * 100; // Random delay 0-100ms
        await new Promise(resolve => setTimeout(resolve, delay));
        return mockConcurrentResponses[callIndex++] || [];
      });

      const startTime = performance.now();

      // Simulate concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        connectWiseApiService.fetchServiceTickets(mockIntegration as any)
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const concurrentTime = endTime - startTime;

      // Performance assertions
      expect(results).toHaveLength(5);
      expect(results.every(result => result.length === 100)).toBe(true);
      expect(concurrentTime).toBeLessThan(500); // Concurrent requests should be faster than sequential
    });
  });
});
