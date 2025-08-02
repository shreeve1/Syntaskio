import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Integration } from '@syntaskio/shared-types';
import { ProcessPlanApiService } from './processplan-api.service';

@Injectable()
export class ProcessPlanService {
  private readonly logger = new Logger(ProcessPlanService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly processPlanApiService: ProcessPlanApiService,
  ) {}

  /**
   * Fetch tasks from Process Plan API
   * @param integration The Process Plan integration with access token
   * @returns Array of tasks from Process Plan
   */
  async fetchTasks(integration: Integration) {
    try {
      const tasks = await this.processPlanApiService.fetchTasks(integration);
      this.logger.log(
        `Fetched ${tasks.length} tasks from Process Plan for user ${integration.userId}`,
      );
      return tasks;
    } catch (error) {
      this.logger.error(
        `Failed to fetch tasks from Process Plan for user ${integration.userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken The refresh token
   * @param clientId The Process Plan app client ID
   * @param clientSecret The Process Plan app client secret
   * @param redirectUri The redirect URI used in the initial authorization
   * @returns New access token and refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ) {
    try {
      const tokenData = await this.processPlanApiService.refreshToken(
        refreshToken,
        clientId,
        clientSecret,
        redirectUri,
      );
      this.logger.log('Successfully refreshed Process Plan access token');
      return tokenData;
    } catch (error) {
      this.logger.error('Failed to refresh Process Plan access token', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   * @param code The authorization code
   * @param clientId The Process Plan app client ID
   * @param clientSecret The Process Plan app client secret
   * @param redirectUri The redirect URI used in the initial authorization
   * @returns Token response
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ) {
    try {
      const tokenUrl = 'https://api.processplan.com/v1/oauth/token';

      const response = await firstValueFrom(
        this.httpService.post(
          tokenUrl,
          new URLSearchParams({
            client_id: clientId,
            scope: 'read:processes read:steps read:user',
            code: code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            client_secret: clientSecret,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.logger.log(
        'Successfully exchanged code for Process Plan access token',
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        'Failed to exchange code for Process Plan access token',
        error,
      );
      throw error;
    }
  }

  /**
   * Get user information from Process Plan
   * @param accessToken The access token
   * @returns User information
   */
  async getUserInfo(accessToken: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://api.processplan.com/v1/users/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log('Successfully fetched Process Plan user information');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch Process Plan user information', error);
      throw error;
    }
  }
}
