import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { AuditRepository } from '../../infrastructure/repositories/AuditRepository';
import { AuthService } from '../../application/services/AuthService';
import {
  authenticate,
  authorize,
} from '../middleware/authMiddleware';
import { UserRole } from '../../domain/entities/User';

/**
 * Rutas de Autenticación
 * Patrón de Diseño: Dependency Injection
 * - Las dependencias se inyectan a los controladores
 */

const router = Router();

// Instanciar dependencias
const userRepository = new UserRepository();
const auditRepository = new AuditRepository();
const authService = new AuthService(userRepository, auditRepository);
const authController = new AuthController(authService);

/**
 * Rutas públicas (no requieren autenticación)
 */

// Registro inicial de admin (solo para primer setup)
router.post(
  '/biometric/register/initial',
  // loginRateLimiter, // Deshabilitado temporalmente para desarrollo
  (req, res, next) => {
    // Si tiene 'response' en el body, es el paso de completar
    if (req.body.response) {
      return authController.completeInitialAdminBiometricRegistration(req, res, next);
    }
    // Si solo tiene 'email', es el paso de inicio
    return authController.initialAdminBiometricRegistration(req, res, next);
  }
);

// Iniciar autenticación biométrica
router.post(
  '/biometric/login/start',
  // loginRateLimiter, // Deshabilitado temporalmente para desarrollo
  (req, res, next) => authController.startBiometricLogin(req, res, next)
);

// Completar autenticación biométrica
router.post(
  '/biometric/login/complete',
  // loginRateLimiter, // Deshabilitado temporalmente para desarrollo
  (req, res, next) => authController.completeBiometricLogin(req, res, next)
);

// Refrescar tokens
router.post(
  '/refresh',
  (req, res, next) => authController.refreshTokens(req, res, next)
);

/**
 * Rutas protegidas (requieren autenticación)
 */

// Registrar nuevo usuario (solo admin)
router.post(
  '/register',
  authenticate,
  authorize(UserRole.ADMIN),
  (req, res, next) => authController.register(req, res, next)
);

// Iniciar registro de credencial biométrica
router.post(
  '/biometric/register/start',
  authenticate,
  (req, res, next) => authController.startBiometricRegistration(req, res, next)
);

// Completar registro de credencial biométrica
router.post(
  '/biometric/register/complete',
  authenticate,
  (req, res, next) => authController.completeBiometricRegistration(req, res, next)
);

// Obtener información del usuario autenticado
router.get(
  '/me',
  authenticate,
  (req, res, next) => authController.getCurrentUser(req, res, next)
);

// Cerrar sesión
router.post(
  '/logout',
  authenticate,
  (req, res, next) => authController.logout(req, res, next)
);

export default router;
