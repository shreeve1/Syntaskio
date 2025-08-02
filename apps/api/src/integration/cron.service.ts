import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TaskAggregationService } from './task-aggregation.service';
import { IntegrationService } from './integration.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly taskAggregationService: TaskAggregationService,
    private readonly integrationService: IntegrationService,
  ) {}

  /**
   * Scheduled job to sync tasks for all users every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async syncAllTasks() {
    try {
      this.logger.log('Starting hourly task sync for all users');

      // Get all integrations
      // Note: In a real implementation, you might want to add pagination for large datasets
      const integrations = await this.integrationService.getAllIntegrations();

      // Sync tasks for each integration
      for (const integration of integrations) {
        try {
          await this.taskAggregationService.syncTasksForIntegration(integration);
        } catch (error) {
          this.logger.error(`Failed to sync tasks for integration ${integration.id}`, error);
        }
      }

      this.logger.log('Completed hourly task sync for all users');
    } catch (error) {
      this.logger.error('Failed to sync tasks for all users', error);
    }
  }
}
