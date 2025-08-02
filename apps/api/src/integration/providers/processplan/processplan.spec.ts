import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ProcessPlanService } from './processplan.service';
import { ProcessPlanApiService } from './processplan-api.service';
import { ProcessPlanAuthController } from './processplan-auth.controller';
import { IntegrationService } from '../../integration.service';
import { TaskAggregationService } from '../../task-aggregation.service';
import { Integration } from '@syntaskio/shared-types';

describe('ProcessPlanService', () => {
  let service: ProcessPlanService;
  let httpService: HttpService;
  let processPlanApiService: ProcessPlanApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessPlanService,
        {
          provide: HttpService,
          useValue: {
            post: vi.fn(),
            get: vi.fn(),
          },
        },
        {
          provide: ProcessPlanApiService,
          useValue: {
            fetchTasks: vi.fn(),
            refreshToken: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProcessPlanService>(ProcessPlanService);
    httpService = module.get<HttpService>(HttpService);
    processPlanApiService = module.get<ProcessPlanApiService>(ProcessPlanApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchTasks', () => {
    it('should fetch tasks successfully', async () => {
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

      const mockTasks = [
        {
          id: 'processplan-process-1',
          title: 'Test Process',
          description: 'Test process description',
          status: 'in_progress',
          source: 'processplan',
        },
      ];

      vi.spyOn(processPlanApiService, 'fetchTasks').mockResolvedValue(mockTasks as any);

      const result = await service.fetchTasks(mockIntegration);

      expect(result).toEqual(mockTasks);
      expect(processPlanApiService.fetchTasks).toHaveBeenCalledWith(mockIntegration);
    });

    it('should handle fetch tasks error', async () => {
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

      const error = new Error('API Error');
      vi.spyOn(processPlanApiService, 'fetchTasks').mockRejectedValue(error);

      await expect(service.fetchTasks(mockIntegration)).rejects.toThrow('API Error');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange code for token successfully', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      vi.spyOn(httpService, 'post').mockReturnValue(
        of({ data: mockTokenResponse } as any)
      );

      const result = await service.exchangeCodeForToken(
        'test-code',
        'test-client-id',
        'test-client-secret',
        'test-redirect-uri'
      );

      expect(result).toEqual(mockTokenResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.processplan.com/v1/oauth/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );
    });

    it('should handle token exchange error', async () => {
      const error = new Error('Token exchange failed');
      vi.spyOn(httpService, 'post').mockReturnValue(throwError(() => error));

      await expect(
        service.exchangeCodeForToken(
          'test-code',
          'test-client-id',
          'test-client-secret',
          'test-redirect-uri'
        )
      ).rejects.toThrow('Token exchange failed');
    });
  });

  describe('getUserInfo', () => {
    it('should get user info successfully', async () => {
      const mockUserInfo = {
        id: 'user_12345',
        email: 'user@company.com',
        name: 'John Doe',
        teamId: 'team_67890',
        accessLevel: 'user',
      };

      vi.spyOn(httpService, 'get').mockReturnValue(
        of({ data: mockUserInfo } as any)
      );

      const result = await service.getUserInfo('test-access-token');

      expect(result).toEqual(mockUserInfo);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.processplan.com/v1/users/me',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-access-token',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle get user info error', async () => {
      const error = new Error('User info fetch failed');
      vi.spyOn(httpService, 'get').mockReturnValue(throwError(() => error));

      await expect(service.getUserInfo('test-access-token')).rejects.toThrow(
        'User info fetch failed'
      );
    });
  });
});

describe('ProcessPlanApiService', () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchTasks', () => {
    it('should fetch and transform tasks successfully', async () => {
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

      const mockProcesses = [
        {
          id: 'proc_12345',
          name: 'Customer Onboarding',
          description: 'Complete customer setup process',
          status: 'active',
          assignedTo: 'user@company.com',
          createdAt: '2024-08-01T10:00:00Z',
          dueDate: '2024-08-10T17:00:00Z',
          progress: 0.6,
          currentStep: {
            id: 'step_67890',
            name: 'Setup Account',
            status: 'in_progress',
          },
          totalSteps: 5,
          completedSteps: 3,
        },
      ];

      const mockSteps = [
        {
          id: 'step_67890',
          processId: 'proc_12345',
          name: 'Setup Account',
          description: 'Create customer account in system',
          status: 'pending',
          assignedTo: 'user@company.com',
          order: 2,
          estimatedDuration: 120,
          dueDate: '2024-08-03T17:00:00Z',
          dependencies: ['step_67889'],
          tags: ['setup', 'account'],
          priority: 'high',
        },
      ];

      // Mock processes API call
      vi.spyOn(httpService, 'get').mockImplementation((url: string) => {
        if (url.includes('/processes') && !url.includes('/steps')) {
          return of({ data: { processes: mockProcesses } } as any);
        } else if (url.includes('/steps')) {
          return of({ data: { steps: mockSteps } } as any);
        }
        return of({ data: {} } as any);
      });

      const result = await service.fetchTasks(mockIntegration);

      expect(result).toHaveLength(2); // 1 process + 1 step
      expect(result[0].source).toBe('processplan');
      expect(result[0].processPlanType).toBe('process');
      expect(result[1].processPlanType).toBe('step');
    });

    it('should handle API errors gracefully', async () => {
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

      const error = new Error('API Error');
      vi.spyOn(httpService, 'get').mockReturnValue(throwError(() => error));

      await expect(service.fetchTasks(mockIntegration)).rejects.toThrow('API Error');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      vi.spyOn(httpService, 'post').mockReturnValue(
        of({ data: mockTokenResponse } as any)
      );

      const result = await service.refreshToken(
        'old-refresh-token',
        'client-id',
        'client-secret',
        'redirect-uri'
      );

      expect(result).toEqual(mockTokenResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.processplan.com/v1/oauth/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );
    });

    it('should handle refresh token error', async () => {
      const error = new Error('Refresh failed');
      vi.spyOn(httpService, 'post').mockReturnValue(throwError(() => error));

      await expect(
        service.refreshToken(
          'old-refresh-token',
          'client-id',
          'client-secret',
          'redirect-uri'
        )
      ).rejects.toThrow('Refresh failed');
    });
  });
});

describe('ProcessPlanAuthController', () => {
  let controller: ProcessPlanAuthController;
  let processPlanService: ProcessPlanService;
  let integrationService: IntegrationService;
  let taskAggregationService: TaskAggregationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcessPlanAuthController],
      providers: [
        {
          provide: ProcessPlanService,
          useValue: {
            exchangeCodeForToken: vi.fn(),
            getUserInfo: vi.fn(),
          },
        },
        {
          provide: IntegrationService,
          useValue: {
            createIntegration: vi.fn(),
          },
        },
        {
          provide: TaskAggregationService,
          useValue: {
            syncTasksForIntegration: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProcessPlanAuthController>(ProcessPlanAuthController);
    processPlanService = module.get<ProcessPlanService>(ProcessPlanService);
    integrationService = module.get<IntegrationService>(IntegrationService);
    taskAggregationService = module.get<TaskAggregationService>(TaskAggregationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('processPlanAuth', () => {
    it('should initiate OAuth flow and redirect', async () => {
      const mockRequest = {
        user: { userId: 'test-user-id' },
      } as any;

      const mockResponse = {
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      // Set up environment variables
      process.env.PROCESSPLAN_CLIENT_ID = 'test-client-id';
      process.env.PROCESSPLAN_REDIRECT_URI = 'http://localhost:3001/integrations/processplan/callback';

      await controller.processPlanAuth(mockRequest, mockResponse);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('https://api.processplan.com/v1/oauth/authorize')
      );
    });

    it('should handle OAuth initiation error', async () => {
      const mockRequest = {
        user: { userId: 'test-user-id' },
      } as any;

      const mockResponse = {
        redirect: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;

      // Clear environment variables to cause error
      delete process.env.PROCESSPLAN_CLIENT_ID;

      await controller.processPlanAuth(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to initiate Process Plan OAuth flow',
      });
    });
  });

  describe('processPlanCallback', () => {
    beforeEach(() => {
      // Set up environment variables
      process.env.PROCESSPLAN_CLIENT_ID = 'test-client-id';
      process.env.PROCESSPLAN_CLIENT_SECRET = 'test-client-secret';
      process.env.PROCESSPLAN_REDIRECT_URI = 'http://localhost:3001/integrations/processplan/callback';
      process.env.FRONTEND_URL = 'http://localhost:3000';

      // Set up global OAuth states
      (global as any).oauthStates = {
        'test-state': {
          userId: 'test-user-id',
          timestamp: Date.now(),
        },
      };
    });

    it('should handle successful OAuth callback', async () => {
      const mockResponse = {
        redirect: vi.fn(),
      } as any;

      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      };

      const mockUserInfo = {
        id: 'user_12345',
        teamId: 'team_67890',
        accessLevel: 'user',
      };

      const mockIntegration = {
        id: 'test-integration-id',
        userId: 'test-user-id',
        provider: 'processplan',
      };

      vi.spyOn(processPlanService, 'exchangeCodeForToken').mockResolvedValue(mockTokenResponse);
      vi.spyOn(processPlanService, 'getUserInfo').mockResolvedValue(mockUserInfo);
      vi.spyOn(integrationService, 'createIntegration').mockResolvedValue(mockIntegration as any);
      vi.spyOn(taskAggregationService, 'syncTasksForIntegration').mockResolvedValue(undefined);

      await controller.processPlanCallback(
        'test-code',
        'test-state',
        undefined,
        mockResponse
      );

      expect(processPlanService.exchangeCodeForToken).toHaveBeenCalledWith(
        'test-code',
        'test-client-id',
        'test-client-secret',
        'http://localhost:3001/integrations/processplan/callback'
      );
      expect(integrationService.createIntegration).toHaveBeenCalled();
      expect(taskAggregationService.syncTasksForIntegration).toHaveBeenCalledWith(mockIntegration);
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/integrations?success=true&provider=processplan'
      );
    });

    it('should handle OAuth error', async () => {
      const mockResponse = {
        redirect: vi.fn(),
      } as any;

      await controller.processPlanCallback(
        undefined,
        undefined,
        'access_denied',
        mockResponse
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000/integrations?error=access_denied'
      );
    });

    it('should handle invalid state', async () => {
      const mockResponse = {
        redirect: vi.fn(),
      } as any;

      await controller.processPlanCallback(
        'test-code',
        'invalid-state',
        undefined,
        mockResponse
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=')
      );
    });
  });
});
