import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuración centralizada de la aplicación
 * Principio SOLID: Single Responsibility - Gestiona únicamente la configuración
 */
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  database: {
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/biometric_auth_db',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  webauthn: {
    rpName: process.env.RP_NAME || 'Biometric Auth System',
    rpID: process.env.RP_ID || 'localhost',
    expectedOrigin: process.env.EXPECTED_ORIGIN || 'http://localhost:3000',
    timeout: 60000,
    challengeSize: 32,
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10),
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '3600000', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
  },
};

/**
 * Validar configuración crítica
 */
export const validateConfig = (): void => {
  const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

  if (config.env === 'production') {
    requiredEnvVars.push('MONGODB_URI');
  }

  const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno críticas: ${missing.join(', ')}`
    );
  }

  // Validar secretos en producción
  if (config.env === 'production') {
    if (config.jwt.secret.includes('change-this') || config.jwt.secret.length < 32) {
      throw new Error('JWT_SECRET debe ser cambiado y tener al menos 32 caracteres en producción');
    }
  }
};
