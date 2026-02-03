import { User, CreateUserDTO, UpdateUserDTO, UserRole } from '../../domain/entities/User';

/**
 * Interfaz de Repositorio de Usuarios
 * 
 * Patrón de Diseño: Repository Pattern
 * - Abstrae el acceso a datos
 * - Permite cambiar la implementación sin afectar al código cliente
 * 
 * Principio SOLID: Dependency Inversion
 * - Los servicios dependen de esta abstracción, no de la implementación concreta
 * 
 * Principio SOLID: Interface Segregation
 * - Interfaz específica para operaciones de usuario
 */
export interface IUserRepository {
  /**
   * Crear un nuevo usuario
   */
  create(userData: CreateUserDTO): Promise<User>;

  /**
   * Buscar usuario por ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Buscar usuario por email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Actualizar usuario
   */
  update(id: string, userData: UpdateUserDTO): Promise<User | null>;

  /**
   * Eliminar usuario (soft delete)
   */
  delete(id: string): Promise<boolean>;

  /**
   * Listar todos los usuarios (con paginación)
   */
  findAll(page?: number, limit?: number): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }>;

  /**
   * Buscar usuarios por rol
   */
  findByRole(role: UserRole, page?: number, limit?: number): Promise<User[]>;

  /**
   * Agregar credencial WebAuthn a un usuario
   */
  addWebAuthnCredential(
    userId: string,
    credential: {
      credentialID: Buffer;
      credentialPublicKey: Buffer;
      counter: number;
      transports?: string[];
      deviceName?: string;
    }
  ): Promise<User | null>;

  /**
   * Actualizar contador de credencial WebAuthn
   */
  updateWebAuthnCounter(
    userId: string,
    credentialID: Buffer,
    newCounter: number
  ): Promise<boolean>;

  /**
   * Agregar refresh token a un usuario
   */
  addRefreshToken(userId: string, token: string): Promise<boolean>;

  /**
   * Remover refresh token de un usuario
   */
  removeRefreshToken(userId: string, token: string): Promise<boolean>;

  /**
   * Incrementar intentos fallidos de login
   */
  incrementFailedLoginAttempts(userId: string): Promise<number>;

  /**
   * Resetear intentos fallidos de login
   */
  resetFailedLoginAttempts(userId: string): Promise<boolean>;

  /**
   * Bloquear cuenta de usuario
   */
  lockAccount(userId: string, until: Date): Promise<boolean>;

  /**
   * Actualizar último login
   */
  updateLastLogin(userId: string): Promise<boolean>;

  /**
   * Verificar si existe un usuario con email
   */
  existsByEmail(email: string): Promise<boolean>;
}
