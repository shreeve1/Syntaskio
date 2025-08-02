import { Module, forwardRef } from '@nestjs/common';
import { ConnectWiseService } from './connectwise.service';
import { ConnectWiseAuthController } from './connectwise-auth.controller';
import { ConnectWiseApiService } from './connectwise-api.service';
import { HttpModule } from '@nestjs/axios';
import { IntegrationModule } from '../../integration.module';
import { TaskModule } from '../../../task/task.module';
import { TaskAggregationService } from '../../task-aggregation.service';

@Module({
  imports: [HttpModule, forwardRef(() => IntegrationModule), TaskModule],
  controllers: [ConnectWiseAuthController],
  providers: [ConnectWiseService, ConnectWiseApiService, TaskAggregationService],
  exports: [ConnectWiseService, ConnectWiseApiService],
})
export class ConnectWiseModule {}
