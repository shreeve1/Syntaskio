import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseConfigService {
  private readonly logger = new Logger(FirebaseConfigService.name);
  private app: admin.app.App;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      const projectId = this.configService.get<string>('firebase.projectId');
      const clientEmail = this.configService.get<string>('firebase.clientEmail');
      const privateKey = this.configService.get<string>('firebase.privateKey');
      const nodeEnv = this.configService.get<string>('NODE_ENV');

      // Skip Firebase initialization in development if credentials are placeholders
      if (nodeEnv === 'development' &&
          (!projectId || !clientEmail || !privateKey ||
           privateKey.includes('PLACEHOLDER') ||
           clientEmail.includes('placeholder'))) {
        this.logger.warn('Firebase Admin SDK skipped in development due to placeholder credentials');
        return;
      }

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing required Firebase configuration');
      }

      // Initialize Firebase Admin SDK
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });

      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);

      // In development, don't throw the error to allow the app to start
      if (this.configService.get<string>('NODE_ENV') === 'development') {
        this.logger.warn('Firebase initialization failed in development - continuing without Firebase');
        return;
      }

      throw error;
    }
  }

  getApp(): admin.app.App {
    if (!this.app) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    return this.app;
  }

  getAuth(): admin.auth.Auth {
    if (!this.app) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    return this.app.auth();
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await this.getAuth().verifyIdToken(idToken);
    } catch (error) {
      this.logger.error('Failed to verify ID token', error);
      throw error;
    }
  }

  async createUser(email: string, password: string): Promise<admin.auth.UserRecord> {
    try {
      return await this.getAuth().createUser({
        email,
        password,
        emailVerified: false,
      });
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<admin.auth.UserRecord> {
    try {
      return await this.getAuth().getUserByEmail(email);
    } catch (error) {
      this.logger.error('Failed to get user by email', error);
      throw error;
    }
  }

  async deleteUser(uid: string): Promise<void> {
    try {
      await this.getAuth().deleteUser(uid);
    } catch (error) {
      this.logger.error('Failed to delete user', error);
      throw error;
    }
  }
}
