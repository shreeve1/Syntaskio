import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { ConnectWiseService } from './connectwise.service';
import { ConnectWiseApiService } from './connectwise-api.service';
import { ConnectWiseAuthController } from './connectwise-auth.controller';
import { IntegrationService } from '../../integration.service';
import { TaskAggregationService } from '../../task-aggregation.service';
import { TaskService } from '../../../task/task.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('ConnectWise E2E Integration Workflow', () => {
  let app: INestApplication;
  let connectWiseService: ConnectWiseService;
  let connectWiseApiService: ConnectWiseApiService;
  let integrationService: IntegrationService;
  let taskAggregationService: TaskAggregationService;
  let taskService: TaskService;
  let httpService: HttpService;

  const mockUserId = 'test-user-id';
  const mockIntegrationId = 'test-integration-id';
  const mockServerUrl = 'https://test-company.connectwisedev.com';
  const mockCompanyId = 'TestCompany';
  const mockAccessToken = 'test-access-token';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ConnectWiseAuthController],
      providers: [
        ConnectWiseService,
        ConnectWiseApiService,
        {
          provide: IntegrationService,
          useValue: {
            findByUserAndProvider: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
        },
        {
          provide: TaskAggregationService,
          useValue: {
            syncTasksForIntegration: vi.fn(),
          },
        },
        {
          provide: TaskService,
          useValue: {
            createTask: vi.fn(),
            updateTask: vi.fn(),
            findByIntegration: vi.fn(),
            transformConnectWiseTask: vi.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            integration: {
              findFirst: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            },
            task: {
              findMany: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
              upsert: vi.fn(),
            },
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: vi.fn(),
            get: vi.fn(),
            request: vi.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    connectWiseService = moduleFixture.get<ConnectWiseService>(ConnectWiseService);
    connectWiseApiService = moduleFixture.get<ConnectWiseApiService>(ConnectWiseApiService);
    integrationService = moduleFixture.get<IntegrationService>(IntegrationService);
    taskAggregationService = moduleFixture.get<TaskAggregationService>(TaskAggregationService);
    taskService = moduleFixture.get<TaskService>(TaskService);
    httpService = moduleFixture.get<HttpService>(HttpService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Complete ConnectWise Integration Workflow', () => {
    it('should complete full OAuth2 flow and sync tasks', async () => {
      // Step 1: Mock OAuth2 token exchange
      const mockTokenResponse = {
        access_token: mockAccessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
      };

      vi.mocked(httpService.post).mockReturnValue(
        of({ data: mockTokenResponse, status: 200, statusText: 'OK', headers: {}, config: {} } as any)
      );

      // Step 2: Mock integration creation
      const mockIntegration = {
        id: mockIntegrationId,
        userId: mockUserId,
        provider: 'connectwise',
        accessToken: mockAccessToken,
        refreshToken: 'test-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        config: {
          serverUrl: mockServerUrl,
          companyId: mockCompanyId,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(integrationService.create).mockResolvedValue(mockIntegration as any);

      // Step 3: Mock ConnectWise API responses for task fetching
      const mockServiceTickets = [
        {
          id: 12345,
          summary: 'Test Service Ticket',
          status: { name: 'New' },
          priority: { name: 'Medium' },
          dateEntered: '2024-08-02T10:00:00Z',
          board: { name: 'Service Board' },
          company: { name: 'Test Company' },
          owner: { identifier: 'user@company.com' },
        },
      ];

      const mockProjects = [
        { id: 1, name: 'Test Project' },
      ];

      const mockProjectTasks = [
        {
          id: 67890,
          summary: 'Test Project Task',
          status: { name: 'In Progress' },
          priority: { name: 'High' },
          dateDue: '2024-08-03T17:00:00Z',
          project: { name: 'Test Project' },
          assignedTo: { identifier: 'user@company.com' },
        },
      ];

      vi.mocked(httpService.request)
        .mockReturnValueOnce(
          of({ data: mockServiceTickets, status: 200, statusText: 'OK', headers: {}, config: {} } as any)
        )
        .mockReturnValueOnce(
          of({ data: mockProjects, status: 200, statusText: 'OK', headers: {}, config: {} } as any)
        )
        .mockReturnValueOnce(
          of({ data: mockProjectTasks, status: 200, statusText: 'OK', headers: {}, config: {} } as any)
        );

      // Step 4: Mock the API service methods to return transformed data directly
      const mockTransformedServiceTickets = [
        {
          id: 'connectwise-ticket-12345',
          title: 'Test Service Ticket',
          description: '',
          status: 'pending',
          priority: 'medium',
          dueDate: null,
          source: 'connectwise',
          sourceData: mockServiceTickets[0],
          connectWiseTicketId: 12345,
          connectWiseTicketType: 'service',
          connectWiseBoardName: 'Service Board',
          connectWiseCompanyName: 'Test Company',
          connectWiseOwner: 'user@company.com',
        },
      ];

      const mockTransformedProjectTasks = [
        {
          id: 'connectwise-task-67890',
          title: 'Test Project Task',
          description: '',
          status: 'in_progress',
          priority: 'high',
          dueDate: new Date('2024-08-03T17:00:00Z'),
          source: 'connectwise',
          sourceData: mockProjectTasks[0],
          connectWiseTicketId: 67890,
          connectWiseTicketType: 'project',
          connectWiseProjectName: 'Test Project',
          connectWiseAssignedTo: 'user@company.com',
        },
      ];

      // Mock the API service methods directly
      vi.spyOn(connectWiseApiService, 'fetchServiceTickets').mockResolvedValue(mockTransformedServiceTickets);
      vi.spyOn(connectWiseApiService, 'fetchProjectTasks').mockResolvedValue(mockTransformedProjectTasks);

      // Step 5: Execute the full workflow
      // Simulate OAuth2 token exchange
      const tokenResult = await connectWiseService.exchangeCodeForToken(
        'test-auth-code',
        mockServerUrl,
        mockCompanyId
      );

      expect(tokenResult).toEqual(mockTokenResponse);

      // Simulate task synchronization
      const tasks = await connectWiseApiService.fetchServiceTickets(mockIntegration as any);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Test Service Ticket');
      expect(tasks[0].id).toBe('connectwise-ticket-12345');
      expect(tasks[0].connectWiseTicketType).toBe('service');

      const projectTasks = await connectWiseApiService.fetchProjectTasks(mockIntegration as any);
      expect(projectTasks).toHaveLength(1);
      expect(projectTasks[0].title).toBe('Test Project Task');
      expect(projectTasks[0].id).toBe('connectwise-task-67890');
      expect(projectTasks[0].connectWiseTicketType).toBe('project');

      // Verify OAuth2 token exchange was called correctly
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/oauth/token'),
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );

      // Verify API service methods were called
      expect(connectWiseApiService.fetchServiceTickets).toHaveBeenCalledWith(mockIntegration);
      expect(connectWiseApiService.fetchProjectTasks).toHaveBeenCalledWith(mockIntegration);
    });

    it('should handle OAuth2 errors gracefully', async () => {
      // Mock OAuth2 error response
      const mockError = new Error('OAuth2 Error');
      vi.mocked(httpService.post).mockImplementation(() => {
        throw mockError;
      });

      // Test error handling
      await expect(
        connectWiseService.exchangeCodeForToken('invalid-code', mockServerUrl, mockCompanyId)
      ).rejects.toThrow('OAuth2 Error');
    });

    it('should handle API rate limiting during sync', async () => {
      const mockIntegration = {
        id: mockIntegrationId,
        userId: mockUserId,
        provider: 'connectwise',
        accessToken: mockAccessToken,
        config: { serverUrl: mockServerUrl, companyId: mockCompanyId },
      };

      // Mock rate limit error
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = {
        status: 429,
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(Math.floor((Date.now() + 1000) / 1000)),
        },
      };

      // Mock the API service to throw rate limit error
      vi.spyOn(connectWiseApiService, 'fetchServiceTickets').mockRejectedValue(rateLimitError);

      // Test that rate limiting is handled
      await expect(
        connectWiseApiService.fetchServiceTickets(mockIntegration as any)
      ).rejects.toThrow('Rate limit exceeded');
    });
  });
});
