import mongoose, { Schema, Document } from 'mongoose';
import { User, UserRole, WebAuthnCredential } from '../../../domain/entities/User';

/**
 * Modelo de MongoDB para Usuario
 * Capa de Infraestructura - No contiene lógica de negocio
 * 
 * Principio SOLID: Dependency Inversion
 * - El dominio no depende de la infraestructura
 */

export interface IUserDocument extends Omit<User, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const WebAuthnCredentialSchema = new Schema<WebAuthnCredential>(
  {
    credentialID: {
      type: Buffer,
      required: true,
    },
    credentialPublicKey: {
      type: Buffer,
      required: true,
    },
    counter: {
      type: Number,
      required: true,
      default: 0,
    },
    transports: {
      type: [String],
      enum: ['usb', 'nfc', 'ble', 'internal'],
    },
    deviceName: {
      type: String,
      maxlength: 100,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastUsed: {
      type: Date,
    },
  },
  { _id: false }
);

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CLIENT,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    webAuthnCredentials: {
      type: [WebAuthnCredentialSchema],
      default: [],
    },
    refreshTokens: {
      type: [String],
      default: [],
      select: false, // No incluir en queries por defecto (seguridad)
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    accountLockedUntil: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Índices para optimización de consultas
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

// Virtual para ID
UserSchema.virtual('id').get(function (this: IUserDocument) {
  return this._id.toHexString();
});

// Configurar toJSON para incluir virtuals y excluir campos sensibles
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete (ret as any)._id;
    delete (ret as any).__v;
    delete (ret as any).refreshTokens;
    return ret;
  },
});

// Middleware pre-save para validaciones adicionales
UserSchema.pre('save', function (next) {
  // Validación de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(this.email)) {
    next(new Error('Formato de email inválido'));
    return;
  }

  // Sanitización de nombre (prevenir XSS)
  if (this.name) {
    this.name = this.name.replace(/<[^>]*>/g, '');
  }

  next();
});

// Métodos de instancia
UserSchema.methods.hasWebAuthnCredential = function (this: IUserDocument): boolean {
  return this.webAuthnCredentials.length > 0;
};

UserSchema.methods.isAccountLocked = function (this: IUserDocument): boolean {
  if (!this.accountLockedUntil) return false;
  return this.accountLockedUntil > new Date();
};

// Métodos estáticos
UserSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
