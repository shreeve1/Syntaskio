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
  // ConnectWise-specific fields
  connectWiseTicketId?: number;
  connectWiseTicketType?: 'service' | 'project';
  connectWiseBoardName?: string;
  connectWiseCompanyName?: string;
  connectWiseProjectName?: string;
  connectWiseOwner?: string;
  connectWiseAssignedTo?: string;
  // Process Plan-specific fields
  processPlanProcessId?: string;
  processPlanStepId?: string;
  processPlanType?: 'process' | 'step';
  processPlanStatus?: 'active' | 'pending' | 'in_progress' | 'completed' | 'paused' | 'skipped';
  processPlanProgress?: number;
  processPlanOrder?: number;
  processPlanEstimatedDuration?: number;
  processPlanDependencies?: string[];
  processPlanTags?: string[];
  processPlanAssignedTo?: string;
  processPlanProcessName?: string;
  processPlanTotalSteps?: number;
  processPlanCompletedSteps?: number;
  // Merged task fields
  mergedTaskId?: string;
  isMerged?: boolean;
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
  // ConnectWise-specific fields
  connectWiseTicketId?: number;
  connectWiseTicketType?: 'service' | 'project';
  connectWiseBoardName?: string;
  connectWiseCompanyName?: string;
  connectWiseProjectName?: string;
  connectWiseOwner?: string;
  connectWiseAssignedTo?: string;
  // Process Plan-specific fields
  processPlanProcessId?: string;
  processPlanStepId?: string;
  processPlanType?: 'process' | 'step';
  processPlanStatus?: 'active' | 'pending' | 'in_progress' | 'completed' | 'paused' | 'skipped';
  processPlanProgress?: number;
  processPlanOrder?: number;
  processPlanEstimatedDuration?: number;
  processPlanDependencies?: string[];
  processPlanTags?: string[];
  processPlanAssignedTo?: string;
  processPlanProcessName?: string;
  processPlanTotalSteps?: number;
  processPlanCompletedSteps?: number;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  sourceData?: object;
  // ConnectWise-specific fields
  connectWiseTicketId?: number;
  connectWiseTicketType?: 'service' | 'project';
  connectWiseBoardName?: string;
  connectWiseCompanyName?: string;
  connectWiseProjectName?: string;
  connectWiseOwner?: string;
  connectWiseAssignedTo?: string;
  // Process Plan-specific fields
  processPlanProcessId?: string;
  processPlanStepId?: string;
  processPlanType?: 'process' | 'step';
  processPlanStatus?: 'active' | 'pending' | 'in_progress' | 'completed' | 'paused' | 'skipped';
  processPlanProgress?: number;
  processPlanOrder?: number;
  processPlanEstimatedDuration?: number;
  processPlanDependencies?: string[];
  processPlanTags?: string[];
  processPlanAssignedTo?: string;
  processPlanProcessName?: string;
  processPlanTotalSteps?: number;
  processPlanCompletedSteps?: number;
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
