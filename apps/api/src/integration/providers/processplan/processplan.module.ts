import { Module, forwardRef } from '@nestjs/common';
import { ProcessPlanService } from './processplan.service';
import { ProcessPlanAuthController } from './processplan-auth.controller';
import { ProcessPlanApiService } from './processplan-api.service';
import { HttpModule } from '@nestjs/axios';
import { IntegrationModule } from '../../integration.module';

@Module({
  imports: [HttpModule, forwardRef(() => IntegrationModule)],
  controllers: [ProcessPlanAuthController],
  providers: [ProcessPlanService, ProcessPlanApiService],
  exports: [ProcessPlanService, ProcessPlanApiService],
})
export class ProcessPlanModule {}
