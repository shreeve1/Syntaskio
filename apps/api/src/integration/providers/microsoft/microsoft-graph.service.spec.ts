import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { Integration } from '@syntaskio/shared-types';

describe('MicrosoftGraphService', () => {
  let service: MicrosoftGraphService;
  let httpService: jest.Mocked<HttpService>;

  const mockIntegration: Integration = {
    id: 'integration-id',
    userId: 'user-id',
    provider: 'microsoft',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date('2024-12-31T23:59:59Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockTaskLists = [
    { id: 'list-1', displayName: 'Tasks' },
    { id: 'list-2', displayName: 'Personal' },
  ];

  const mockTasks = [
    {
      id: 'task-1',
      title: 'Test Task 1',
      status: 'notStarted',
      importance: 'normal',
      body: { content: 'Task description' },
      dueDateTime: { dateTime: '2024-12-31T23:59:59Z' },
    },
    {
      id: 'task-2',
      title: 'Test Task 2',
      status: 'completed',
      importance: 'high',
      body: { content: 'Another task' },
    },
  ];

  beforeEach(async () => {
    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicrosoftGraphService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<MicrosoftGraphService>(MicrosoftGraphService);
    httpService = module.get(HttpService);
  });

  describe('fetchTasks', () => {
    it('should fetch tasks from all lists successfully', async () => {
      // Mock task lists response
      httpService.get.mockReturnValueOnce(
        of({ data: { value: mockTaskLists } } as any)
      );

      // Mock tasks responses for each list
      httpService.get.mockReturnValueOnce(
        of({ data: { value: [mockTasks[0]] } } as any)
      );
      httpService.get.mockReturnValueOnce(
        of({ data: { value: [mockTasks[1]] } } as any)
      );

      const result = await service.fetchTasks(mockIntegration);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('task-1');
      expect(result[1].id).toBe('task-2');

      // Verify API calls
      expect(httpService.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me/todo/lists',
        {
          headers: {
            Authorization: 'Bearer access-token',
          },
        }
      );

      expect(httpService.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me/todo/lists/list-1/tasks',
        {
          headers: {
            Authorization: 'Bearer access-token',
          },
        }
      );
    });

    it('should handle empty task lists', async () => {
      httpService.get.mockReturnValueOnce(
        of({ data: { value: [] } } as any)
      );

      const result = await service.fetchTasks(mockIntegration);

      expect(result).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      httpService.get.mockReturnValueOnce(
        of({ data: { error: 'Unauthorized' } } as any)
      );

      await expect(service.fetchTasks(mockIntegration))
        .rejects.toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token successfully', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };

      httpService.post.mockReturnValueOnce(
        of({ data: mockTokenResponse } as any)
      );

      const result = await service.refreshToken('refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');

      expect(httpService.post).toHaveBeenCalledWith(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        {
          grant_type: 'refresh_token',
          refresh_token: 'refresh-token',
          client_id: process.env.MICROSOFT_CLIENT_ID,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET,
          scope: 'Tasks.ReadWrite User.Read',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });

    it('should handle token refresh errors', async () => {
      httpService.post.mockReturnValueOnce(
        of({ data: { error: 'invalid_grant' } } as any)
      );

      await expect(service.refreshToken('invalid-refresh-token'))
        .rejects.toThrow();
    });
  });
});
