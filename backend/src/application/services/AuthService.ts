import { IUserRepository } from '../interfaces/IUserRepository';
import { IAuditRepository } from '../interfaces/IAuditRepository';
import { User, CreateUserDTO, UpdateUserDTO, UserRole } from '../../domain/entities/User';
import { AuditEventType, AuditSeverity } from '../../domain/entities/AuditLog';
import { WebAuthnService } from './WebAuthnService';
import { JwtService, TokenPair } from './JwtService';
import { ValidatorFactory } from '../../domain/validators/UserValidator';
import logger, { SecurityLogger } from '../../utils/logger';

/**
 * Servicio de Autenticación
 * Coordina todo el flujo de autenticación y gestión de usuarios
 * 
 * Patrón de Diseño: Facade Pattern (variante)
 * - Proporciona interfaz simplificada para operaciones complejas
 * 
 * Principio SOLID: Single Responsibility
 * - Responsabilidad única: Gestionar autenticación y autorización
 * 
 * Principio SOLID: Dependency Inversion
 * - Depende de abstracciones (interfaces), no de implementaciones concretas
 */

export class AuthService {
  private webAuthnService: WebAuthnService;
  private jwtService: JwtService;
  private validator = ValidatorFactory.createUserDataValidator();

  constructor(
    private userRepository: IUserRepository,
    private auditRepository: IAuditRepository
  ) {
    this.webAuthnService = new WebAuthnService(userRepository);
    this.jwtService = new JwtService();
    logger.info('AuthService inicializado');
  }

  /**
   * Registrar nuevo usuario
   * Solo admins pueden crear usuarios
   */
  async registerUser(
    userData: CreateUserDTO,
    requestIp: string,
    requestingUserId?: string
  ): Promise<User> {
    try {
      // Validar datos
      const emailValidation = this.validator.validateEmail(userData.email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.errors.join(', '));
      }

      const nameValidation = this.validator.validateName(userData.name);
      if (!nameValidation.isValid) {
        throw new Error(nameValidation.errors.join(', '));
      }

      if (userData.role) {
        const roleValidation = this.validator.validateRole(userData.role);
        if (!roleValidation.isValid) {
          throw new Error(roleValidation.errors.join(', '));
        }
      }

      // Verificar si el email ya existe
      const exists = await this.userRepository.existsByEmail(userData.email);
      if (exists) {
        await this.auditRepository.create({
          eventType: AuditEventType.USER_CREATED,
          severity: AuditSeverity.WARNING,
          userId: requestingUserId,
          ipAddress: requestIp,
          details: { email: userData.email, reason: 'Email already exists' },
          timestamp: new Date(),
          successful: false,
        });

        throw new Error('El email ya está registrado');
      }

      // Crear usuario
      const user = await this.userRepository.create(userData);

      // Auditoría
      await this.auditRepository.create({
        eventType: AuditEventType.USER_CREATED,
        severity: AuditSeverity.INFO,
        userId: requestingUserId,
        userEmail: requestingUserId ? undefined : user.email,
        ipAddress: requestIp,
        resource: 'user',
        action: 'create',
        details: {
          newUserId: user.id,
          newUserEmail: user.email,
          role: user.role,
        },
        timestamp: new Date(),
        successful: true,
      });

      logger.info('Usuario registrado exitosamente', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return user;
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'User registration failed',
        'medium',
        {
          email: userData.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      throw error;
    }
  }

  /**
   * Iniciar proceso de registro de credencial biométrica
   */
  async startBiometricRegistration(userId: string, requestIp: string) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const options = await this.webAuthnService.generateRegistrationOptions(user);

      await this.auditRepository.create({
        eventType: AuditEventType.WEBAUTHN_REGISTRATION_START,
        severity: AuditSeverity.INFO,
        userId: user.id,
        userEmail: user.email,
        ipAddress: requestIp,
        timestamp: new Date(),
        successful: true,
      });

      return options;
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'Biometric registration start failed',
        'medium',
        {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      throw error;
    }
  }

  /**
   * Completar registro de credencial biométrica
   */
  async completeBiometricRegistration(
    userId: string,
    response: any,
    deviceName: string | undefined,
    requestIp: string
  ): Promise<User> {
    try {
      const result = await this.webAuthnService.verifyRegistration(
        userId,
        response,
        deviceName
      );

      if (!result.verified || !result.user) {
        await this.auditRepository.create({
          eventType: AuditEventType.WEBAUTHN_REGISTRATION_FAILED,
          severity: AuditSeverity.WARNING,
          userId,
          ipAddress: requestIp,
          timestamp: new Date(),
          successful: false,
        });

        throw new Error('Verificación de credencial biométrica fallida');
      }

      await this.auditRepository.create({
        eventType: AuditEventType.WEBAUTHN_REGISTRATION_SUCCESS,
        severity: AuditSeverity.INFO,
        userId,
        userEmail: result.user.email,
        ipAddress: requestIp,
        details: { deviceName },
        timestamp: new Date(),
        successful: true,
      });

      logger.info('Credencial biométrica registrada', {
        userId,
        deviceName,
      });

      return result.user;
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'Biometric registration completion failed',
        'high',
        {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      throw error;
    }
  }

  /**
   * Iniciar proceso de autenticación biométrica
   */
  async startBiometricLogin(email: string | undefined, requestIp: string) {
    try {
      const options = await this.webAuthnService.generateAuthenticationOptions(email);

      await this.auditRepository.create({
        eventType: AuditEventType.WEBAUTHN_AUTH_START,
        severity: AuditSeverity.INFO,
        userEmail: email,
        ipAddress: requestIp,
        timestamp: new Date(),
        successful: true,
      });

      return options;
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'Biometric login start failed',
        'medium',
        {
          email,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      throw error;
    }
  }

  /**
   * Completar autenticación biométrica y generar tokens
   */
  async completeBiometricLogin(
    response: any,
    email: string | undefined,
    requestIp: string,
    userAgent?: string
  ): Promise<{ tokens: TokenPair; user: User }> {
    try {
      // Verificar autenticación biométrica
      const result = await this.webAuthnService.verifyAuthentication(response, email);

      if (!result.verified || !result.user) {
        await this.auditRepository.create({
          eventType: AuditEventType.WEBAUTHN_AUTH_FAILED,
          severity: AuditSeverity.WARNING,
          userEmail: email,
          ipAddress: requestIp,
          userAgent,
          timestamp: new Date(),
          successful: false,
        });

        throw new Error('Autenticación biométrica fallida');
      }

      const user = result.user;

      // Verificar si la cuenta está activa
      if (!user.isActive) {
        throw new Error('Cuenta desactivada');
      }

      // Verificar si la cuenta está bloqueada
      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        await this.auditRepository.create({
          eventType: AuditEventType.LOGIN_FAILED,
          severity: AuditSeverity.WARNING,
          userId: user.id,
          userEmail: user.email,
          ipAddress: requestIp,
          details: { reason: 'Account locked' },
          timestamp: new Date(),
          successful: false,
        });

        throw new Error('Cuenta bloqueada temporalmente');
      }

      // Generar tokens
      const tokens = this.jwtService.generateTokenPair(user);

      // Guardar refresh token
      await this.userRepository.addRefreshToken(user.id!, tokens.refreshToken);

      // Actualizar último login
      await this.userRepository.updateLastLogin(user.id!);

      // Resetear intentos fallidos
      await this.userRepository.resetFailedLoginAttempts(user.id!);

      // Auditoría
      await this.auditRepository.create({
        eventType: AuditEventType.LOGIN_SUCCESS,
        severity: AuditSeverity.INFO,
        userId: user.id,
        userEmail: user.email,
        ipAddress: requestIp,
        userAgent,
        timestamp: new Date(),
        successful: true,
      });

      SecurityLogger.logAuthAttempt(user.id!, true, 'webauthn', requestIp);

      logger.info('Login biométrico exitoso', {
        userId: user.id,
        email: user.email,
      });

      return { tokens, user };
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'Biometric login completion failed',
        'high',
        {
          email,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      throw error;
    }
  }

  /**
   * Refrescar tokens de sesión
   */
  async refreshTokens(
    refreshToken: string,
    requestIp: string
  ): Promise<TokenPair> {
    try {
      // Verificar refresh token
      const payload = this.jwtService.verifyRefreshToken(refreshToken);

      if (!payload) {
        throw new Error('Refresh token inválido o expirado');
      }

      // Verificar que el usuario existe y el token está en su lista
      const user = await this.userRepository.findById(payload.userId);

      if (!user || !user.isActive) {
        throw new Error('Usuario no válido');
      }

      // Verificar que el refresh token está en la lista del usuario
      if (!user.refreshTokens.includes(refreshToken)) {
        SecurityLogger.logSecurityEvent(
          'Refresh token not found in user list - possible token theft',
          'critical',
          { userId: user.id, ip: requestIp }
        );
        throw new Error('Token de refresco no válido');
      }

      // Generar nuevo par de tokens
      const newTokens = this.jwtService.generateTokenPair(user);

      // Remover token viejo y agregar nuevo
      await this.userRepository.removeRefreshToken(user.id!, refreshToken);
      await this.userRepository.addRefreshToken(user.id!, newTokens.refreshToken);

      logger.info('Tokens refrescados', { userId: user.id });

      return newTokens;
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'Token refresh failed',
        'medium',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      throw error;
    }
  }

  /**
   * Cerrar sesión
   */
  async logout(
    userId: string,
    refreshToken: string,
    requestIp: string
  ): Promise<void> {
    try {
      await this.userRepository.removeRefreshToken(userId, refreshToken);

      await this.auditRepository.create({
        eventType: AuditEventType.LOGOUT,
        severity: AuditSeverity.INFO,
        userId,
        ipAddress: requestIp,
        timestamp: new Date(),
        successful: true,
      });

      logger.info('Usuario cerró sesión', { userId });
    } catch (error) {
      logger.error('Error en logout', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Actualizar usuario
   */
  async updateUser(
    userId: string,
    userData: UpdateUserDTO,
    requestingUserId: string,
    requestIp: string
  ): Promise<User> {
    try {
      // Validar datos si están presentes
      if (userData.name) {
        const nameValidation = this.validator.validateName(userData.name);
        if (!nameValidation.isValid) {
          throw new Error(nameValidation.errors.join(', '));
        }
      }

      if (userData.role) {
        const roleValidation = this.validator.validateRole(userData.role);
        if (!roleValidation.isValid) {
          throw new Error(roleValidation.errors.join(', '));
        }
      }

      const updatedUser = await this.userRepository.update(userId, userData);

      if (!updatedUser) {
        throw new Error('Usuario no encontrado');
      }

      await this.auditRepository.create({
        eventType: AuditEventType.USER_UPDATED,
        severity: AuditSeverity.INFO,
        userId: requestingUserId,
        ipAddress: requestIp,
        resource: 'user',
        action: 'update',
        details: {
          targetUserId: userId,
          changes: userData,
        },
        timestamp: new Date(),
        successful: true,
      });

      logger.info('Usuario actualizado', { userId, updatedBy: requestingUserId });

      return updatedUser;
    } catch (error) {
      logger.error('Error al actualizar usuario', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }

  /**
   * Obtener usuario por email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  /**
   * Listar todos los usuarios (con paginación)
   */
  async getAllUsers(page: number = 1, limit: number = 10) {
    return this.userRepository.findAll(page, limit);
  }

  /**
   * Buscar usuarios por rol
   */
  async getUsersByRole(role: UserRole, page: number = 1, limit: number = 10) {
    return this.userRepository.findByRole(role, page, limit);
  }

  /**
   * Crear usuario por admin (sin biometría inicial)
   */
  async createUserByAdmin(
    email: string,
    name: string,
    role: UserRole
  ): Promise<User> {
    try {
      // Validar datos
      const emailValidation = this.validator.validateEmail(email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.errors.join(', '));
      }

      const nameValidation = this.validator.validateName(name);
      if (!nameValidation.isValid) {
        throw new Error(nameValidation.errors.join(', '));
      }

      // Verificar si el email ya existe
      const exists = await this.userRepository.existsByEmail(email);
      if (exists) {
        throw new Error('El email ya está registrado');
      }

      // Crear usuario
      const user = await this.userRepository.create({
        email: email.toLowerCase().trim(),
        name: name.trim(),
        role,
      });

      logger.info('Usuario creado por admin', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return user;
    } catch (error) {
      logger.error('Error al crear usuario por admin', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw error;
    }
  }

  /**
   * Eliminar usuario
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      await this.userRepository.delete(userId);

      logger.info('Usuario eliminado', {
        userId,
        email: user.email,
      });
    } catch (error) {
      logger.error('Error al eliminar usuario', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }
}
