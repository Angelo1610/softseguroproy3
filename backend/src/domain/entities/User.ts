/**
 * Enumeraciones para roles de usuario
 * Principio SOLID: Open/Closed - Extensible sin modificar código existente
 */
export enum UserRole {
  ADMIN = 'admin',
  CLIENT = 'client',
}

/**
 * Entidad User - Capa de Dominio
 * Representa el modelo de negocio central del usuario
 * 
 * Principio SOLID: Single Responsibility
 * - Responsabilidad única: Representar un usuario del sistema
 */
export interface User {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
  lastLogin?: Date;
  
  // WebAuthn credentials (no almacena datos biométricos)
  webAuthnCredentials: WebAuthnCredential[];
  
  // Sesión y seguridad
  refreshTokens: string[];
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
}

/**
 * Credencial WebAuthn
 * Almacena información pública de la credencial, NO datos biométricos
 */
export interface WebAuthnCredential {
  credentialID: Buffer;
  credentialPublicKey: Buffer;
  counter: number;
  transports?: AuthenticatorTransport[];
  createdAt: Date;
  lastUsed?: Date;
  deviceName?: string;
}

/**
 * Información del perfil de usuario (para clientes)
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  lastLogin?: Date;
}

/**
 * DTO para creación de usuario
 */
export interface CreateUserDTO {
  email: string;
  name: string;
  role?: UserRole;
}

/**
 * DTO para actualización de usuario
 */
export interface UpdateUserDTO {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Tipos de AuthenticatorTransport según WebAuthn spec
 */
export type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal';
