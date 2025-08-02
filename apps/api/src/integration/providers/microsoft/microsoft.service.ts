import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Integration } from '@syntaskio/shared-types';
import { MicrosoftGraphService } from './microsoft-graph.service';

@Injectable()
export class MicrosoftService {
  private readonly logger = new Logger(MicrosoftService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly microsoftGraphService: MicrosoftGraphService,
  ) {}

  /**
   * Fetch tasks from Microsoft Todo API
   * @param integration The Microsoft integration with access token
   * @returns Array of tasks from Microsoft Todo
   */
  async fetchTasks(integration: Integration) {
    try {
      const tasks = await this.microsoftGraphService.fetchTasks(integration);
      this.logger.log(`Fetched ${tasks.length} tasks from Microsoft Todo for user ${integration.userId}`);
      return tasks;
    } catch (error) {
      this.logger.error(`Failed to fetch tasks from Microsoft Todo for user ${integration.userId}`, error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken The refresh token
   * @param clientId The Microsoft app client ID
   * @param clientSecret The Microsoft app client secret
   * @param redirectUri The redirect URI used in the initial authorization
   * @returns New access token and refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ) {
    try {
      const tokenData = await this.microsoftGraphService.refreshToken(refreshToken);
      this.logger.log('Successfully refreshed Microsoft access token');
      return tokenData;
    } catch (error) {
      this.logger.error('Failed to refresh Microsoft access token', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   * @param code The authorization code
   * @param clientId The Microsoft app client ID
   * @param clientSecret The Microsoft app client secret
   * @param redirectUri The redirect URI used in the initial authorization
   * @returns Token response
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ) {
    try {
      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      
      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, new URLSearchParams({
          client_id: clientId,
          scope: 'Tasks.ReadWrite User.Read',
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          client_secret: clientSecret,
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      this.logger.log('Successfully exchanged code for Microsoft access token');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange code for Microsoft access token', error);
      throw error;
    }
  }
}
