import { Injectable, Logger } from '@nestjs/common';
import { Task, DuplicateScore, DuplicateDetectionConfig, FuzzyMatchOptions, TextSimilarityResult, TfIdfOptions, VectorSimilarityResult } from '@syntaskio/shared-types';

@Injectable()
export class DuplicateDetectorService {
  private readonly logger = new Logger(DuplicateDetectorService.name);

  private readonly defaultConfig: DuplicateDetectionConfig = {
    autoMergeThreshold: 0.75,
    suggestionThreshold: 0.60,
    titleWeight: 0.40,
    descriptionWeight: 0.25,
    temporalWeight: 0.15,
    assigneeWeight: 0.10,
    priorityWeight: 0.10,
    maxDaysForTemporalProximity: 7,
  };

  /**
   * Calculate duplicate score between two tasks
   */
  async calculateDuplicateScore(
    task1: Task,
    task2: Task,
    config: DuplicateDetectionConfig = this.defaultConfig
  ): Promise<DuplicateScore> {
    // Don't compare tasks from the same source with same external ID
    if (task1.source === task2.source && task1.externalId === task2.externalId) {
      return this.createZeroScore();
    }

    // Calculate individual similarity scores
    const titleSimilarity = await this.calculateTitleSimilarity(task1.title, task2.title);
    const descriptionSimilarity = await this.calculateDescriptionSimilarity(
      task1.description || '',
      task2.description || ''
    );
    const temporalProximity = this.calculateTemporalProximity(
      task1.createdAt,
      task2.createdAt,
      task1.dueDate,
      task2.dueDate,
      config.maxDaysForTemporalProximity
    );
    const assigneeMatch = this.calculateAssigneeMatch(task1, task2);
    const priorityMatch = this.calculatePriorityMatch(task1.priority, task2.priority);

    // Calculate weighted overall score
    const overallScore = 
      titleSimilarity * config.titleWeight +
      descriptionSimilarity * config.descriptionWeight +
      temporalProximity * config.temporalWeight +
      assigneeMatch * config.assigneeWeight +
      priorityMatch * config.priorityWeight;

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (overallScore >= config.autoMergeThreshold) {
      confidence = 'high';
    } else if (overallScore >= config.suggestionThreshold) {
      confidence = 'medium';
    }

    return {
      titleSimilarity,
      descriptionSimilarity,
      temporalProximity,
      assigneeMatch,
      priorityMatch,
      overallScore,
      confidence,
    };
  }

  /**
   * Calculate title similarity using fuzzy string matching
   */
  private async calculateTitleSimilarity(title1: string, title2: string): Promise<number> {
    if (!title1 || !title2) return 0;

    // Normalize titles
    const normalizedTitle1 = this.normalizeText(title1);
    const normalizedTitle2 = this.normalizeText(title2);

    if (normalizedTitle1 === normalizedTitle2) return 1;

    // Use Levenshtein distance for fuzzy matching
    const levenshteinSimilarity = this.calculateLevenshteinSimilarity(normalizedTitle1, normalizedTitle2);
    
    // Use Jaro-Winkler for additional fuzzy matching
    const jaroWinklerSimilarity = this.calculateJaroWinklerSimilarity(normalizedTitle1, normalizedTitle2);

    // Return the maximum of both algorithms
    return Math.max(levenshteinSimilarity, jaroWinklerSimilarity);
  }

  /**
   * Calculate description similarity using TF-IDF vector similarity
   */
  private async calculateDescriptionSimilarity(desc1: string, desc2: string): Promise<number> {
    if (!desc1 && !desc2) return 1; // Both empty
    if (!desc1 || !desc2) return 0; // One empty

    // For short descriptions, use fuzzy matching
    if (desc1.length < 100 && desc2.length < 100) {
      return this.calculateLevenshteinSimilarity(
        this.normalizeText(desc1),
        this.normalizeText(desc2)
      );
    }

    // For longer descriptions, use TF-IDF cosine similarity
    return this.calculateTfIdfSimilarity(desc1, desc2);
  }

  /**
   * Calculate temporal proximity based on creation and due dates
   */
  private calculateTemporalProximity(
    created1: Date,
    created2: Date,
    due1?: Date,
    due2?: Date,
    maxDays: number = 7
  ): number {
    const createdDiff = Math.abs(created1.getTime() - created2.getTime());
    const createdDiffDays = createdDiff / (1000 * 60 * 60 * 24);

    let dueDiff = 0;
    if (due1 && due2) {
      dueDiff = Math.abs(due1.getTime() - due2.getTime());
    }
    const dueDiffDays = dueDiff / (1000 * 60 * 60 * 24);

    // Calculate proximity score (closer dates = higher score)
    const createdProximity = Math.max(0, 1 - (createdDiffDays / maxDays));
    const dueProximity = due1 && due2 ? Math.max(0, 1 - (dueDiffDays / maxDays)) : 0;

    // Weight creation date more heavily than due date
    return createdProximity * 0.7 + dueProximity * 0.3;
  }

  /**
   * Calculate assignee match across different sources
   */
  private calculateAssigneeMatch(task1: Task, task2: Task): number {
    const assignee1 = this.extractAssignee(task1);
    const assignee2 = this.extractAssignee(task2);

    if (!assignee1 || !assignee2) return 0;

    // Exact match
    if (assignee1.toLowerCase() === assignee2.toLowerCase()) return 1;

    // Fuzzy match for similar names
    return this.calculateLevenshteinSimilarity(
      assignee1.toLowerCase(),
      assignee2.toLowerCase()
    );
  }

  /**
   * Calculate priority match
   */
  private calculatePriorityMatch(priority1?: string, priority2?: string): number {
    if (!priority1 && !priority2) return 1; // Both undefined
    if (!priority1 || !priority2) return 0; // One undefined
    return priority1 === priority2 ? 1 : 0;
  }

  /**
   * Extract assignee from task based on source
   */
  private extractAssignee(task: Task): string | null {
    switch (task.source) {
      case 'connectwise':
        return task.connectWiseAssignedTo || task.connectWiseOwner || null;
      case 'processplan':
        return task.processPlanAssignedTo || null;
      case 'microsoft':
        // Microsoft Todo doesn't have assignee field in current model
        return null;
      default:
        return null;
    }
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Calculate Levenshtein distance similarity
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate Jaro-Winkler similarity
   */
  private calculateJaroWinklerSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;

    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0 || len2 === 0) return 0;

    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    if (matchWindow < 0) return 0;

    const str1Matches = new Array(len1).fill(false);
    const str2Matches = new Array(len2).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);

      for (let j = start; j < end; j++) {
        if (str2Matches[j] || str1[i] !== str2[j]) continue;
        str1Matches[i] = true;
        str2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    // Find transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!str1Matches[i]) continue;
      while (!str2Matches[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }

    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

    // Jaro-Winkler prefix bonus
    let prefix = 0;
    for (let i = 0; i < Math.min(len1, len2, 4); i++) {
      if (str1[i] === str2[i]) prefix++;
      else break;
    }

    return jaro + (0.1 * prefix * (1 - jaro));
  }

  /**
   * Calculate TF-IDF cosine similarity for longer texts
   */
  private calculateTfIdfSimilarity(text1: string, text2: string): number {
    const words1 = this.tokenizeText(text1);
    const words2 = this.tokenizeText(text2);

    if (words1.length === 0 && words2.length === 0) return 1;
    if (words1.length === 0 || words2.length === 0) return 0;

    const allWords = new Set([...words1, ...words2]);
    const vector1 = this.createTfIdfVector(words1, allWords);
    const vector2 = this.createTfIdfVector(words2, allWords);

    return this.cosineSimilarity(vector1, vector2);
  }

  /**
   * Tokenize text into words
   */
  private tokenizeText(text: string): string[] {
    return this.normalizeText(text)
      .split(/\s+/)
      .filter(word => word.length > 2); // Filter out very short words
  }

  /**
   * Create TF-IDF vector
   */
  private createTfIdfVector(words: string[], allWords: Set<string>): number[] {
    const vector: number[] = [];
    const wordCount = words.length;

    for (const word of allWords) {
      const tf = words.filter(w => w === word).length / wordCount;
      // For simplicity, we'll use a basic TF score without IDF
      vector.push(tf);
    }

    return vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vector1: number[], vector2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Create a zero score for non-comparable tasks
   */
  private createZeroScore(): DuplicateScore {
    return {
      titleSimilarity: 0,
      descriptionSimilarity: 0,
      temporalProximity: 0,
      assigneeMatch: 0,
      priorityMatch: 0,
      overallScore: 0,
      confidence: 'low',
    };
  }
}
