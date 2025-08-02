import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Integration } from '@syntaskio/shared-types';

@Injectable()
export class MicrosoftGraphService {
  private readonly logger = new Logger(MicrosoftGraphService.name);
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0';
  private readonly scopes = ['Tasks.ReadWrite', 'User.Read'];

  constructor(private readonly httpService: HttpService) {}

  /**
   * Fetch tasks from Microsoft Graph API
   * @param integration The Microsoft integration with access token
   * @returns Array of tasks from Microsoft Todo
   */
  async fetchTasks(integration: Integration): Promise<any[]> {
    try {
      // Get task lists
      const lists = await this.getTaskLists(integration.accessToken);
      
      // Get tasks from all lists
      const allTasks = [];
      for (const list of lists) {
        const tasks = await this.getTasksFromList(integration.accessToken, list.id);
        allTasks.push(...tasks);
      }
      
      return allTasks;
    } catch (error) {
      this.logger.error(`Failed to fetch tasks for integration ${integration.id}`, error);
      throw error;
    }
  }

  /**
   * Get task lists from Microsoft Graph API
   * @param accessToken The access token for Microsoft Graph API
   * @returns Array of task lists
   */
  private async getTaskLists(accessToken: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/me/todo/lists`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      );
      
      return response.data.value || [];
    } catch (error) {
      this.logger.error('Failed to fetch task lists from Microsoft Graph API', error);
      throw error;
    }
  }

  /**
   * Get tasks from a specific list in Microsoft Graph API
   * @param accessToken The access token for Microsoft Graph API
   * @param listId The ID of the task list
   * @returns Array of tasks from the list
   */
  private async getTasksFromList(accessToken: string, listId: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/me/todo/lists/${listId}/tasks`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      );
      
      return response.data.value || [];
    } catch (error) {
      this.logger.error(`Failed to fetch tasks from list ${listId}`, error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken The refresh token
   * @returns New access token and refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      
      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.MICROSOFT_CLIENT_ID,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET,
          scope: this.scopes.join(' '),
        }, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );
      
      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
      };
    } catch (error) {
      this.logger.error('Failed to refresh access token', error);
      throw error;
    }
  }
}
