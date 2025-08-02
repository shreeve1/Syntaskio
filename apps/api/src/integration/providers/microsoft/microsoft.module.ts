import { Module, forwardRef } from '@nestjs/common';
import { MicrosoftService } from './microsoft.service';
import { MicrosoftAuthController } from './microsoft-auth.controller';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { HttpModule } from '@nestjs/axios';
import { IntegrationModule } from '../../integration.module';
import { TaskModule } from '../../../task/task.module';
import { TaskAggregationService } from '../../task-aggregation.service';

@Module({
  imports: [HttpModule, forwardRef(() => IntegrationModule), TaskModule],
  controllers: [MicrosoftAuthController],
  providers: [MicrosoftService, MicrosoftGraphService, TaskAggregationService],
  exports: [MicrosoftService, MicrosoftGraphService],
})
export class MicrosoftModule {}
