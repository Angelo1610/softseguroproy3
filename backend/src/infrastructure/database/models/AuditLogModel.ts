import mongoose, { Schema, Document } from 'mongoose';
import { AuditLog, AuditEventType, AuditSeverity } from '../../../domain/entities/AuditLog';

/**
 * Modelo de MongoDB para Auditoría
 * Registra eventos de seguridad y acciones importantes
 */

export interface IAuditLogDocument extends Omit<AuditLog, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    eventType: {
      type: String,
      enum: Object.values(AuditEventType),
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(AuditSeverity),
      required: true,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    userEmail: {
      type: String,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    resource: {
      type: String,
    },
    action: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    successful: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: false,
    collection: 'audit_logs',
  }
);

// Índices compuestos para consultas comunes
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ eventType: 1, timestamp: -1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });
AuditLogSchema.index({ ipAddress: 1, timestamp: -1 });

// TTL index: eliminar logs antiguos después de 90 días
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// Virtual para ID
AuditLogSchema.virtual('id').get(function (this: IAuditLogDocument) {
  return this._id.toHexString();
});

// Configurar toJSON
AuditLogSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

export const AuditLogModel = mongoose.model<IAuditLogDocument>(
  'AuditLog',
  AuditLogSchema
);
