import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { AuditRepository } from '../../infrastructure/repositories/AuditRepository';
import { AuthService } from '../../application/services/AuthService';
import {
  authenticate,
  authorize,
  authorizeOwnerOrAdmin,
} from '../middleware/authMiddleware';
import { UserRole } from '../../domain/entities/User';

/**
 * Rutas de Usuarios
 */

const router = Router();

// Instanciar dependencias
const userRepository = new UserRepository();
const auditRepository = new AuditRepository();
const authService = new AuthService(userRepository, auditRepository);
const userController = new UserController(authService, auditRepository);

/**
 * Todas las rutas de usuarios requieren autenticación
 */
router.use(authenticate);

// Listar todos los usuarios (solo admin)
router.get(
  '/',
  authorize(UserRole.ADMIN),
  (req, res, next) => userController.getAllUsers(req, res, next)
);

// Crear nuevo usuario (solo admin)
router.post(
  '/',
  authorize(UserRole.ADMIN),
  (req, res, next) => userController.createUser(req, res, next)
);

// Actualizar perfil propio
router.put(
  '/profile',
  (req, res, next) => userController.updateProfile(req, res, next)
);

// Buscar usuarios por rol (solo admin)
router.get(
  '/search',
  authorize(UserRole.ADMIN),
  (req, res, next) => userController.searchByRole(req, res, next)
);

// Obtener un usuario por ID (admin o el mismo usuario)
router.get(
  '/:id',
  authorizeOwnerOrAdmin,
  (req, res, next) => userController.getUserById(req, res, next)
);

// Actualizar un usuario (admin o el mismo usuario)
router.put(
  '/:id',
  authorizeOwnerOrAdmin,
  (req, res, next) => userController.updateUser(req, res, next)
);

// Eliminar usuario (solo admin)
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  (req, res, next) => userController.deleteUser(req, res, next)
);

// Obtener logs de auditoría de un usuario (solo admin)
router.get(
  '/:id/audit',
  authorize(UserRole.ADMIN),
  (req, res, next) => userController.getUserAuditLogs(req, res, next)
);

export default router;
