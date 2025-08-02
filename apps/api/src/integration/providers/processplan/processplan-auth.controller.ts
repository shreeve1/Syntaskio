import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ProcessPlanService } from './processplan.service';
import { IntegrationService } from '../../integration.service';
import { TaskAggregationService } from '../../task-aggregation.service';

@Controller('integrations/processplan')
export class ProcessPlanAuthController {
  private readonly logger = new Logger(ProcessPlanAuthController.name);

  constructor(
    private readonly processPlanService: ProcessPlanService,
    private readonly integrationService: IntegrationService,
    private readonly taskAggregationService: TaskAggregationService,
  ) {}

  /**
   * Initiate Process Plan OAuth flow
   */
  @Get('auth')
  @UseGuards(JwtAuthGuard)
  async processPlanAuth(@Req() request: Request, @Res() response: Response) {
    try {
      // Check required environment variables
      if (!process.env.PROCESSPLAN_CLIENT_ID || !process.env.PROCESSPLAN_REDIRECT_URI) {
        this.logger.error('Missing required Process Plan environment variables');
        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: 'Failed to initiate Process Plan OAuth flow',
        });
      }

      // Extract user ID from JWT token
      const userId = (request as any).user.userId;

      // Generate state parameter for security
      const state =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      // Store state in memory for validation (in production, use Redis or database)
      const oauthStates = (global as any).oauthStates || {};
      oauthStates[state] = {
        userId,
        timestamp: Date.now(),
      };
      (global as any).oauthStates = oauthStates;

      // Build authorization URL
      const authUrl =
        `https://api.processplan.com/v1/oauth/authorize?` +
        `client_id=${process.env.PROCESSPLAN_CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(process.env.PROCESSPLAN_REDIRECT_URI)}&` +
        `scope=${encodeURIComponent('read:processes read:steps read:user')}&` +
        `state=${state}&` +
        `response_mode=query`;

      // Redirect to Process Plan OAuth
      response.redirect(authUrl);
    } catch (error) {
      this.logger.error('Failed to initiate Process Plan OAuth flow', error);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to initiate Process Plan OAuth flow',
      });
    }
  }

  /**
   * Handle Process Plan OAuth callback
   */
  @Get('callback')
  async processPlanCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() response: Response,
  ) {
    try {
      // Handle OAuth error
      if (error) {
        return response.redirect(
          `${process.env.FRONTEND_URL}/integrations?error=${encodeURIComponent(error)}`,
        );
      }

      // Validate required parameters
      if (!code || !state) {
        throw new BadRequestException('Missing required OAuth parameters');
      }

      // Validate state parameter
      const oauthStates = (global as any).oauthStates || {};
      const storedState = oauthStates[state];

      if (!storedState) {
        throw new BadRequestException('Invalid or expired OAuth state');
      }

      // Check state expiration (5 minutes)
      if (Date.now() - storedState.timestamp > 5 * 60 * 1000) {
        delete oauthStates[state];
        throw new BadRequestException('OAuth state expired');
      }

      // Clean up the state
      delete oauthStates[state];
      (global as any).oauthStates = oauthStates;

      // Exchange code for access token
      const tokenResponse = await this.processPlanService.exchangeCodeForToken(
        code,
        process.env.PROCESSPLAN_CLIENT_ID,
        process.env.PROCESSPLAN_CLIENT_SECRET,
        process.env.PROCESSPLAN_REDIRECT_URI,
      );

      // Get user information to store in config
      const userInfo = await this.processPlanService.getUserInfo(
        tokenResponse.access_token,
      );

      // Create or update integration
      const integration = await this.integrationService.createIntegration({
        userId: storedState.userId,
        provider: 'processplan',
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        config: {
          userId: userInfo.id,
          teamId: userInfo.teamId,
          accessLevel: userInfo.accessLevel,
        },
      });

      // Sync tasks for the new integration
      await this.taskAggregationService.syncTasksForIntegration(integration);

      // Redirect to frontend success page
      response.redirect(
        `${process.env.FRONTEND_URL}/integrations?success=true&provider=processplan`,
      );
    } catch (_err) {
      response.redirect(
        `${process.env.FRONTEND_URL}/integrations?error=${encodeURIComponent('Failed to complete Process Plan OAuth flow')}`,
      );
    }
  }
}
