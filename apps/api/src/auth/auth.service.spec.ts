import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { FirebaseConfigService } from '../config/firebase.config';
import { UserService } from '../user/user.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let firebaseConfig: FirebaseConfigService;
  let userService: UserService;

  const mockJwtService = {
    sign: vi.fn(),
  };

  const mockFirebaseConfig = {
    createUser: vi.fn(),
    getUserByEmail: vi.fn(),
    verifyIdToken: vi.fn(),
  };

  const mockUserService = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: FirebaseConfigService,
          useValue: mockFirebaseConfig,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    firebaseConfig = module.get<FirebaseConfigService>(FirebaseConfigService);
    userService = module.get<UserService>(UserService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const createUserDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      const firebaseUser = { uid: 'firebase-uid', email: 'test@example.com' };
      const dbUser = { id: 'firebase-uid', email: 'test@example.com', createdAt: new Date() };
      const token = 'jwt-token';

      mockUserService.findByEmail.mockResolvedValue(null);
      mockFirebaseConfig.createUser.mockResolvedValue(firebaseUser);
      mockUserService.create.mockResolvedValue(dbUser);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.register(createUserDto);

      expect(mockUserService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockFirebaseConfig.createUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockUserService.create).toHaveBeenCalledWith({
        id: 'firebase-uid',
        email: 'test@example.com',
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'firebase-uid',
        email: 'test@example.com',
      });
      expect(result).toEqual({
        user: {
          id: 'firebase-uid',
          email: 'test@example.com',
        },
        access_token: token,
      });
    });

    it('should throw ConflictException if user already exists in database', async () => {
      const existingUser = { id: 'existing-id', email: 'test@example.com', createdAt: new Date() };
      mockUserService.findByEmail.mockResolvedValue(existingUser);

      await expect(service.register(createUserDto)).rejects.toThrow(ConflictException);
      expect(mockFirebaseConfig.createUser).not.toHaveBeenCalled();
    });

    it('should handle Firebase email-already-exists error', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockFirebaseConfig.createUser.mockRejectedValue({ code: 'auth/email-already-exists' });

      await expect(service.register(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('should handle Firebase invalid-email error', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockFirebaseConfig.createUser.mockRejectedValue({ code: 'auth/invalid-email' });

      await expect(service.register(createUserDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle Firebase weak-password error', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockFirebaseConfig.createUser.mockRejectedValue({ code: 'auth/weak-password' });

      await expect(service.register(createUserDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const loginUserDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login existing user successfully', async () => {
      const firebaseUser = { uid: 'firebase-uid', email: 'test@example.com' };
      const dbUser = { id: 'firebase-uid', email: 'test@example.com', createdAt: new Date() };
      const token = 'jwt-token';

      mockFirebaseConfig.getUserByEmail.mockResolvedValue(firebaseUser);
      mockUserService.findByEmail.mockResolvedValue(dbUser);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.login(loginUserDto);

      expect(mockFirebaseConfig.getUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({
        user: {
          id: 'firebase-uid',
          email: 'test@example.com',
        },
        access_token: token,
      });
    });

    it('should create user if exists in Firebase but not in database', async () => {
      const firebaseUser = { uid: 'firebase-uid', email: 'test@example.com' };
      const newDbUser = { id: 'firebase-uid', email: 'test@example.com', createdAt: new Date() };
      const token = 'jwt-token';

      mockFirebaseConfig.getUserByEmail.mockResolvedValue(firebaseUser);
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(newDbUser);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.login(loginUserDto);

      expect(mockUserService.create).toHaveBeenCalledWith({
        id: 'firebase-uid',
        email: 'test@example.com',
      });
      expect(result).toEqual({
        user: {
          id: 'firebase-uid',
          email: 'test@example.com',
        },
        access_token: token,
      });
    });

    it('should handle user-not-found error', async () => {
      mockFirebaseConfig.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });

      await expect(service.login(loginUserDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle invalid-email error', async () => {
      mockFirebaseConfig.getUserByEmail.mockRejectedValue({ code: 'auth/invalid-email' });

      await expect(service.login(loginUserDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateUser', () => {
    it('should return user if found', async () => {
      const user = { id: 'user-id', email: 'test@example.com', createdAt: new Date() };
      mockUserService.findById.mockResolvedValue(user);

      const result = await service.validateUser('user-id');

      expect(mockUserService.findById).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(user);
    });

    it('should return null if user not found', async () => {
      mockUserService.findById.mockResolvedValue(null);

      const result = await service.validateUser('user-id');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockUserService.findById.mockRejectedValue(new Error('Database error'));

      const result = await service.validateUser('user-id');

      expect(result).toBeNull();
    });
  });

  describe('verifyFirebaseToken', () => {
    it('should verify token and return user for existing user', async () => {
      const decodedToken = { uid: 'firebase-uid', email: 'test@example.com' };
      const user = { id: 'firebase-uid', email: 'test@example.com', createdAt: new Date() };
      const token = 'jwt-token';

      mockFirebaseConfig.verifyIdToken.mockResolvedValue(decodedToken);
      mockUserService.findById.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.verifyFirebaseToken('firebase-id-token');

      expect(mockFirebaseConfig.verifyIdToken).toHaveBeenCalledWith('firebase-id-token');
      expect(mockUserService.findById).toHaveBeenCalledWith('firebase-uid');
      expect(result).toEqual({
        user: {
          id: 'firebase-uid',
          email: 'test@example.com',
        },
        access_token: token,
      });
    });

    it('should create user if not exists in database', async () => {
      const decodedToken = { uid: 'firebase-uid', email: 'test@example.com' };
      const newUser = { id: 'firebase-uid', email: 'test@example.com', createdAt: new Date() };
      const token = 'jwt-token';

      mockFirebaseConfig.verifyIdToken.mockResolvedValue(decodedToken);
      mockUserService.findById.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(newUser);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.verifyFirebaseToken('firebase-id-token');

      expect(mockUserService.create).toHaveBeenCalledWith({
        id: 'firebase-uid',
        email: 'test@example.com',
      });
      expect(result).toEqual({
        user: {
          id: 'firebase-uid',
          email: 'test@example.com',
        },
        access_token: token,
      });
    });

    it('should throw UnauthorizedException on invalid token', async () => {
      mockFirebaseConfig.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.verifyFirebaseToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
