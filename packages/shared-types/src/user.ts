export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export interface CreateUserData {
  id: string;
  email: string;
}

export interface UpdateUserData {
  email?: string;
}
