import { IUserRepository } from '../../application/interfaces/IUserRepository';
import { User, CreateUserDTO, UpdateUserDTO, UserRole } from '../../domain/entities/User';
import { UserModel } from '../database/models/UserModel';
import logger from '../../utils/logger';

/**
 * Implementación concreta del Repository Pattern para Usuarios
 * 
 * Patrón de Diseño: Repository Pattern
 * Principio SOLID: Single Responsibility - Solo gestiona persistencia de usuarios
 * Principio SOLID: Dependency Inversion - Implementa la interfaz IUserRepository
 */
export class UserRepository implements IUserRepository {
  /**
   * Crear un nuevo usuario
   */
  async create(userData: CreateUserDTO): Promise<User> {
    try {
      const user = new UserModel({
        email: userData.email.toLowerCase(),
        name: userData.name,
        role: userData.role || UserRole.CLIENT,
        isActive: true,
        webAuthnCredentials: [],
        refreshTokens: [],
        failedLoginAttempts: 0,
      });

      await user.save();
      logger.info('Usuario creado', { userId: user.id, email: user.email });

      return this.mapToEntity(user);
    } catch (error) {
      logger.error('Error al crear usuario', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        email: userData.email,
      });
      throw error;
    }
  }

  /**
   * Buscar usuario por ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const user = await UserModel.findById(id);
      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      logger.error('Error al buscar usuario por ID', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId: id,
      });
      return null;
    }
  }

  /**
   * Buscar usuario por email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await UserModel.findOne({ email: email.toLowerCase() });
      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      logger.error('Error al buscar usuario por email', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      return null;
    }
  }

  /**
   * Actualizar usuario
   */
  async update(id: string, userData: UpdateUserDTO): Promise<User | null> {
    try {
      const user = await UserModel.findByIdAndUpdate(
        id,
        { $set: userData },
        { new: true, runValidators: true }
      );

      if (user) {
        logger.info('Usuario actualizado', { userId: id });
      }

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      logger.error('Error al actualizar usuario', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId: id,
      });
      throw error;
    }
  }

  /**
   * Eliminar usuario (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await UserModel.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
      );

      if (result) {
        logger.info('Usuario eliminado (soft delete)', { userId: id });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error al eliminar usuario', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId: id,
      });
      return false;
    }
  }

  /**
   * Listar todos los usuarios con paginación
   */
  async findAll(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const [users, total] = await Promise.all([
        UserModel.find({ isActive: true })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        UserModel.countDocuments({ isActive: true }),
      ]);

      return {
        users: users.map((user) => this.mapToEntity(user)),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error al listar usuarios', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      throw error;
    }
  }

  /**
   * Buscar usuarios por rol
   */
  async findByRole(
    role: UserRole,
    page: number = 1,
    limit: number = 10
  ): Promise<User[]> {
    try {
      const skip = (page - 1) * limit;
      const users = await UserModel.find({ role, isActive: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return users.map((user) => this.mapToEntity(user));
    } catch (error) {
      logger.error('Error al buscar usuarios por rol', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        role,
      });
      throw error;
    }
  }

  /**
   * Agregar credencial WebAuthn
   */
  async addWebAuthnCredential(
    userId: string,
    credential: {
      credentialID: Buffer;
      credentialPublicKey: Buffer;
      counter: number;
      transports?: string[];
      deviceName?: string;
    }
  ): Promise<User | null> {
    try {
      const user = await UserModel.findByIdAndUpdate(
        userId,
        {
          $push: {
            webAuthnCredentials: {
              ...credential,
              createdAt: new Date(),
            },
          },
        },
        { new: true }
      );

      if (user) {
        logger.info('Credencial WebAuthn agregada', { userId });
      }

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      logger.error('Error al agregar credencial WebAuthn', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId,
      });
      throw error;
    }
  }

  /**
   * Actualizar contador de credencial WebAuthn
   */
  async updateWebAuthnCounter(
    userId: string,
    credentialID: Buffer,
    newCounter: number
  ): Promise<boolean> {
    try {
      const result = await UserModel.updateOne(
        {
          _id: userId,
          'webAuthnCredentials.credentialID': credentialID,
        },
        {
          $set: {
            'webAuthnCredentials.$.counter': newCounter,
            'webAuthnCredentials.$.lastUsed': new Date(),
          },
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error al actualizar contador WebAuthn', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId,
      });
      return false;
    }
  }

  /**
   * Agregar refresh token
   */
  async addRefreshToken(userId: string, token: string): Promise<boolean> {
    try {
      const result = await UserModel.updateOne(
        { _id: userId },
        { $push: { refreshTokens: token } }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error al agregar refresh token', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId,
      });
      return false;
    }
  }

  /**
   * Remover refresh token
   */
  async removeRefreshToken(userId: string, token: string): Promise<boolean> {
    try {
      const result = await UserModel.updateOne(
        { _id: userId },
        { $pull: { refreshTokens: token } }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error al remover refresh token', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId,
      });
      return false;
    }
  }

  /**
   * Incrementar intentos fallidos de login
   */
  async incrementFailedLoginAttempts(userId: string): Promise<number> {
    try {
      const user = await UserModel.findByIdAndUpdate(
        userId,
        { $inc: { failedLoginAttempts: 1 } },
        { new: true }
      );

      return user?.failedLoginAttempts || 0;
    } catch (error) {
      logger.error('Error al incrementar intentos fallidos', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId,
      });
      return 0;
    }
  }

  /**
   * Resetear intentos fallidos de login
   */
  async resetFailedLoginAttempts(userId: string): Promise<boolean> {
    try {
      const result = await UserModel.updateOne(
        { _id: userId },
        { $set: { failedLoginAttempts: 0, accountLockedUntil: null } }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error al resetear intentos fallidos', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId,
      });
      return false;
    }
  }

  /**
   * Bloquear cuenta
   */
  async lockAccount(userId: string, until: Date): Promise<boolean> {
    try {
      const result = await UserModel.updateOne(
        { _id: userId },
        { $set: { accountLockedUntil: until } }
      );

      if (result.modifiedCount > 0) {
        logger.warn('Cuenta bloqueada', { userId, until });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error al bloquear cuenta', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId,
      });
      return false;
    }
  }

  /**
   * Actualizar último login
   */
  async updateLastLogin(userId: string): Promise<boolean> {
    try {
      const result = await UserModel.updateOne(
        { _id: userId },
        { $set: { lastLogin: new Date() } }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Error al actualizar último login', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        userId,
      });
      return false;
    }
  }

  /**
   * Verificar si existe usuario con email
   */
  async existsByEmail(email: string): Promise<boolean> {
    try {
      const count = await UserModel.countDocuments({
        email: email.toLowerCase(),
      });
      return count > 0;
    } catch (error) {
      logger.error('Error al verificar existencia de email', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      return false;
    }
  }

  /**
   * Mapear documento de MongoDB a entidad del dominio
   * Principio SOLID: Single Responsibility
   */
  private mapToEntity(document: any): User {
    return {
      id: document.id || document._id.toString(),
      email: document.email,
      name: document.name,
      role: document.role,
      isActive: document.isActive,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      lastLogin: document.lastLogin,
      webAuthnCredentials: document.webAuthnCredentials || [],
      refreshTokens: document.refreshTokens || [],
      failedLoginAttempts: document.failedLoginAttempts || 0,
      accountLockedUntil: document.accountLockedUntil,
    };
  }
}
