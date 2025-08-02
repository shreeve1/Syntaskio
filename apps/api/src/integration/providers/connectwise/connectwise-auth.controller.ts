import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ConnectWiseService } from './connectwise.service';
import { IntegrationService } from '../../integration.service';
import { TaskAggregationService } from '../../task-aggregation.service';

interface ConnectWiseAuthRequest {
  serverUrl: string;
  companyId: string;
}

@Controller('integrations/connectwise')
export class ConnectWiseAuthController {
  constructor(
    private readonly connectWiseService: ConnectWiseService,
    private readonly integrationService: IntegrationService,
    private readonly taskAggregationService: TaskAggregationService,
  ) {}

  /**
   * Initiate ConnectWise OAuth flow
   */
  @Post('auth')
  @UseGuards(JwtAuthGuard)
  async connectWiseAuth(
    @Req() request: Request,
    @Res() response: Response,
    @Body() authRequest: ConnectWiseAuthRequest
  ) {
    try {
      // Extract user ID from JWT token
      const userId = (request as any).user.userId;
      
      // Validate server URL
      if (!this.connectWiseService.validateServerUrl(authRequest.serverUrl)) {
        throw new BadRequestException('Invalid ConnectWise server URL');
      }
      
      // Validate company ID
      if (!authRequest.companyId || authRequest.companyId.trim().length === 0) {
        throw new BadRequestException('Company ID is required');
      }
      
      // Generate state parameter for security
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store state in memory for validation (in production, use Redis or database)
      const oauthStates = (global as any).oauthStates || {};
      oauthStates[state] = {
        userId,
        serverUrl: authRequest.serverUrl,
        companyId: authRequest.companyId,
        timestamp: Date.now(),
      };
      (global as any).oauthStates = oauthStates;
      
      // Build authorization URL
      const authUrl = `${authRequest.serverUrl}/v4_6_release/apis/3.0/system/oauth/authorize?` +
        `client_id=${process.env.CONNECTWISE_CLIENT_ID}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(process.env.CONNECTWISE_REDIRECT_URI)}&` +
        `scope=${encodeURIComponent('ConnectWiseManageCallback ServiceTicket ProjectTask')}&` +
        `state=${state}&` +
        `response_mode=query`;
      
      // Return authorization URL for frontend redirect
      response.json({
        success: true,
        authUrl,
      });
    } catch (error) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message || 'Failed to initiate ConnectWise OAuth flow',
      });
    }
  }

  /**
   * Handle ConnectWise OAuth callback
   */
  @Get('callback')
  async connectWiseCallback(
    @Res() response: Response,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
  ) {
    try {
      // Check for OAuth error
      if (error) {
        return response.redirect(`${process.env.FRONTEND_URL}/integrations?error=${encodeURIComponent(`ConnectWise OAuth error: ${error}`)}`);
      }
      
      // Validate state parameter
      const oauthStates = (global as any).oauthStates || {};
      const storedState = oauthStates[state];
      
      if (!storedState) {
        return response.redirect(`${process.env.FRONTEND_URL}/integrations?error=${encodeURIComponent('Invalid state parameter')}`);
      }
      
      // Clean up the state
      delete oauthStates[state];
      (global as any).oauthStates = oauthStates;
      
      // Exchange code for access token
      const tokenResponse = await this.connectWiseService.exchangeCodeForToken(
        code,
        process.env.CONNECTWISE_CLIENT_ID,
        process.env.CONNECTWISE_CLIENT_SECRET,
        process.env.CONNECTWISE_REDIRECT_URI,
        storedState.serverUrl
      );
      
      // Create or update integration
      const integration = await this.integrationService.createIntegration({
        userId: storedState.userId,
        provider: 'connectwise',
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        config: {
          serverUrl: storedState.serverUrl,
          companyId: storedState.companyId,
        },
      });
      
      // Sync tasks for the new integration
      await this.taskAggregationService.syncTasksForIntegration(integration);
      
      // Redirect to frontend success page
      response.redirect(`${process.env.FRONTEND_URL}/integrations?success=true&provider=connectwise`);
    } catch (error) {
      response.redirect(`${process.env.FRONTEND_URL}/integrations?error=${encodeURIComponent('Failed to complete ConnectWise OAuth flow')}`);
    }
  }

  /**
   * Disconnect ConnectWise integration
   */
  @Get('disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disconnectConnectWise(@Req() request: Request, @Res() response: Response) {
    try {
      // Extract user ID from JWT token
      const userId = (request as any).user.userId;
      
      // Find ConnectWise integration for user
      const integration = await this.integrationService.getIntegrationByUserIdAndProvider(userId, 'connectwise');
      
      if (!integration) {
        return response.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: 'ConnectWise integration not found',
        });
      }
      
      // Delete integration
      await this.integrationService.deleteIntegration(integration.id);
      
      response.json({
        success: true,
        message: 'ConnectWise integration disconnected successfully',
      });
    } catch (error) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to disconnect ConnectWise integration',
      });
    }
  }

  /**
   * Get ConnectWise integration status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getConnectWiseStatus(@Req() request: Request, @Res() response: Response) {
    try {
      // Extract user ID from JWT token
      const userId = (request as any).user.userId;
      
      // Find ConnectWise integration for user
      const integration = await this.integrationService.getIntegrationByUserIdAndProvider(userId, 'connectwise');
      
      if (!integration) {
        return response.json({
          success: true,
          connected: false,
        });
      }
      
      response.json({
        success: true,
        connected: true,
        config: {
          serverUrl: integration.config?.serverUrl,
          companyId: integration.config?.companyId,
        },
        lastSync: integration.lastSyncAt,
      });
    } catch (error) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to get ConnectWise integration status',
      });
    }
  }
}
