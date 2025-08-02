import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, CreateUserData, UpdateUserData } from '@syntaskio/shared-types';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {}

  async create(createUserData: CreateUserData): Promise<User> {
    try {
      const user = await this.prisma.user.create({
        data: {
          id: createUserData.id,
          email: createUserData.email,
        },
      });

      this.logger.log(`User created: ${user.email}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to create user: ${createUserData.email}`, error);
      
      if (error.code === 'P2002') {
        throw new ConflictException('User already exists');
      }
      
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      return user;
    } catch (error) {
      this.logger.error(`Failed to find user by ID: ${id}`, error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      return user;
    } catch (error) {
      this.logger.error(`Failed to find user by email: ${email}`, error);
      throw error;
    }
  }

  async update(id: string, updateUserData: UpdateUserData): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: updateUserData,
      });

      this.logger.log(`User updated: ${user.email}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to update user: ${id}`, error);
      
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });

      this.logger.log(`User deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete user: ${id}`, error);
      
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    try {
      const users = await this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return users;
    } catch (error) {
      this.logger.error('Failed to find all users', error);
      throw error;
    }
  }
}
