export interface Integration {
  id: string;
  userId: string;
  provider: 'microsoft' | 'connectwise' | 'processplan';
  accessToken: string; // encrypted
  refreshToken: string; // encrypted
  expiresAt: Date;
  config?: {
    // ConnectWise-specific configuration
    serverUrl?: string;
    companyId?: string;
    memberId?: string;
  };
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIntegrationData {
  userId: string;
  provider: 'microsoft' | 'connectwise' | 'processplan';
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  config?: {
    serverUrl?: string;
    companyId?: string;
    memberId?: string;
  };
}

export interface UpdateIntegrationData {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}
