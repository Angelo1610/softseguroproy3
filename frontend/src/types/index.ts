/**
 * Tipos TypeScript para el frontend
 */

export enum UserRole {
  ADMIN = 'admin',
  CLIENT = 'client',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    accessToken: string;
    user: User;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface BiometricOptions {
  challenge: string;
  options: any;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}
