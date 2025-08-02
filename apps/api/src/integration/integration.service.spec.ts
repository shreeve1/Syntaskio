import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { CreateIntegrationData, UpdateIntegrationData } from '@syntaskio/shared-types';

describe('IntegrationService', () => {
  let service: IntegrationService;
  let prismaService: jest.Mocked<PrismaService>;
  let encryptionService: jest.Mocked<EncryptionService>;

  const mockIntegration = {
    id: 'integration-id',
    userId: 'user-id',
    provider: 'microsoft',
    accessToken: 'encrypted-access-token',
    refreshToken: 'encrypted-refresh-token',
    expiresAt: new Date('2024-12-31T23:59:59Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      integration: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockEncryptionService = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<IntegrationService>(IntegrationService);
    prismaService = module.get(PrismaService);
    encryptionService = module.get(EncryptionService);
  });

  describe('createIntegration', () => {
    const createIntegrationData: CreateIntegrationData = {
      userId: 'user-id',
      provider: 'microsoft',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: new Date('2024-12-31T23:59:59Z'),
    };

    it('should create a new integration successfully', async () => {
      prismaService.integration.findUnique.mockResolvedValue(null);
      prismaService.integration.create.mockResolvedValue(mockIntegration);
      encryptionService.encrypt.mockReturnValue('encrypted-token');

      const result = await service.createIntegration(createIntegrationData);

      expect(prismaService.integration.findUnique).toHaveBeenCalledWith({
        where: {
          userId_provider: {
            userId: 'user-id',
            provider: 'microsoft',
          },
        },
      });
      expect(encryptionService.encrypt).toHaveBeenCalledWith('access-token');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('refresh-token');
      expect(prismaService.integration.create).toHaveBeenCalled();
      expect(result.id).toBe('integration-id');
    });

    it('should throw BadRequestException if integration already exists', async () => {
      prismaService.integration.findUnique.mockResolvedValue(mockIntegration);

      await expect(service.createIntegration(createIntegrationData))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getIntegrationById', () => {
    it('should return integration when found', async () => {
      prismaService.integration.findUnique.mockResolvedValue(mockIntegration);
      encryptionService.decrypt.mockReturnValue('decrypted-token');

      const result = await service.getIntegrationById('integration-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('integration-id');
      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted-access-token');
    });

    it('should return null when integration not found', async () => {
      prismaService.integration.findUnique.mockResolvedValue(null);

      const result = await service.getIntegrationById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateIntegration', () => {
    const updateData: UpdateIntegrationData = {
      accessToken: 'new-access-token',
    };

    it('should update integration successfully', async () => {
      prismaService.integration.update.mockResolvedValue(mockIntegration);
      encryptionService.encrypt.mockReturnValue('encrypted-new-token');
      encryptionService.decrypt.mockReturnValue('decrypted-token');

      const result = await service.updateIntegration('integration-id', updateData);

      expect(encryptionService.encrypt).toHaveBeenCalledWith('new-access-token');
      expect(prismaService.integration.update).toHaveBeenCalledWith({
        where: { id: 'integration-id' },
        data: { accessToken: 'encrypted-new-token' },
      });
      expect(result.id).toBe('integration-id');
    });

    it('should throw NotFoundException when integration not found', async () => {
      prismaService.integration.update.mockRejectedValue({ code: 'P2025' });

      await expect(service.updateIntegration('non-existent-id', updateData))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteIntegration', () => {
    it('should delete integration successfully', async () => {
      prismaService.integration.delete.mockResolvedValue(mockIntegration);

      await service.deleteIntegration('integration-id');

      expect(prismaService.integration.delete).toHaveBeenCalledWith({
        where: { id: 'integration-id' },
      });
    });

    it('should throw NotFoundException when integration not found', async () => {
      prismaService.integration.delete.mockRejectedValue({ code: 'P2025' });

      await expect(service.deleteIntegration('non-existent-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getIntegrationsByUserId', () => {
    it('should return user integrations', async () => {
      prismaService.integration.findMany.mockResolvedValue([mockIntegration]);
      encryptionService.decrypt.mockReturnValue('decrypted-token');

      const result = await service.getIntegrationsByUserId('user-id');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('integration-id');
      expect(prismaService.integration.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
