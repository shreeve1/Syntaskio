import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Integration } from '@syntaskio/shared-types';

@Injectable()
export class ConnectWiseApiService {
  private readonly logger = new Logger(ConnectWiseApiService.name);

  constructor(private readonly httpService: HttpService) {}

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
        ...serviceTickets.map(ticket => this.transformServiceTicket(ticket)),
        ...projectTasks.map(task => this.transformProjectTask(task)),
      ];

      this.logger.log(`Fetched ${allTasks.length} total tasks (${serviceTickets.length} tickets, ${projectTasks.length} project tasks)`);
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
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Authorization': `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            conditions,
            orderBy: 'dateEntered desc',
            pageSize: 1000,
          },
        })
      );

      return response.data || [];
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
      const projectsResponse = await firstValueFrom(
        this.httpService.get(projectsUrl, {
          headers: {
            'Authorization': `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            conditions: 'status/name="Open"',
            pageSize: 100,
          },
        })
      );

      const projects = projectsResponse.data || [];
      const allTasks = [];

      // Fetch tasks for each project
      for (const project of projects) {
        try {
          const tasksUrl = `${serverUrl}/v4_6_release/apis/3.0/project/projects/${project.id}/tasks`;
          const conditions = memberId ? `assignedTo/identifier='${memberId}'` : '';
          
          const tasksResponse = await firstValueFrom(
            this.httpService.get(tasksUrl, {
              headers: {
                'Authorization': `Bearer ${integration.accessToken}`,
                'Content-Type': 'application/json',
              },
              params: {
                conditions,
                orderBy: 'dateStart desc',
                pageSize: 1000,
              },
            })
          );

          const projectTasks = (tasksResponse.data || []).map(task => ({
            ...task,
            project: { id: project.id, name: project.name },
          }));

          allTasks.push(...projectTasks);
        } catch (error) {
          this.logger.warn(`Failed to fetch tasks for project ${project.id}`, error);
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
  private mapTicketStatus(status?: string): 'pending' | 'in_progress' | 'completed' {
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
  private mapTaskStatus(status?: string): 'pending' | 'in_progress' | 'completed' {
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
  private mapPriority(priority?: string): 'low' | 'medium' | 'high' | undefined {
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
    serverUrl: string
  ) {
    try {
      const tokenUrl = `${serverUrl}/v4_6_release/apis/3.0/system/oauth/token`;
      
      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
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
