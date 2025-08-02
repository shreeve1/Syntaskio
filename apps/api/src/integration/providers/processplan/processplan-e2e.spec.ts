import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('ProcessPlan Integration E2E', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let httpService: HttpService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    httpService = moduleFixture.get<HttpService>(HttpService);

    await app.init();

    // Create test user and get auth token
    const testUser = await prismaService.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
      },
    });
    userId = testUser.id;

    // Mock auth token (in real app, this would come from login)
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.task.deleteMany({
      where: { userId },
    });
    await prismaService.integration.deleteMany({
      where: { userId },
    });
    await prismaService.user.delete({
      where: { id: userId },
    });

    await app.close();
  });

  describe('Complete OAuth2 to Task Sync Workflow', () => {
    it('should complete full Process Plan integration workflow', async () => {
      // Step 1: Initiate OAuth2 flow
      const authResponse = await request(app.getHttpServer())
        .get('/integrations/processplan/auth')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(302); // Redirect to Process Plan

      expect(authResponse.headers.location).toContain('api.processplan.com/v1/oauth/authorize');

      // Step 2: Mock OAuth2 callback with authorization code
      const mockTokenResponse = {
        access_token: 'pp_access_token_12345',
        refresh_token: 'pp_refresh_token_12345',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      const mockUserInfo = {
        id: 'user_12345',
        email: 'user@company.com',
        name: 'John Doe',
        teamId: 'team_67890',
        accessLevel: 'user',
      };

      const mockProcesses = {
        processes: [
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
        ],
      };

      const mockSteps = {
        steps: [
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
        ],
      };

      // Mock HTTP calls to Process Plan API
      vi.spyOn(httpService, 'post').mockImplementation((url: string) => {
        if (url.includes('/oauth/token')) {
          return of({ data: mockTokenResponse } as any);
        }
        return of({ data: {} } as any);
      });

      vi.spyOn(httpService, 'get').mockImplementation((url: string) => {
        if (url.includes('/users/me')) {
          return of({ data: mockUserInfo } as any);
        } else if (url.includes('/processes') && !url.includes('/steps')) {
          return of({ data: mockProcesses } as any);
        } else if (url.includes('/steps')) {
          return of({ data: mockSteps } as any);
        }
        return of({ data: {} } as any);
      });

      // Set up OAuth state
      const state = 'test-oauth-state';
      (global as any).oauthStates = {
        [state]: {
          userId,
          timestamp: Date.now(),
        },
      };

      // Step 3: Handle OAuth callback
      const callbackResponse = await request(app.getHttpServer())
        .get('/integrations/processplan/callback')
        .query({
          code: 'test-authorization-code',
          state: state,
        })
        .expect(302); // Redirect to frontend

      expect(callbackResponse.headers.location).toContain('success=true&provider=processplan');

      // Step 4: Verify integration was created
      const integration = await prismaService.integration.findFirst({
        where: {
          userId,
          provider: 'processplan',
        },
      });

      expect(integration).toBeTruthy();
      expect(integration.provider).toBe('processplan');
      expect(integration.config).toMatchObject({
        userId: 'user_12345',
        teamId: 'team_67890',
        accessLevel: 'user',
      });

      // Step 5: Verify tasks were created
      const tasks = await prismaService.task.findMany({
        where: {
          userId,
          source: 'processplan',
        },
      });

      expect(tasks).toHaveLength(2); // 1 process + 1 step

      const processTask = tasks.find(t => t.processPlanType === 'process');
      const stepTask = tasks.find(t => t.processPlanType === 'step');

      expect(processTask).toBeTruthy();
      expect(processTask.title).toBe('Customer Onboarding');
      expect(processTask.processPlanProcessId).toBe('proc_12345');
      expect(processTask.processPlanProgress).toBe(0.6);

      expect(stepTask).toBeTruthy();
      expect(stepTask.title).toBe('Setup Account');
      expect(stepTask.processPlanStepId).toBe('step_67890');
      expect(stepTask.processPlanOrder).toBe(2);
    });
  });

  describe('OAuth2 Error Handling', () => {
    it('should handle OAuth2 authorization errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/integrations/processplan/callback')
        .query({
          error: 'access_denied',
          error_description: 'User denied authorization',
        })
        .expect(302);

      expect(response.headers.location).toContain('error=access_denied');
    });

    it('should handle invalid OAuth2 state', async () => {
      const response = await request(app.getHttpServer())
        .get('/integrations/processplan/callback')
        .query({
          code: 'test-code',
          state: 'invalid-state',
        })
        .expect(302);

      expect(response.headers.location).toContain('error=');
    });
  });

  describe('Rate Limiting and Error Recovery', () => {
    it('should handle Process Plan API rate limiting', async () => {
      // Create integration first
      const integration = await prismaService.integration.create({
        data: {
          userId,
          provider: 'processplan',
          accessToken: 'encrypted-access-token',
          refreshToken: 'encrypted-refresh-token',
          expiresAt: new Date(Date.now() + 3600000),
          config: {
            userId: 'user_12345',
            teamId: 'team_67890',
          },
        },
      });

      // Mock rate limit error
      vi.spyOn(httpService, 'get').mockImplementation(() => {
        const error = new Error('Rate limit exceeded');
        (error as any).response = {
          status: 429,
          headers: {
            'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 60,
          },
        };
        throw error;
      });

      // Attempt to sync tasks
      const response = await request(app.getHttpServer())
        .post(`/integrations/${integration.id}/sync`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500); // Should handle rate limit error gracefully

      expect(response.body.error).toContain('rate limit');
    });
  });
});
