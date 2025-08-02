import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { readFileSync } from 'fs';
import { join } from 'path';
import { vi } from 'vitest';
import { ConnectWiseService } from './connectwise.service';
import { ConnectWiseApiService } from './connectwise-api.service';
import { ConnectWiseAuthController } from './connectwise-auth.controller';
import { IntegrationService } from '../../integration.service';
import { TaskAggregationService } from '../../task-aggregation.service';

describe('ConnectWise Integration', () => {
  describe('Documentation', () => {
    it('should have ConnectWise OAuth2 documentation', () => {
      const docPath = join(process.cwd(), '../../docs/integrations/connectwise-oauth2.md');
      expect(() => readFileSync(docPath, 'utf8')).not.toThrow();

      const content = readFileSync(docPath, 'utf8');
      expect(content).toContain('ConnectWise Manage OAuth2 Integration');
      expect(content).toContain('OAuth2 Authorization Code Flow');
      expect(content).toContain('ConnectWiseManageCallback');
      expect(content).toContain('ServiceTicket');
      expect(content).toContain('ProjectTask');
    });
  });

  describe('Environment Configuration', () => {
    it('should have ConnectWise environment variables in .env.example', () => {
      const envPath = join(process.cwd(), '.env.example');
      const content = readFileSync(envPath, 'utf8');

      expect(content).toContain('CONNECTWISE_CLIENT_ID');
      expect(content).toContain('CONNECTWISE_CLIENT_SECRET');
      expect(content).toContain('CONNECTWISE_REDIRECT_URI');
    });
  });

  describe('API Permissions and Scopes', () => {
    it('should document required ConnectWise API scopes', () => {
      const docPath = join(process.cwd(), '../../docs/integrations/connectwise-oauth2.md');
      const content = readFileSync(docPath, 'utf8');

      // Verify required scopes are documented
      expect(content).toContain('ConnectWiseManageCallback');
      expect(content).toContain('ServiceTicket');
      expect(content).toContain('ProjectTask');

      // Verify API endpoints are documented
      expect(content).toContain('/service/tickets');
      expect(content).toContain('/project/projects');
      expect(content).toContain('/system/members');
    });

    it('should document rate limits and security considerations', () => {
      const docPath = join(process.cwd(), '../../docs/integrations/connectwise-oauth2.md');
      const content = readFileSync(docPath, 'utf8');

      expect(content).toContain('1000 requests per hour');
      expect(content).toContain('Server URL Validation');
      expect(content).toContain('Token Storage');
      expect(content).toContain('State Parameter');
    });
  });

  describe('ConnectWise Backend Services', () => {
    let connectWiseService: ConnectWiseService;
    let connectWiseApiService: ConnectWiseApiService;
    let httpService: HttpService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ConnectWiseService,
          ConnectWiseApiService,
          {
            provide: HttpService,
            useValue: {
              post: vi.fn(),
              get: vi.fn(),
            },
          },
        ],
      }).compile();

      connectWiseService = module.get<ConnectWiseService>(ConnectWiseService);
      connectWiseApiService = module.get<ConnectWiseApiService>(ConnectWiseApiService);
      httpService = module.get<HttpService>(HttpService);
    });

    describe('ConnectWiseService', () => {
      it('should be defined', () => {
        expect(connectWiseService).toBeDefined();
      });

      it('should validate server URLs correctly', () => {
        // Valid URLs
        expect(connectWiseService.validateServerUrl('https://company.api.connectwisedev.com')).toBe(true);
        expect(connectWiseService.validateServerUrl('https://test.api.connectwise.com')).toBe(true);

        // Invalid URLs
        expect(connectWiseService.validateServerUrl('http://company.api.connectwisedev.com')).toBe(false);
        expect(connectWiseService.validateServerUrl('https://malicious.com')).toBe(false);
        expect(connectWiseService.validateServerUrl('invalid-url')).toBe(false);
      });
    });

    describe('ConnectWiseApiService', () => {
      it('should be defined', () => {
        expect(connectWiseApiService).toBeDefined();
      });

      it('should transform service tickets correctly', () => {
        const mockTicket = {
          id: 12345,
          summary: 'Test Ticket',
          initialDescription: 'Test Description',
          status: { name: 'New' },
          priority: { name: 'High' },
          requiredDate: '2024-08-05T17:00:00Z',
          board: { name: 'Service Board' },
          company: { name: 'Test Company' },
          owner: { identifier: 'user@company.com' },
        };

        const transformed = (connectWiseApiService as any).transformServiceTicket(mockTicket);

        expect(transformed).toEqual({
          id: 'connectwise-ticket-12345',
          title: 'Test Ticket',
          description: 'Test Description',
          status: 'pending',
          priority: 'high',
          dueDate: new Date('2024-08-05T17:00:00Z'),
          source: 'connectwise',
          sourceData: {
            ticketId: 12345,
            ticketType: 'service',
            boardName: 'Service Board',
            companyName: 'Test Company',
            owner: 'user@company.com',
            requiredDate: '2024-08-05T17:00:00Z',
          },
        });
      });

      it('should transform project tasks correctly', () => {
        const mockTask = {
          id: 67890,
          name: 'Test Task',
          notes: 'Test Notes',
          status: { name: 'Open' },
          priority: { name: 'Medium' },
          dateDue: '2024-08-03T17:00:00Z',
          project: { name: 'Test Project' },
          assignedTo: { identifier: 'user@company.com' },
        };

        const transformed = (connectWiseApiService as any).transformProjectTask(mockTask);

        expect(transformed).toEqual({
          id: 'connectwise-task-67890',
          title: 'Test Task',
          description: 'Test Notes',
          status: 'pending',
          priority: 'medium',
          dueDate: new Date('2024-08-03T17:00:00Z'),
          source: 'connectwise',
          sourceData: {
            taskId: 67890,
            ticketType: 'project',
            projectName: 'Test Project',
            assignedTo: 'user@company.com',
          },
        });
      });
    });
  });

  describe('ConnectWise OAuth2 Controller', () => {
    let controller: ConnectWiseAuthController;
    let connectWiseService: ConnectWiseService;
    let integrationService: IntegrationService;
    let taskAggregationService: TaskAggregationService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [ConnectWiseAuthController],
        providers: [
          {
            provide: ConnectWiseService,
            useValue: {
              validateServerUrl: vi.fn(),
              exchangeCodeForToken: vi.fn(),
            },
          },
          {
            provide: IntegrationService,
            useValue: {
              createIntegration: vi.fn(),
              getIntegrationByUserIdAndProvider: vi.fn(),
              deleteIntegration: vi.fn(),
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

      controller = module.get<ConnectWiseAuthController>(ConnectWiseAuthController);
      connectWiseService = module.get<ConnectWiseService>(ConnectWiseService);
      integrationService = module.get<IntegrationService>(IntegrationService);
      taskAggregationService = module.get<TaskAggregationService>(TaskAggregationService);
    });

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should validate server URL in auth request', async () => {
      const mockRequest = {
        user: { userId: 'test-user-id' },
      } as any;

      const mockResponse = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as any;

      const authRequest = {
        serverUrl: 'https://test.api.connectwisedev.com',
        companyId: 'test-company',
      };

      vi.mocked(connectWiseService.validateServerUrl).mockReturnValue(true);

      await controller.connectWiseAuth(mockRequest, mockResponse, authRequest);

      expect(connectWiseService.validateServerUrl).toHaveBeenCalledWith(authRequest.serverUrl);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        authUrl: expect.stringContaining('https://test.api.connectwisedev.com'),
      });
    });
  });
});
