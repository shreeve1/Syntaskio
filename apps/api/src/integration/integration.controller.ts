import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Param,
  Put,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { IntegrationService } from './integration.service';
import { TaskAggregationService } from './task-aggregation.service';
import { CreateIntegrationData, UpdateIntegrationData } from '@syntaskio/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly taskAggregationService: TaskAggregationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createIntegration(
    @Body() createIntegrationData: CreateIntegrationData,
    @Req() request: Request,
  ) {
    // Extract user ID from JWT token
    const userId = (request as any).user.userId;
    
    // Add user ID to the create data
    const integrationData = {
      ...createIntegrationData,
      userId,
    };

    const integration = await this.integrationService.createIntegration(integrationData);
    
    return {
      success: true,
      data: integration,
      message: 'Integration created successfully',
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getIntegration(@Param('id') id: string) {
    const integration = await this.integrationService.getIntegrationById(id);
    
    if (!integration) {
      return {
        success: false,
        error: 'Integration not found',
        message: 'Integration not found',
      };
    }
    
    return {
      success: true,
      data: integration,
      message: 'Integration retrieved successfully',
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getIntegrations(@Req() request: Request) {
    // Extract user ID from JWT token
    const userId = (request as any).user.userId;
    
    const integrations = await this.integrationService.getIntegrationsByUserId(userId);
    
    return {
      success: true,
      data: integrations,
      message: 'Integrations retrieved successfully',
    };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateIntegration(
    @Param('id') id: string,
    @Body() updateIntegrationData: UpdateIntegrationData,
  ) {
    try {
      const integration = await this.integrationService.updateIntegration(id, updateIntegrationData);
      
      return {
        success: true,
        data: integration,
        message: 'Integration updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to update integration',
      };
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteIntegration(@Param('id') id: string) {
    try {
      await this.integrationService.deleteIntegration(id);
      
      return {
        success: true,
        message: 'Integration deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to delete integration',
      };
    }
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
  async syncIntegrationTasks(
    @Param('id') id: string,
  ) {
    try {
      const integration = await this.integrationService.getIntegrationById(id);
      
      if (!integration) {
        return {
          success: false,
          error: 'Integration not found',
          message: 'Integration not found',
        };
      }
      
      const tasks = await this.taskAggregationService.syncTasksForIntegration(integration);
      
      return {
        success: true,
        data: tasks,
        message: `Synchronized ${tasks.length} tasks from ${integration.provider}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to synchronize tasks',
      };
    }
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncAllIntegrationTasks(@Req() request: Request) {
    try {
      // Extract user ID from JWT token
      const userId = (request as any).user.userId;
      
      const tasks = await this.taskAggregationService.syncTasksForUser(userId);
      
      return {
        success: true,
        data: tasks,
        message: `Synchronized ${tasks.length} tasks from all integrations`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to synchronize tasks',
      };
    }
  }
}
