export interface DuplicateScore {
  titleSimilarity: number; // 0-1, weight: 40%
  descriptionSimilarity: number; // 0-1, weight: 25%
  temporalProximity: number; // 0-1, weight: 15%
  assigneeMatch: number; // 0-1, weight: 10%
  priorityMatch: number; // 0-1, weight: 10%
  overallScore: number; // Weighted average
  confidence: 'high' | 'medium' | 'low';
}

export interface MergedTask {
  id: string;
  userId: string;
  title: string; // Primary title (usually from first source)
  description?: string; // Merged/primary description
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date; // Earliest due date from sources
  
  // Merged task specific fields
  sourceIds: string[]; // Array of original task IDs
  sources: TaskSource[];
  mergedAt: Date;
  mergedBy: 'auto' | 'manual';
  confidence?: number;
  
  // Aggregated metadata
  allSources: ('microsoft' | 'connectwise' | 'processplan')[];
  sourceData: {
    [sourceType: string]: object; // Combined source-specific data
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskSource {
  taskId: string;
  source: 'microsoft' | 'connectwise' | 'processplan';
  originalTitle: string;
  originalDescription?: string;
  originalStatus: string;
  integrationId: string;
  lastSyncAt?: Date;
}

export interface DuplicateCandidate {
  id: string;
  task1Id: string;
  task2Id: string;
  score: DuplicateScore;
  status: 'pending' | 'approved' | 'rejected' | 'auto_merged';
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

export interface DuplicateDetectionConfig {
  autoMergeThreshold: number; // Default: 0.75
  suggestionThreshold: number; // Default: 0.60
  titleWeight: number; // Default: 0.40
  descriptionWeight: number; // Default: 0.25
  temporalWeight: number; // Default: 0.15
  assigneeWeight: number; // Default: 0.10
  priorityWeight: number; // Default: 0.10
  maxDaysForTemporalProximity: number; // Default: 7
}

export interface DuplicateDetectionResult {
  duplicates: DuplicateCandidate[];
  autoMerged: string[]; // Array of merged task IDs
  suggestions: DuplicateCandidate[];
}

export interface MergeTaskRequest {
  taskIds: string[];
  userId: string;
  mergedBy: 'auto' | 'manual';
  primaryTaskId?: string; // Which task to use as primary source for title/description
}

export interface MergeTaskResponse {
  mergedTask: MergedTask;
  originalTasks: string[]; // IDs of tasks that were merged
}

export interface UnmergeTaskRequest {
  mergedTaskId: string;
  userId: string;
}

export interface UnmergeTaskResponse {
  restoredTasks: string[]; // IDs of tasks that were restored
}

export interface DuplicateReviewRequest {
  candidateId: string;
  userId: string;
  action: 'approve' | 'reject';
}

export interface DuplicateReviewResponse {
  candidate: DuplicateCandidate;
  mergedTask?: MergedTask; // Present if action was 'approve'
}

// Fuzzy matching algorithm types
export interface FuzzyMatchOptions {
  algorithm: 'levenshtein' | 'jaro_winkler' | 'cosine';
  threshold: number;
  caseSensitive: boolean;
}

export interface TextSimilarityResult {
  similarity: number;
  algorithm: string;
  normalized: boolean;
}

// TF-IDF vector similarity types
export interface TfIdfOptions {
  minWordLength: number;
  stopWords: string[];
  stemming: boolean;
}

export interface VectorSimilarityResult {
  similarity: number;
  vectorLength1: number;
  vectorLength2: number;
  commonTerms: number;
}
