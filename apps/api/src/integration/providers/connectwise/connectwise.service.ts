import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Integration } from '@syntaskio/shared-types';
import { ConnectWiseApiService } from './connectwise-api.service';

@Injectable()
export class ConnectWiseService {
  private readonly logger = new Logger(ConnectWiseService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly connectWiseApiService: ConnectWiseApiService,
  ) {}

  /**
   * Fetch tasks from ConnectWise Manage API
   * @param integration The ConnectWise integration with access token
   * @returns Array of tasks from ConnectWise Manage
   */
  async fetchTasks(integration: Integration) {
    try {
      const tasks = await this.connectWiseApiService.fetchTasks(integration);
      this.logger.log(`Fetched ${tasks.length} tasks from ConnectWise Manage for user ${integration.userId}`);
      return tasks;
    } catch (error) {
      this.logger.error(`Failed to fetch tasks from ConnectWise Manage for user ${integration.userId}`, error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken The refresh token
   * @param clientId The ConnectWise app client ID
   * @param clientSecret The ConnectWise app client secret
   * @param redirectUri The redirect URI used in the initial authorization
   * @param serverUrl The ConnectWise server URL
   * @returns New access token and refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    serverUrl: string
  ) {
    try {
      const tokenData = await this.connectWiseApiService.refreshToken(
        refreshToken,
        clientId,
        clientSecret,
        redirectUri,
        serverUrl
      );
      this.logger.log('Successfully refreshed ConnectWise access token');
      return tokenData;
    } catch (error) {
      this.logger.error('Failed to refresh ConnectWise access token', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   * @param code The authorization code
   * @param clientId The ConnectWise app client ID
   * @param clientSecret The ConnectWise app client secret
   * @param redirectUri The redirect URI used in the initial authorization
   * @param serverUrl The ConnectWise server URL
   * @returns Token response
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    serverUrl: string
  ) {
    try {
      const tokenUrl = `${serverUrl}/v4_6_release/apis/3.0/system/oauth/token`;
      
      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, new URLSearchParams({
          client_id: clientId,
          scope: 'ConnectWiseManageCallback ServiceTicket ProjectTask',
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

      this.logger.log('Successfully exchanged code for ConnectWise access token');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange code for ConnectWise access token', error);
      throw error;
    }
  }

  /**
   * Validate ConnectWise server URL for security
   * @param serverUrl The server URL to validate
   * @returns True if valid, false otherwise
   */
  validateServerUrl(serverUrl: string): boolean {
    try {
      const url = new URL(serverUrl);
      
      // Only allow HTTPS
      if (url.protocol !== 'https:') {
        return false;
      }
      
      // Only allow ConnectWise API domains
      const allowedDomains = [
        'api.connectwisedev.com',
        'api.connectwise.com'
      ];
      
      const hostname = url.hostname.toLowerCase();
      return allowedDomains.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
      );
    } catch (error) {
      this.logger.warn(`Invalid server URL format: ${serverUrl}`);
      return false;
    }
  }
}
