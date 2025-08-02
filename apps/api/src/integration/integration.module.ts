import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IntegrationService } from './integration.service';
import { IntegrationController } from './integration.controller';
import { TaskAggregationService } from './task-aggregation.service';
import { EncryptionService } from './encryption.service';
import { CronService } from './cron.service';
import { PrismaService } from '../prisma/prisma.service';
import { MicrosoftModule } from './providers/microsoft/microsoft.module';
import { ConnectWiseModule } from './providers/connectwise/connectwise.module';
import { ProcessPlanModule } from './providers/processplan/processplan.module';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [ScheduleModule.forRoot(), MicrosoftModule, ConnectWiseModule, ProcessPlanModule, TaskModule],
  controllers: [IntegrationController],
  providers: [IntegrationService, TaskAggregationService, EncryptionService, CronService, PrismaService],
  exports: [IntegrationService, TaskAggregationService],
})
export class IntegrationModule {}
