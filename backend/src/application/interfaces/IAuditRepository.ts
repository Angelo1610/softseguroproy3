import {
  AuditLog,
  AuditEventType,
  AuditSeverity,
  AuditLogFilter,
} from '../../domain/entities/AuditLog';

/**
 * Interfaz del Repositorio de Auditoría
 * Patrón Repository Pattern
 */
export interface IAuditRepository {
  /**
   * Crear un nuevo log de auditoría
   */
  create(auditLog: Omit<AuditLog, 'id'>): Promise<AuditLog>;

  /**
   * Buscar logs por filtros
   */
  findByFilters(
    filters: AuditLogFilter,
    page?: number,
    limit?: number
  ): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }>;

  /**
   * Buscar logs por usuario
   */
  findByUserId(
    userId: string,
    page?: number,
    limit?: number
  ): Promise<AuditLog[]>;

  /**
   * Buscar logs por tipo de evento
   */
  findByEventType(
    eventType: AuditEventType,
    page?: number,
    limit?: number
  ): Promise<AuditLog[]>;

  /**
   * Buscar logs por rango de fechas
   */
  findByDateRange(
    startDate: Date,
    endDate: Date,
    page?: number,
    limit?: number
  ): Promise<AuditLog[]>;

  /**
   * Contar eventos por severidad
   */
  countBySeverity(
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<AuditSeverity, number>>;
}
