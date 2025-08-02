import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Integration } from '@syntaskio/shared-types';

interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
}

@Injectable()
export class ConnectWiseApiService {
  private readonly logger = new Logger(ConnectWiseApiService.name);
  private readonly rateLimitInfo = new Map<string, RateLimitInfo>();
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 second

  constructor(private readonly httpService: HttpService) {}

  /**
   * Make HTTP request with retry logic and rate limiting
   * @param url Request URL
   * @param options Request options
   * @param integration Integration for rate limiting key
   * @returns Response data
   */
  private async makeRequest(
    url: string,
    options: any,
    integration: Integration,
  ): Promise<any> {
    const rateLimitKey = `${integration.userId}-${integration.config?.serverUrl}`;

    // Check rate limit
    await this.checkRateLimit(rateLimitKey);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.request({
            url,
            ...options,
          }),
        );

        // Update rate limit info from response headers
        this.updateRateLimitInfo(rateLimitKey, response.headers);

        return response.data;
      } catch (error: any) {
        const isLastAttempt = attempt === this.maxRetries;
        const isRetryableError = this.isRetryableError(error);

        if (isLastAttempt || !isRetryableError) {
          this.logger.error(
            `ConnectWise API request failed after ${attempt} attempts`,
            error,
          );
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = this.baseRetryDelay * Math.pow(2, attempt - 1);
        this.logger.warn(
          `ConnectWise API request failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delay}ms`,
          error.message,
        );

        await this.sleep(delay);
      }
    }
  }

  /**
   * Check if we're within rate limits
   * @param rateLimitKey Rate limit key
   */
  private async checkRateLimit(rateLimitKey: string): Promise<void> {
    const rateLimitInfo = this.rateLimitInfo.get(rateLimitKey);

    if (!rateLimitInfo) {
      return; // No rate limit info yet
    }

    const now = Date.now();

    // Reset rate limit if time has passed
    if (now >= rateLimitInfo.resetTime) {
      this.rateLimitInfo.delete(rateLimitKey);
      return;
    }

    // Check if we have remaining requests
    if (rateLimitInfo.remaining <= 0) {
      const waitTime = rateLimitInfo.resetTime - now;
      this.logger.warn(
        `Rate limit exceeded, waiting ${waitTime}ms until reset`,
      );
      await this.sleep(waitTime);
    }
  }

  /**
   * Update rate limit information from response headers
   * @param rateLimitKey Rate limit key
   * @param headers Response headers
   */
  private updateRateLimitInfo(rateLimitKey: string, headers: any): void {
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '1000');
    const limit = parseInt(headers['x-ratelimit-limit'] || '1000');
    const resetTime = parseInt(headers['x-ratelimit-reset'] || '0') * 1000;

    if (remaining !== undefined && limit !== undefined) {
      this.rateLimitInfo.set(rateLimitKey, {
        remaining: Math.max(0, remaining - 1), // Decrement for this request
        resetTime: resetTime || Date.now() + 3600000, // 1 hour default
        limit,
      });
    }
  }

  /**
   * Check if error is retryable
   * @param error The error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // HTTP status codes that are retryable
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(error.response?.status);
  }

  /**
   * Sleep for specified milliseconds
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetch tasks from ConnectWise Manage API (both service tickets and project tasks)
   * @param integration The ConnectWise integration with access token
   * @returns Array of unified tasks
   */
  async fetchTasks(integration: Integration) {
    try {
      const serverUrl = integration.config?.serverUrl;
      if (!serverUrl) {
        throw new Error('ConnectWise server URL not configured');
      }

      const [serviceTickets, projectTasks] = await Promise.all([
        this.fetchServiceTickets(integration),
        this.fetchProjectTasks(integration),
      ]);

      // Combine and transform tasks
      const allTasks = [
        ...serviceTickets.map((ticket) => this.transformServiceTicket(ticket)),
        ...projectTasks.map((task) => this.transformProjectTask(task)),
      ];

      this.logger.log(
        `Fetched ${allTasks.length} total tasks (${serviceTickets.length} tickets, ${projectTasks.length} project tasks)`,
      );
      return allTasks;
    } catch (error) {
      this.logger.error('Failed to fetch ConnectWise tasks', error);
      throw error;
    }
  }

  /**
   * Fetch service tickets from ConnectWise
   * @param integration The ConnectWise integration
   * @returns Array of service tickets
   */
  private async fetchServiceTickets(integration: Integration) {
    try {
      const serverUrl = integration.config?.serverUrl;
      const memberId = integration.config?.memberId;

      const url = `${serverUrl}/v4_6_release/apis/3.0/service/tickets`;
      const conditions = memberId ? `owner/identifier='${memberId}'` : '';

      const data = await this.makeRequest(
        url,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            conditions,
            orderBy: 'dateEntered desc',
            pageSize: 1000,
          },
        },
        integration,
      );

      return data || [];
    } catch (error) {
      this.logger.error('Failed to fetch ConnectWise service tickets', error);
      throw error;
    }
  }

  /**
   * Fetch project tasks from ConnectWise
   * @param integration The ConnectWise integration
   * @returns Array of project tasks
   */
  private async fetchProjectTasks(integration: Integration) {
    try {
      const serverUrl = integration.config?.serverUrl;
      const memberId = integration.config?.memberId;

      // First get projects, then get tasks for each project
      const projectsUrl = `${serverUrl}/v4_6_release/apis/3.0/project/projects`;
      const projects = await this.makeRequest(
        projectsUrl,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            conditions: 'status/name="Open"',
            pageSize: 100,
          },
        },
        integration,
      );

      const allTasks = [];

      // Fetch tasks for each project
      for (const project of projects || []) {
        try {
          const tasksUrl = `${serverUrl}/v4_6_release/apis/3.0/project/projects/${project.id}/tasks`;
          const conditions = memberId
            ? `assignedTo/identifier='${memberId}'`
            : '';

          const tasksData = await this.makeRequest(
            tasksUrl,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${integration.accessToken}`,
                'Content-Type': 'application/json',
              },
              params: {
                conditions,
                orderBy: 'dateStart desc',
                pageSize: 1000,
              },
            },
            integration,
          );

          const projectTasks = (tasksData || []).map((task) => ({
            ...task,
            project: { id: project.id, name: project.name },
          }));

          allTasks.push(...projectTasks);
        } catch (error) {
          this.logger.warn(
            `Failed to fetch tasks for project ${project.id}`,
            error,
          );
        }
      }

      return allTasks;
    } catch (error) {
      this.logger.error('Failed to fetch ConnectWise project tasks', error);
      throw error;
    }
  }

  /**
   * Transform ConnectWise service ticket to unified Task format
   * @param ticket ConnectWise service ticket
   * @returns Unified Task object
   */
  private transformServiceTicket(ticket: any) {
    return {
      id: `connectwise-ticket-${ticket.id}`,
      title: ticket.summary || 'Untitled Ticket',
      description: ticket.initialDescription || '',
      status: this.mapTicketStatus(ticket.status?.name),
      priority: this.mapPriority(ticket.priority?.name),
      dueDate: ticket.requiredDate ? new Date(ticket.requiredDate) : undefined,
      source: 'connectwise' as const,
      sourceData: {
        ticketId: ticket.id,
        ticketType: 'service' as const,
        boardName: ticket.board?.name,
        companyName: ticket.company?.name,
        owner: ticket.owner?.identifier,
        requiredDate: ticket.requiredDate,
      },
    };
  }

  /**
   * Transform ConnectWise project task to unified Task format
   * @param task ConnectWise project task
   * @returns Unified Task object
   */
  private transformProjectTask(task: any) {
    return {
      id: `connectwise-task-${task.id}`,
      title: task.name || 'Untitled Task',
      description: task.notes || '',
      status: this.mapTaskStatus(task.status?.name),
      priority: this.mapPriority(task.priority?.name),
      dueDate: task.dateDue ? new Date(task.dateDue) : undefined,
      source: 'connectwise' as const,
      sourceData: {
        taskId: task.id,
        ticketType: 'project' as const,
        projectName: task.project?.name,
        assignedTo: task.assignedTo?.identifier,
      },
    };
  }

  /**
   * Map ConnectWise ticket status to unified status
   * @param status ConnectWise ticket status
   * @returns Unified status
   */
  private mapTicketStatus(
    status?: string,
  ): 'pending' | 'in_progress' | 'completed' {
    if (!status) return 'pending';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('closed') || statusLower.includes('resolved')) {
      return 'completed';
    }
    if (statusLower.includes('progress') || statusLower.includes('assigned')) {
      return 'in_progress';
    }
    return 'pending';
  }

  /**
   * Map ConnectWise task status to unified status
   * @param status ConnectWise task status
   * @returns Unified status
   */
  private mapTaskStatus(
    status?: string,
  ): 'pending' | 'in_progress' | 'completed' {
    if (!status) return 'pending';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('complete') || statusLower.includes('done')) {
      return 'completed';
    }
    if (statusLower.includes('progress') || statusLower.includes('active')) {
      return 'in_progress';
    }
    return 'pending';
  }

  /**
   * Map ConnectWise priority to unified priority
   * @param priority ConnectWise priority
   * @returns Unified priority
   */
  private mapPriority(
    priority?: string,
  ): 'low' | 'medium' | 'high' | undefined {
    if (!priority) return undefined;

    const priorityLower = priority.toLowerCase();
    if (priorityLower.includes('high') || priorityLower.includes('urgent')) {
      return 'high';
    }
    if (priorityLower.includes('low')) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Refresh ConnectWise access token
   * @param refreshToken The refresh token
   * @param clientId The client ID
   * @param clientSecret The client secret
   * @param redirectUri The redirect URI
   * @param serverUrl The ConnectWise server URL
   * @returns New token data
   */
  async refreshToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    serverUrl: string,
  ) {
    try {
      const tokenUrl = `${serverUrl}/v4_6_release/apis/3.0/system/oauth/token`;

      const response = await firstValueFrom(
        this.httpService.post(
          tokenUrl,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken,
      };
    } catch (error) {
      this.logger.error('Failed to refresh ConnectWise token', error);
      throw error;
    }
  }
}
