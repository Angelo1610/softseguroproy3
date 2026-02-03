import { IAuditRepository } from '../../application/interfaces/IAuditRepository';
import {
  AuditLog,
  AuditEventType,
  AuditSeverity,
  AuditLogFilter,
} from '../../domain/entities/AuditLog';
import { AuditLogModel } from '../database/models/AuditLogModel';
import logger from '../../utils/logger';

/**
 * Implementación del Repository Pattern para Auditoría
 */
export class AuditRepository implements IAuditRepository {
  /**
   * Crear un nuevo log de auditoría
   */
  async create(auditData: Omit<AuditLog, 'id'>): Promise<AuditLog> {
    try {
      const auditLog = new AuditLogModel(auditData);
      await auditLog.save();
      return this.mapToEntity(auditLog);
    } catch (error) {
      logger.error('Error al crear log de auditoría', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      throw error;
    }
  }

  /**
   * Buscar logs por filtros
   */
  async findByFilters(
    filters: AuditLogFilter,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: any = {};

      if (filters.userId) {
        query.userId = filters.userId;
      }

      if (filters.eventType) {
        query.eventType = filters.eventType;
      }

      if (filters.severity) {
        query.severity = filters.severity;
      }

      if (filters.ipAddress) {
        query.ipAddress = filters.ipAddress;
      }

      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) {
          query.timestamp.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.timestamp.$lte = filters.endDate;
        }
      }

      const skip = (page - 1) * limit;
      const [logs, total] = await Promise.all([
        AuditLogModel.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit),
        AuditLogModel.countDocuments(query),
      ]);

      return {
        logs: logs.map((log) => this.mapToEntity(log)),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error al buscar logs de auditoría', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      throw error;
    }
  }

  /**
   * Buscar logs por usuario
   */
  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<AuditLog[]> {
    try {
      const skip = (page - 1) * limit;
      const logs = await AuditLogModel.find({ userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

      return logs.map((log) => this.mapToEntity(log));
    } catch (error) {
      logger.error('Error al buscar logs por usuario', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId,
      });
      throw error;
    }
  }

  /**
   * Buscar logs por tipo de evento
   */
  async findByEventType(
    eventType: AuditEventType,
    page: number = 1,
    limit: number = 50
  ): Promise<AuditLog[]> {
    try {
      const skip = (page - 1) * limit;
      const logs = await AuditLogModel.find({ eventType })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

      return logs.map((log) => this.mapToEntity(log));
    } catch (error) {
      logger.error('Error al buscar logs por tipo de evento', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        eventType,
      });
      throw error;
    }
  }

  /**
   * Buscar logs por rango de fechas
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 50
  ): Promise<AuditLog[]> {
    try {
      const skip = (page - 1) * limit;
      const logs = await AuditLogModel.find({
        timestamp: { $gte: startDate, $lte: endDate },
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

      return logs.map((log) => this.mapToEntity(log));
    } catch (error) {
      logger.error('Error al buscar logs por rango de fechas', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      throw error;
    }
  }

  /**
   * Contar eventos por severidad
   */
  async countBySeverity(
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<AuditSeverity, number>> {
    try {
      const query: any = {};

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
      }

      const results = await AuditLogModel.aggregate([
        { $match: query },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]);

      const counts: Record<string, number> = {
        info: 0,
        warning: 0,
        error: 0,
        critical: 0,
      };

      results.forEach((result) => {
        counts[result._id] = result.count;
      });

      return counts as Record<AuditSeverity, number>;
    } catch (error) {
      logger.error('Error al contar por severidad', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      throw error;
    }
  }

  /**
   * Mapear documento a entidad
   */
  private mapToEntity(document: any): AuditLog {
    return {
      id: document.id || document._id.toString(),
      eventType: document.eventType,
      severity: document.severity,
      userId: document.userId,
      userEmail: document.userEmail,
      ipAddress: document.ipAddress,
      userAgent: document.userAgent,
      resource: document.resource,
      action: document.action,
      details: document.details,
      timestamp: document.timestamp,
      successful: document.successful,
    };
  }
}
