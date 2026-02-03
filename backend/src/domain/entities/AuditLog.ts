/**
 * Entidad de Auditoría - Capa de Dominio
 * Registra eventos de seguridad y acciones importantes
 * 
 * Principio SOLID: Single Responsibility
 * - Responsabilidad única: Representar un evento de auditoría
 */

export enum AuditEventType {
  // Autenticación
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  SESSION_EXPIRED = 'session_expired',
  
  // Registro WebAuthn
  WEBAUTHN_REGISTRATION_START = 'webauthn_registration_start',
  WEBAUTHN_REGISTRATION_SUCCESS = 'webauthn_registration_success',
  WEBAUTHN_REGISTRATION_FAILED = 'webauthn_registration_failed',
  
  // Autenticación WebAuthn
  WEBAUTHN_AUTH_START = 'webauthn_auth_start',
  WEBAUTHN_AUTH_SUCCESS = 'webauthn_auth_success',
  WEBAUTHN_AUTH_FAILED = 'webauthn_auth_failed',
  
  // Gestión de usuarios
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_ROLE_CHANGED = 'user_role_changed',
  
  // Seguridad
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  
  // Datos
  DATA_ACCESS = 'data_access',
  DATA_MODIFIED = 'data_modified',
  DATA_DELETED = 'data_deleted',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface AuditLog {
  id?: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  successful: boolean;
}

export interface AuditLogFilter {
  userId?: string;
  eventType?: AuditEventType;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
}
