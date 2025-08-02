import {
  Controller,
  Get,
  UseGuards,
  Req,
  Res,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { MicrosoftService } from './microsoft.service';
import { IntegrationService } from '../../integration.service';
import { TaskAggregationService } from '../../task-aggregation.service';

@Controller('integrations/microsoft')
export class MicrosoftAuthController {
  constructor(
    private readonly microsoftService: MicrosoftService,
    private readonly integrationService: IntegrationService,
    private readonly taskAggregationService: TaskAggregationService,
  ) {}

  /**
   * Initiate Microsoft OAuth flow
   */
  @Get('auth')
  @UseGuards(JwtAuthGuard)
  async microsoftAuth(@Req() request: Request, @Res() response: Response) {
    try {
      // Extract user ID from JWT token
      const userId = (request as any).user.userId;
      
      // Generate state parameter for security
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store state in memory for validation (in production, use Redis or database)
      // For simplicity, we'll store it in memory with a timestamp for cleanup
      const oauthStates = (global as any).oauthStates || {};
      oauthStates[state] = {
        userId,
        timestamp: Date.now(),
      };
      (global as any).oauthStates = oauthStates;
      
      // Build authorization URL
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${process.env.MICROSOFT_CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(process.env.MICROSOFT_REDIRECT_URI)}&` +
        `scope=${encodeURIComponent('Tasks.ReadWrite User.Read')}&` +
        `state=${state}&` +
        `response_mode=query`;
      
      // Redirect to Microsoft OAuth
      response.redirect(authUrl);
    } catch (error) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to initiate Microsoft OAuth flow',
      });
    }
  }

  /**
   * Handle Microsoft OAuth callback
   */
  @Get('callback')
  @UseGuards(JwtAuthGuard)
  async microsoftCallback(
    @Req() request: Request,
    @Res() response: Response,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
  ) {
    try {
      // Extract user ID from JWT token
      const userId = (request as any).user.userId;
      
      // Check for OAuth error
      if (error) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: `Microsoft OAuth error: ${error}`,
        });
      }
      
      // Validate state parameter
      const oauthStates = (global as any).oauthStates || {};
      const storedState = oauthStates[state];
      
      if (!storedState || storedState.userId !== userId) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: 'Invalid state parameter',
        });
      }
      
      // Clean up the state
      delete oauthStates[state];
      (global as any).oauthStates = oauthStates;
      
      // Exchange code for access token
      const tokenResponse = await this.microsoftService.exchangeCodeForToken(
        code,
        process.env.MICROSOFT_CLIENT_ID,
        process.env.MICROSOFT_CLIENT_SECRET,
        process.env.MICROSOFT_REDIRECT_URI,
      );
      
      // Create or update integration
      const integration = await this.integrationService.createIntegration({
        userId,
        provider: 'microsoft',
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      });
      
      // Sync tasks for the new integration
      await this.taskAggregationService.syncTasksForIntegration(integration);
      
      // Redirect to frontend success page
      response.redirect(`${process.env.FRONTEND_URL}/integrations?success=true`);
    } catch (error) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to complete Microsoft OAuth flow',
      });
    }
  }

  /**
   * Disconnect Microsoft integration
   */
  @Get('disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disconnectMicrosoft(@Req() request: Request, @Res() response: Response) {
    try {
      // Extract user ID from JWT token
      const userId = (request as any).user.userId;
      
      // Find Microsoft integration for user
      const integration = await this.integrationService.getIntegrationByUserIdAndProvider(userId, 'microsoft');
      
      if (!integration) {
        return response.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: 'Microsoft integration not found',
        });
      }
      
      // Delete integration
      await this.integrationService.deleteIntegration(integration.id);
      
      response.json({
        success: true,
        message: 'Microsoft integration disconnected successfully',
      });
    } catch (error) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to disconnect Microsoft integration',
      });
    }
  }
}
