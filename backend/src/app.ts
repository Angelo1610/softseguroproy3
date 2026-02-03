import express, { Application } from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config, validateConfig } from './config';
import Database from './infrastructure/database/connection';
import authRoutes from './presentation/routes/authRoutes';
import userRoutes from './presentation/routes/userRoutes';
import {
  securityHeaders,
  sanitizeData,
  validateContentType,
  detectSuspiciousActivity,
  csrfProtection,
  additionalSecurityHeaders,
  errorHandler,
  // apiRateLimiter, // Deshabilitado para desarrollo
} from './presentation/middleware/securityMiddleware';
import logger from './utils/logger';

/**
 * Aplicación Principal
 * Configura Express con todas las medidas de seguridad
 *
 * Principio SOLID: Single Responsibility
 * - Responsabilidad única: Configurar y arrancar la aplicación
 */

class App {
  public app: Application;
  private database: Database;

  constructor() {
    this.app = express();
    this.database = Database.getInstance();
   
    this.validateConfiguration();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Validar configuración antes de iniciar
   */
  private validateConfiguration(): void {
    try {
      validateConfig();
      logger.info('Configuración validada correctamente');
    } catch (error) {
      logger.error('Error en configuración', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  }

  /**
   * Configurar middlewares de seguridad y utilidad
   */
  private initializeMiddlewares(): void {
    // Trust proxy (para obtener IP real detrás de proxy)
    this.app.set('trust proxy', 1);

    // Seguridad: Headers de seguridad
    this.app.use(securityHeaders);
    this.app.use(additionalSecurityHeaders);

    // CORS configurado de forma segura
    this.app.use(
      cors({
        origin: config.cors.origin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );

    // Parsers
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser());

    // Compresión de respuestas
    this.app.use(compression());

    // Seguridad: Sanitización de datos (prevenir inyección NoSQL)
    this.app.use(sanitizeData);

    // Seguridad: Validar Content-Type
    this.app.use(validateContentType);

    // Seguridad: Detectar patrones sospechosos
    this.app.use(detectSuspiciousActivity);

    // Seguridad: Protección CSRF
    this.app.use(csrfProtection);

    // Rate limiting global - DESHABILITADO PARA DESARROLLO
    // this.app.use('/api', apiRateLimiter);

    logger.info('Middlewares de seguridad configurados');
  }

  /**
   * Configurar rutas de la aplicación
   */
  private initializeRoutes(): void {
    const apiVersion = config.apiVersion;

    // Health check
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        database: this.database.isConnected() ? 'connected' : 'disconnected',
      });
    });

    // Rutas de API
    this.app.use(`/api/${apiVersion}/auth`, authRoutes);
    this.app.use(`/api/${apiVersion}/users`, userRoutes);

    // Ruta 404
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Ruta no encontrada',
        path: req.originalUrl,
      });
    });

    logger.info('Rutas configuradas');
  }

  /**
   * Configurar manejo de errores
   */
  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
    logger.info('Manejo de errores configurado');
  }

  /**
   * Conectar a la base de datos
   */
  public async connectDatabase(): Promise<void> {
    try {
      await this.database.connect();
      logger.info('Base de datos conectada');
    } catch (error) {
      logger.error('Error al conectar base de datos', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Desconectar de la base de datos
   */
  public async disconnectDatabase(): Promise<void> {
    try {
      await this.database.disconnect();
      logger.info('Base de datos desconectada');
    } catch (error) {
      logger.error('Error al desconectar base de datos', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Iniciar el servidor
   */
  public async start(): Promise<void> {
    try {
      await this.connectDatabase();

      const port = config.port;

      this.app.listen(port, () => {
        logger.info(`Servidor iniciado en puerto ${port}`);
        logger.info(`Ambiente: ${config.env}`);
        logger.info(`API versión: ${config.apiVersion}`);
        logger.info(`WebAuthn RP ID: ${config.webauthn.rpID}`);
       
        if (config.env === 'development') {
          logger.info(`URL local: http://localhost:${port}`);
          logger.info(`Health check: http://localhost:${port}/health`);
          logger.info(`API base: http://localhost:${port}/api/${config.apiVersion}`);
        }
      });
    } catch (error) {
      logger.error('Error al iniciar servidor', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  }

  /**
   * Cerrar servidor de forma segura
   */
  public async shutdown(): Promise<void> {
    logger.info('Cerrando servidor...');
    await this.disconnectDatabase();
    process.exit(0);
  }
}

// Inicializar y arrancar la aplicación
const application = new App();

// Iniciar servidor
application.start();

// Manejo de señales para cierre seguro
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido');
  await application.shutdown();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recibido');
  await application.shutdown();
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise,
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

export default application.app;

