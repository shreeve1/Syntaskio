// User-related types
export * from './user';

// Integration-related types
export * from './integration';

// Task-related types
export * from './task';

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
