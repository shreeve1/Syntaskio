export interface Integration {
  id: string;
  userId: string;
  provider: 'microsoft' | 'connectwise' | 'processplan';
  accessToken: string; // encrypted
  refreshToken: string; // encrypted
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIntegrationData {
  userId: string;
  provider: 'microsoft' | 'connectwise' | 'processplan';
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface UpdateIntegrationData {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}
