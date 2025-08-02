import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { TaskService } from './task.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateTaskData } from '@syntaskio/shared-types';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get(':id')
  async getTask(@Param('id') id: string) {
    const task = await this.taskService.getTaskById(id);
    
    if (!task) {
      return {
        success: false,
        error: 'Task not found',
        message: 'Task not found',
      };
    }
    
    return {
      success: true,
      data: task,
      message: 'Task retrieved successfully',
    };
  }

  @Get()
  async getTasks(
    @Req() request: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: 'pending' | 'in_progress' | 'completed',
    @Query('source') source?: 'microsoft' | 'connectwise' | 'processplan',
    @Query('priority') priority?: 'low' | 'medium' | 'high',
    @Query('search') search?: string,
  ) {
    // Extract user ID from JWT token
    const userId = (request as any).user.userId;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    const result = await this.taskService.getTasksByUserIdWithPagination(
      userId,
      {
        page: pageNum,
        limit: limitNum,
        status,
        source,
        priority,
        search,
      }
    );

    return {
      success: true,
      data: result.tasks,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
      message: 'Tasks retrieved successfully',
    };
  }

  @Get('integration/:integrationId')
  async getTasksByIntegration(@Param('integrationId') integrationId: string) {
    const tasks = await this.taskService.getTasksByIntegrationId(integrationId);

    return {
      success: true,
      data: tasks,
      message: 'Tasks retrieved successfully',
    };
  }

  @Patch(':id')
  async updateTask(
    @Param('id') id: string,
    @Body() updateTaskData: UpdateTaskData,
    @Req() request: Request,
  ) {
    // Extract user ID from JWT token for authorization
    const userId = (request as any).user.userId;

    // First check if the task belongs to the user
    const existingTask = await this.taskService.getTaskById(id);
    if (!existingTask) {
      return {
        success: false,
        error: 'Task not found',
        message: 'Task not found',
      };
    }

    if (existingTask.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
        message: 'You are not authorized to update this task',
      };
    }

    const updatedTask = await this.taskService.updateTask(id, updateTaskData);

    return {
      success: true,
      data: updatedTask,
      message: 'Task updated successfully',
    };
  }
}
