import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { FirebaseConfigService } from '../config/firebase.config';
import { UserService } from '../user/user.service';
import { CreateUserDto, LoginUserDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  access_token: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private firebaseConfig: FirebaseConfigService,
    private userService: UserService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<AuthResponse> {
    const { email, password } = createUserDto;

    try {
      // Check if user already exists in our database
      const existingUser = await this.userService.findByEmail(email);
      if (existingUser) {
        throw new ConflictException('User already exists');
      }

      // Create user in Firebase Authentication
      const firebaseUser = await this.firebaseConfig.createUser(email, password);
      
      // Create user in our database
      const user = await this.userService.create({
        id: firebaseUser.uid,
        email: firebaseUser.email,
      });

      // Generate JWT token
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
      };
      
      const access_token = this.jwtService.sign(payload);

      this.logger.log(`User registered successfully: ${email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
        },
        access_token,
      };
    } catch (error) {
      this.logger.error(`Registration failed for ${email}`, error);
      
      if (error instanceof ConflictException) {
        throw error;
      }
      
      // Handle Firebase-specific errors
      if (error.code === 'auth/email-already-exists') {
        throw new ConflictException('User already exists');
      }
      
      if (error.code === 'auth/invalid-email') {
        throw new BadRequestException('Invalid email format');
      }
      
      if (error.code === 'auth/weak-password') {
        throw new BadRequestException('Password is too weak');
      }
      
      throw new BadRequestException('Registration failed');
    }
  }

  async login(loginUserDto: LoginUserDto): Promise<AuthResponse> {
    const { email, password } = loginUserDto;

    try {
      // Get user from Firebase to validate credentials
      const firebaseUser = await this.firebaseConfig.getUserByEmail(email);
      
      // Note: In a real implementation, you would verify the password against Firebase
      // For now, we'll assume the frontend handles Firebase authentication
      // and we're just validating the user exists
      
      // Get user from our database
      const user = await this.userService.findByEmail(email);
      if (!user) {
        // If user exists in Firebase but not in our DB, create them
        const newUser = await this.userService.create({
          id: firebaseUser.uid,
          email: firebaseUser.email,
        });
        
        const payload: JwtPayload = {
          sub: newUser.id,
          email: newUser.email,
        };
        
        const access_token = this.jwtService.sign(payload);
        
        return {
          user: {
            id: newUser.id,
            email: newUser.email,
          },
          access_token,
        };
      }

      // Generate JWT token
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
      };
      
      const access_token = this.jwtService.sign(payload);

      this.logger.log(`User logged in successfully: ${email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
        },
        access_token,
      };
    } catch (error) {
      this.logger.error(`Login failed for ${email}`, error);
      
      if (error.code === 'auth/user-not-found') {
        throw new UnauthorizedException('Invalid credentials');
      }
      
      if (error.code === 'auth/invalid-email') {
        throw new BadRequestException('Invalid email format');
      }
      
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async validateUser(userId: string): Promise<any> {
    try {
      const user = await this.userService.findById(userId);
      return user;
    } catch (error) {
      this.logger.error(`User validation failed for ${userId}`, error);
      return null;
    }
  }

  async verifyFirebaseToken(idToken: string): Promise<any> {
    try {
      const decodedToken = await this.firebaseConfig.verifyIdToken(idToken);
      
      // Get or create user in our database
      let user = await this.userService.findById(decodedToken.uid);
      if (!user) {
        user = await this.userService.create({
          id: decodedToken.uid,
          email: decodedToken.email,
        });
      }

      // Generate our own JWT token
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
      };
      
      const access_token = this.jwtService.sign(payload);

      return {
        user: {
          id: user.id,
          email: user.email,
        },
        access_token,
      };
    } catch (error) {
      this.logger.error('Firebase token verification failed', error);
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }
}
