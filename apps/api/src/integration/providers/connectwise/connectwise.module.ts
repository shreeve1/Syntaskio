import { Module, forwardRef } from '@nestjs/common';
import { ConnectWiseService } from './connectwise.service';
import { ConnectWiseAuthController } from './connectwise-auth.controller';
import { ConnectWiseApiService } from './connectwise-api.service';
import { HttpModule } from '@nestjs/axios';
import { IntegrationModule } from '../../integration.module';

@Module({
  imports: [HttpModule, forwardRef(() => IntegrationModule)],
  controllers: [ConnectWiseAuthController],
  providers: [ConnectWiseService, ConnectWiseApiService],
  exports: [ConnectWiseService, ConnectWiseApiService],
})
export class ConnectWiseModule {}
