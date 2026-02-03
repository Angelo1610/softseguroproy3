import mongoose from 'mongoose';
import { config } from '../../config/index';
import logger from '../../utils/logger';

/**
 * Configuración de conexión a MongoDB
 * Principio SOLID: Single Responsibility - Gestiona únicamente la conexión a BD
 */

class Database {
  private static instance: Database;

  private constructor() {}

  /**
   * Patrón Singleton para la conexión de base de datos
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Conectar a MongoDB con configuración segura
   */
  public async connect(): Promise<void> {
    try {
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      await mongoose.connect(config.database.mongoUri, options);

      logger.info('Conexión exitosa a MongoDB', {
        database: mongoose.connection.name,
      });

      // Eventos de conexión
      mongoose.connection.on('error', (error) => {
        logger.error('Error de conexión a MongoDB', { error: error.message });
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB desconectado');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconectado');
      });
    } catch (error) {
      logger.error('Error al conectar a MongoDB', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      throw error;
    }
  }

  /**
   * Desconectar de MongoDB
   */
  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      logger.info('Desconectado de MongoDB');
    } catch (error) {
      logger.error('Error al desconectar de MongoDB', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      throw error;
    }
  }

  /**
   * Verificar estado de conexión
   */
  public isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }
}

export default Database;
