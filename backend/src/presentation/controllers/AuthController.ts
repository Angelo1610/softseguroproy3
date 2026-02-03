import { Response, NextFunction } from 'express';
import { AuthService } from '../../application/services/AuthService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { UserRole } from '../../domain/entities/User';
import logger from '../../utils/logger';

/**
 * Controlador de Autenticación
 * Capa de Presentación - Maneja peticiones HTTP
 * 
 * Principio SOLID: Single Responsibility
 * - Solo maneja peticiones HTTP relacionadas con autenticación
 * 
 * Principio SOLID: Dependency Inversion
 * - Depende de AuthService (abstracción)
 */

export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /api/v1/auth/register
   * Registrar nuevo usuario (solo admin)
   */
  async register(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const { email, name, role } = req.body;

      if (!email || !name) {
        res.status(400).json({
          success: false,
          message: 'Email y nombre son requeridos',
        });
        return;
      }

      const user = await this.authService.registerUser(
        { email, name, role: role || UserRole.CLIENT },
        req.ip || 'unknown',
        req.user?.userId
      );

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error('Error en registro de usuario', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al registrar usuario',
      });
    }
  }

  /**
   * POST /api/v1/auth/biometric/register/start
   * Iniciar registro de credencial biométrica
   */
  async startBiometricRegistration(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const options = await this.authService.startBiometricRegistration(
        userId,
        req.ip || 'unknown'
      );

      res.status(200).json({
        success: true,
        data: options,
      });
    } catch (error) {
      logger.error('Error al iniciar registro biométrico', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        message: 'Error al iniciar registro biométrico',
      });
    }
  }

  /**
   * POST /api/v1/auth/biometric/register/complete
   * Completar registro de credencial biométrica
   */
  async completeBiometricRegistration(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { response, deviceName } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      if (!response) {
        res.status(400).json({
          success: false,
          message: 'Respuesta de credencial requerida',
        });
        return;
      }

      const user = await this.authService.completeBiometricRegistration(
        userId,
        response,
        deviceName,
        req.ip || 'unknown'
      );

      res.status(200).json({
        success: true,
        message: 'Credencial biométrica registrada exitosamente',
        data: {
          id: user.id,
          email: user.email,
          credentialsCount: user.webAuthnCredentials.length,
        },
      });
    } catch (error) {
      logger.error('Error al completar registro biométrico', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al completar registro biométrico',
      });
    }
  }

  /**
   * POST /api/v1/auth/biometric/login/start
   * Iniciar autenticación biométrica
   */
  async startBiometricLogin(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;

      const options = await this.authService.startBiometricLogin(
        email,
        req.ip || 'unknown'
      );

      res.status(200).json({
        success: true,
        data: options,
      });
    } catch (error) {
      logger.error('Error al iniciar login biométrico', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        message: 'Error al iniciar autenticación biométrica',
      });
    }
  }

  /**
   * POST /api/v1/auth/biometric/login/complete
   * Completar autenticación biométrica
   */
  async completeBiometricLogin(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const { response, email } = req.body;

      if (!response) {
        res.status(400).json({
          success: false,
          message: 'Respuesta de autenticación requerida',
        });
        return;
      }

      const result = await this.authService.completeBiometricLogin(
        response,
        email,
        req.ip || 'unknown',
        req.headers['user-agent']
      );

      // Enviar tokens en cookies httpOnly (más seguro)
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      });

      res.status(200).json({
        success: true,
        message: 'Autenticación exitosa',
        data: {
          accessToken: result.tokens.accessToken,
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
          },
        },
      });
    } catch (error) {
      logger.error('Error al completar login biométrico', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error de autenticación',
      });
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Refrescar tokens de sesión
   */
  async refreshTokens(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token requerido',
        });
        return;
      }

      const tokens = await this.authService.refreshTokens(
        refreshToken,
        req.ip || 'unknown'
      );

      // Actualizar cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      logger.error('Error al refrescar tokens', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(401).json({
        success: false,
        message: 'Error al refrescar sesión',
      });
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Cerrar sesión
   */
  async logout(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (userId && refreshToken) {
        await this.authService.logout(
          userId,
          refreshToken,
          req.ip || 'unknown'
        );
      }

      // Limpiar cookie
      res.clearCookie('refreshToken');

      res.status(200).json({
        success: true,
        message: 'Sesión cerrada exitosamente',
      });
    } catch (error) {
      logger.error('Error en logout', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión',
      });
    }
  }

  /**
   * GET /api/v1/auth/me
   * Obtener información del usuario autenticado
   */
  async getCurrentUser(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const user = await this.authService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      });
    } catch (error) {
      logger.error('Error al obtener usuario actual', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        message: 'Error al obtener información del usuario',
      });
    }
  }

  /**
   * POST /api/v1/auth/biometric/register/initial
   * Registro inicial de biometría para admin (sin autenticación previa)
   * Solo funciona si el usuario es admin y no tiene credenciales
   */
  async initialAdminBiometricRegistration(
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email es requerido',
        });
        return;
      }

      // Buscar usuario admin
      const user = await this.authService.getUserByEmail(email);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        });
        return;
      }

      if (!user.id) {
        res.status(500).json({
          success: false,
          message: 'Error interno: Usuario sin ID',
        });
        return;
      }

      // Verificar que sea admin
      if (user.role !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Esta ruta es solo para administradores',
        });
        return;
      }

      // Verificar que no tenga credenciales ya registradas
      if (user.webAuthnCredentials && user.webAuthnCredentials.length > 0) {
        res.status(400).json({
          success: false,
          message: 'El usuario ya tiene credenciales registradas. Use la ruta de login normal.',
        });
        return;
      }

      // Generar opciones de registro WebAuthn
      const options = await this.authService.startBiometricRegistration(
        user.id as string, // ID ya validado arriba
        req.ip || 'unknown'
      );

      res.status(200).json({
        success: true,
        data: options,
      });
    } catch (error) {
      logger.error('Error en registro inicial de admin', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al generar opciones de registro',
      });
    }
  }

  /**
   * Completar registro biométrico inicial para admin
   */
  async completeInitialAdminBiometricRegistration(
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const { email, response: registrationResponse, deviceName } = req.body;

      if (!email || !registrationResponse) {
        res.status(400).json({
          success: false,
          message: 'Email y respuesta de registro son requeridos',
        });
        return;
      }

      // Buscar usuario admin
      const user = await this.authService.getUserByEmail(email);

      if (!user || !user.id) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        });
        return;
      }

      // Verificar que sea admin
      if (user.role !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Esta ruta es solo para administradores',
        });
        return;
      }

      // Completar el registro
      const updatedUser = await this.authService.completeBiometricRegistration(
        user.id as string,
        registrationResponse,
        deviceName,
        req.ip || 'unknown'
      );

      res.status(200).json({
        success: true,
        message: 'Credencial biométrica registrada exitosamente',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
          },
        },
      });
    } catch (error) {
      logger.error('Error al completar registro inicial de admin', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al completar registro biométrico',
      });
    }
  }
}


