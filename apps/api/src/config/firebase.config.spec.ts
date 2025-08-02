import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FirebaseConfigService } from './firebase.config';
import { vi } from 'vitest';

// Mock firebase-admin
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn().mockReturnValue({
    auth: vi.fn().mockReturnValue({
      verifyIdToken: vi.fn(),
      createUser: vi.fn(),
      getUserByEmail: vi.fn(),
      deleteUser: vi.fn(),
    }),
  }),
  credential: {
    cert: vi.fn(),
  },
}));

describe('FirebaseConfigService', () => {
  let service: FirebaseConfigService;
  let configService: ConfigService;

  const mockConfigService = {
    get: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FirebaseConfigService>(FirebaseConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        'firebase.projectId': 'test-project',
        'firebase.clientEmail': 'test@test-project.iam.gserviceaccount.com',
        'firebase.privateKey': '-----BEGIN PRIVATE KEY-----\nTEST_KEY\n-----END PRIVATE KEY-----\n',
      };
      return config[key];
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize Firebase with correct configuration', () => {
    expect(mockConfigService.get).toHaveBeenCalledWith('firebase.projectId');
    expect(mockConfigService.get).toHaveBeenCalledWith('firebase.clientEmail');
    expect(mockConfigService.get).toHaveBeenCalledWith('firebase.privateKey');
  });

  it('should throw error when required configuration is missing', async () => {
    // Mock missing configuration
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'firebase.projectId') return null;
      return 'test-value';
    });

    expect(() => {
      new FirebaseConfigService(configService);
    }).toThrow('Missing required Firebase configuration');
  });

  it('should return Firebase app instance', () => {
    const app = service.getApp();
    expect(app).toBeDefined();
  });

  it('should return Firebase auth instance', () => {
    const auth = service.getAuth();
    expect(auth).toBeDefined();
  });

  describe('verifyIdToken', () => {
    it('should verify ID token successfully', async () => {
      const mockDecodedToken = { uid: 'test-uid', email: 'test@example.com' };
      const mockAuth = service.getAuth();
      (mockAuth.verifyIdToken as any).mockResolvedValue(mockDecodedToken);

      const result = await service.verifyIdToken('test-token');

      expect(result).toEqual(mockDecodedToken);
      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('test-token');
    });

    it('should handle verification errors', async () => {
      const mockAuth = service.getAuth();
      (mockAuth.verifyIdToken as any).mockRejectedValue(new Error('Invalid token'));

      await expect(service.verifyIdToken('invalid-token')).rejects.toThrow('Invalid token');
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const mockUserRecord = { uid: 'test-uid', email: 'test@example.com' };
      const mockAuth = service.getAuth();
      (mockAuth.createUser as any).mockResolvedValue(mockUserRecord);

      const result = await service.createUser('test@example.com', 'password123');

      expect(result).toEqual(mockUserRecord);
      expect(mockAuth.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        emailVerified: false,
      });
    });

    it('should handle user creation errors', async () => {
      const mockAuth = service.getAuth();
      (mockAuth.createUser as any).mockRejectedValue(new Error('User already exists'));

      await expect(service.createUser('test@example.com', 'password123')).rejects.toThrow('User already exists');
    });
  });

  describe('getUserByEmail', () => {
    it('should get user by email successfully', async () => {
      const mockUserRecord = { uid: 'test-uid', email: 'test@example.com' };
      const mockAuth = service.getAuth();
      (mockAuth.getUserByEmail as any).mockResolvedValue(mockUserRecord);

      const result = await service.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUserRecord);
      expect(mockAuth.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle user not found errors', async () => {
      const mockAuth = service.getAuth();
      (mockAuth.getUserByEmail as any).mockRejectedValue(new Error('User not found'));

      await expect(service.getUserByEmail('nonexistent@example.com')).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const mockAuth = service.getAuth();
      (mockAuth.deleteUser as any).mockResolvedValue(undefined);

      await service.deleteUser('test-uid');

      expect(mockAuth.deleteUser).toHaveBeenCalledWith('test-uid');
    });

    it('should handle user deletion errors', async () => {
      const mockAuth = service.getAuth();
      (mockAuth.deleteUser as any).mockRejectedValue(new Error('User not found'));

      await expect(service.deleteUser('nonexistent-uid')).rejects.toThrow('User not found');
    });
  });
});
