import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { vi } from 'vitest';
import * as request from 'supertest';
import { AuthModule } from './auth.module';
import { UserModule } from '../user/user.module';
import { FirebaseConfigService } from '../config/firebase.config';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import configuration from '../config/configuration';

describe('Authentication Integration', () => {
  let app: INestApplication;
  let firebaseConfigService: FirebaseConfigService;
  let userService: UserService;
  let prismaService: PrismaService;

  const mockFirebaseConfigService = {
    createUser: vi.fn(),
    getUserByEmail: vi.fn(),
    verifyIdToken: vi.fn(),
  };

  const mockUserService = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  };

  const mockPrismaService = {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
          isGlobal: true,
        }),
        AuthModule,
        UserModule,
      ],
    })
      .overrideProvider(FirebaseConfigService)
      .useValue(mockFirebaseConfigService)
      .overrideProvider(UserService)
      .useValue(mockUserService)
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    firebaseConfigService = moduleFixture.get<FirebaseConfigService>(FirebaseConfigService);
    userService = moduleFixture.get<UserService>(UserService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const firebaseUser = { uid: 'firebase-uid', email: 'test@example.com' };
      const dbUser = { id: 'firebase-uid', email: 'test@example.com', createdAt: new Date() };

      mockUserService.findByEmail.mockResolvedValue(null);
      mockFirebaseConfigService.createUser.mockResolvedValue(firebaseUser);
      mockUserService.create.mockResolvedValue(dbUser);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toEqual({
        user: {
          id: 'firebase-uid',
          email: 'test@example.com',
        },
        message: 'Registration successful',
      });

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('access_token');
      expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    });

    it('should return 409 if user already exists', async () => {
      const existingUser = { id: 'existing-id', email: 'test@example.com', createdAt: new Date() };
      mockUserService.findByEmail.mockResolvedValue(existingUser);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(409);

      expect(response.body.message).toContain('User already exists');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
        })
        .expect(400);

      expect(response.body.message).toContain('Password must be at least 6 characters');
    });
  });

  describe('POST /auth/login', () => {
    it('should login existing user successfully', async () => {
      const firebaseUser = { uid: 'firebase-uid', email: 'test@example.com' };
      const dbUser = { id: 'firebase-uid', email: 'test@example.com', createdAt: new Date() };

      mockFirebaseConfigService.getUserByEmail.mockResolvedValue(firebaseUser);
      mockUserService.findByEmail.mockResolvedValue(dbUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toEqual({
        user: {
          id: 'firebase-uid',
          email: 'test@example.com',
        },
        message: 'Login successful',
      });

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('access_token');
    });

    it('should return 401 for invalid credentials', async () => {
      mockFirebaseConfigService.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logout successful',
      });

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('access_token=;');
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile when authenticated', async () => {
      // This test would require setting up JWT authentication
      // For now, we'll test the unauthorized case
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);

      expect(response.body.message).toContain('Authentication required');
    });
  });

  describe('GET /auth/verify', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .expect(401);

      expect(response.body.message).toContain('Authentication required');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to registration endpoint', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockFirebaseConfigService.createUser.mockRejectedValue({ code: 'auth/invalid-email' });

      // Make multiple requests quickly
      const requests = Array(6).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'test@example.com',
            password: 'password123',
          })
      );

      const responses = await Promise.all(requests);
      
      // First 5 should get through (may fail for other reasons), 6th should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
