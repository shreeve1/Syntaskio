# Data Models
User
Purpose: Represents a registered user of the Syntaskio application.

TypeScript Interface

TypeScript

interface User {
  id: string;
  email: string;
  createdAt: Date;
}
Relationships: A User has many Integrations and many Tasks.

Integration
Purpose: Represents a user's authenticated connection to a source task system (e.g., Microsoft Todo).

TypeScript Interface

TypeScript

interface Integration {
  id: string;
  userId: string;
  source: 'MSTODO' | 'CONNECTWISE' | 'PROCESSPLAN';
  status: 'ACTIVE' | 'ERROR' | 'DISCONNECTED';
  lastSyncedAt: Date;
}
Relationships: Belongs to one User.

Task
Purpose: Represents a single work item aggregated from a source system.

TypeScript Interface

TypeScript

interface Task {
  id: string;
  userId: string;
  integrationId: string;
  sourceId: string;
  title: string;
  status: 'OPEN' | 'COMPLETED';
  isMerged: boolean;
}
Relationships: Belongs to one User and one Integration. May have one Enhancement.

Enhancement
Purpose: Stores the AI-generated content associated with a specific task.

TypeScript Interface

TypeScript

interface Enhancement {
  id: string;
  taskId: string;
  keyInsight: string;
  detailedContent: any; // Or a more specific type for the structured content
  citations: string[];
  createdAt: Date;
}
Relationships: Belongs to one Task.
