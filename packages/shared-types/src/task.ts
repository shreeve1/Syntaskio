export interface Task {
  id: string;
  userId: string;
  integrationId: string;
  externalId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  source: 'microsoft' | 'connectwise' | 'processplan';
  sourceData: object; // JSON field for source-specific data
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskData {
  userId: string;
  integrationId: string;
  externalId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  source: 'microsoft' | 'connectwise' | 'processplan';
  sourceData: object;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  sourceData?: object;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
