import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Integration, CreateIntegrationData, UpdateIntegrationData } from '@syntaskio/shared-types';
import { EncryptionService } from './encryption.service';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async createIntegration(createIntegrationData: CreateIntegrationData): Promise<Integration> {
    try {
      // Check if integration already exists for this user and provider
      const existingIntegration = await this.prisma.integration.findUnique({
        where: {
          userId_provider: {
            userId: createIntegrationData.userId,
            provider: createIntegrationData.provider,
          },
        },
      });

      if (existingIntegration) {
        throw new BadRequestException('Integration already exists for this provider');
      }

      const integration = await this.prisma.integration.create({
        data: {
          userId: createIntegrationData.userId,
          provider: createIntegrationData.provider,
          accessToken: this.encryptionService.encrypt(createIntegrationData.accessToken),
          refreshToken: createIntegrationData.refreshToken 
            ? this.encryptionService.encrypt(createIntegrationData.refreshToken) 
            : null,
          expiresAt: createIntegrationData.expiresAt,
        },
      });

      // Map Prisma model to shared-types interface
      const mappedIntegration: Integration = {
        id: integration.id,
        userId: integration.userId,
        provider: integration.provider as 'microsoft' | 'connectwise' | 'processplan',
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        expiresAt: integration.expiresAt,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      };

      this.logger.log(`Integration created for user ${createIntegrationData.userId} with provider ${createIntegrationData.provider}`);
      return mappedIntegration;
    } catch (error) {
      this.logger.error(`Failed to create integration for user ${createIntegrationData.userId}`, error);
      throw error;
    }
  }

  async getIntegrationById(id: string): Promise<Integration | null> {
    try {
      const integration = await this.prisma.integration.findUnique({
        where: { id },
      });

      if (!integration) {
        return null;
      }

      // Map Prisma model to shared-types interface
      const mappedIntegration: Integration = {
        id: integration.id,
        userId: integration.userId,
        provider: integration.provider as 'microsoft' | 'connectwise' | 'processplan',
        accessToken: this.encryptionService.decrypt(integration.accessToken),
        refreshToken: integration.refreshToken ? this.encryptionService.decrypt(integration.refreshToken) : undefined,
        expiresAt: integration.expiresAt,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      };

      return mappedIntegration;
    } catch (error) {
      this.logger.error(`Failed to find integration by ID: ${id}`, error);
      throw error;
    }
  }

  async getIntegrationByUserIdAndProvider(userId: string, provider: string): Promise<Integration | null> {
    try {
      const integration = await this.prisma.integration.findUnique({
        where: {
          userId_provider: {
            userId,
            provider,
          },
        },
      });

      if (!integration) {
        return null;
      }

      // Map Prisma model to shared-types interface
      const mappedIntegration: Integration = {
        id: integration.id,
        userId: integration.userId,
        provider: integration.provider as 'microsoft' | 'connectwise' | 'processplan',
        accessToken: this.encryptionService.decrypt(integration.accessToken),
        refreshToken: integration.refreshToken ? this.encryptionService.decrypt(integration.refreshToken) : undefined,
        expiresAt: integration.expiresAt,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      };

      return mappedIntegration;
    } catch (error) {
      this.logger.error(`Failed to find integration for user ${userId} and provider ${provider}`, error);
      throw error;
    }
  }

  async getIntegrationsByUserId(userId: string): Promise<Integration[]> {
    try {
      const integrations = await this.prisma.integration.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      // Map Prisma models to shared-types interfaces
      const mappedIntegrations: Integration[] = integrations.map(integration => ({
        id: integration.id,
        userId: integration.userId,
        provider: integration.provider as 'microsoft' | 'connectwise' | 'processplan',
        accessToken: this.encryptionService.decrypt(integration.accessToken),
        refreshToken: integration.refreshToken ? this.encryptionService.decrypt(integration.refreshToken) : undefined,
        expiresAt: integration.expiresAt,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      }));

      return mappedIntegrations;
    } catch (error) {
      this.logger.error(`Failed to find integrations for user ${userId}`, error);
      throw error;
    }
  }

  async updateIntegration(id: string, updateIntegrationData: UpdateIntegrationData): Promise<Integration> {
    try {
      // Encrypt tokens if provided
      const encryptedData = { ...updateIntegrationData };
      
      if (updateIntegrationData.accessToken) {
        encryptedData.accessToken = this.encryptionService.encrypt(updateIntegrationData.accessToken);
      }
      
      if (updateIntegrationData.refreshToken) {
        encryptedData.refreshToken = this.encryptionService.encrypt(updateIntegrationData.refreshToken);
      }

      const integration = await this.prisma.integration.update({
        where: { id },
        data: encryptedData,
      });

      // Map Prisma model to shared-types interface
      const mappedIntegration: Integration = {
        id: integration.id,
        userId: integration.userId,
        provider: integration.provider as 'microsoft' | 'connectwise' | 'processplan',
        accessToken: this.encryptionService.decrypt(integration.accessToken),
        refreshToken: integration.refreshToken ? this.encryptionService.decrypt(integration.refreshToken) : undefined,
        expiresAt: integration.expiresAt,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      };

      this.logger.log(`Integration updated: ${id}`);
      return mappedIntegration;
    } catch (error) {
      this.logger.error(`Failed to update integration: ${id}`, error);
      
      if (error.code === 'P2025') {
        throw new NotFoundException('Integration not found');
      }
      
      throw error;
    }
  }

  async deleteIntegration(id: string): Promise<void> {
    try {
      await this.prisma.integration.delete({
        where: { id },
      });

      this.logger.log(`Integration deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete integration: ${id}`, error);
      
      if (error.code === 'P2025') {
        throw new NotFoundException('Integration not found');
      }
      
      throw error;
    }
  }

  async getAllIntegrations(): Promise<Integration[]> {
    try {
      const integrations = await this.prisma.integration.findMany({
        orderBy: { createdAt: 'desc' },
      });

      // Map Prisma models to shared-types interfaces
      const mappedIntegrations: Integration[] = integrations.map(integration => ({
        id: integration.id,
        userId: integration.userId,
        provider: integration.provider as 'microsoft' | 'connectwise' | 'processplan',
        accessToken: this.encryptionService.decrypt(integration.accessToken),
        refreshToken: integration.refreshToken ? this.encryptionService.decrypt(integration.refreshToken) : undefined,
        expiresAt: integration.expiresAt,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      }));

      return mappedIntegrations;
    } catch (error) {
      this.logger.error('Failed to find all integrations', error);
      throw error;
    }
  }
}
