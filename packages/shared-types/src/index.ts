// User-related types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Integration-related types
export interface Integration {
  id: string;
  name: string;
  type: string;
  userId: string;
  config: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Task-related types
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  userId: string;
  assignedTo?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Enhancement-related types
export interface Enhancement {
  id: string;
  title: string;
  description: string;
  type: EnhancementType;
  status: EnhancementStatus;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum EnhancementType {
  FEATURE = 'feature',
  BUG_FIX = 'bug_fix',
  IMPROVEMENT = 'improvement',
}

export enum EnhancementStatus {
  REQUESTED = 'requested',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  IN_DEVELOPMENT = 'in_development',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
