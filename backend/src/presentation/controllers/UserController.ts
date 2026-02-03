import { Response, NextFunction } from 'express';
import { AuthService } from '../../application/services/AuthService';
import { IAuditRepository } from '../../application/interfaces/IAuditRepository';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { UserRole } from '../../domain/entities/User';
import logger, { SecurityLogger } from '../../utils/logger';

/**
 * Controlador de Usuarios
 * Gestiona operaciones CRUD de usuarios (solo para admins)
 */

export class UserController {
  constructor(
    private authService: AuthService,
    private auditRepository: IAuditRepository
  ) {}

  /**
   * GET /api/v1/users
   * Listar todos los usuarios (solo admin)
   */
  async getAllUsers(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.authService.getAllUsers(page, limit);

      SecurityLogger.logDataAccess(
        req.user!.userId,
        'list',
        'users'
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error al listar usuarios', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        message: 'Error al obtener lista de usuarios',
      });
    }
  }

  /**
   * GET /api/v1/users/:id
   * Obtener un usuario por ID
   */
  async getUserById(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const user = await this.authService.getUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        });
        return;
      }

      SecurityLogger.logDataAccess(
        req.user!.userId,
        'read',
        `user:${id}`
      );

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      });
    } catch (error) {
      logger.error('Error al obtener usuario', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        message: 'Error al obtener usuario',
      });
    }
  }

  /**
   * PUT /api/v1/users/:id
   * Actualizar un usuario
   */
  async updateUser(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { name, role, isActive } = req.body;

      // Solo admin puede cambiar role e isActive
      const updateData: any = {};
      
      if (name !== undefined) {
        updateData.name = name;
      }

      if (req.user!.role === UserRole.ADMIN) {
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;
      }

      const updatedUser = await this.authService.updateUser(
        id,
        updateData,
        req.user!.userId,
        req.ip || 'unknown'
      );

      res.status(200).json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
        },
      });
    } catch (error) {
      logger.error('Error al actualizar usuario', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al actualizar usuario',
      });
    }
  }

  /**
   * GET /api/v1/users/search
   * Buscar usuarios por rol
   */
  async searchByRole(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const { role } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!role || !Object.values(UserRole).includes(role as UserRole)) {
        res.status(400).json({
          success: false,
          message: 'Rol inválido',
        });
        return;
      }

      const users = await this.authService.getUsersByRole(
        role as UserRole,
        page,
        limit
      );

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      logger.error('Error al buscar usuarios por rol', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        message: 'Error al buscar usuarios',
      });
    }
  }

  /**
   * GET /api/v1/users/:id/audit
   * Obtener logs de auditoría de un usuario
   */
  async getUserAuditLogs(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const logs = await this.auditRepository.findByUserId(id, page, limit);

      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      logger.error('Error al obtener logs de auditoría', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        message: 'Error al obtener logs de auditoría',
      });
    }
  }

  /**
   * POST /api/v1/users
   * Crear nuevo usuario (solo admin)
   */
  async createUser(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const { email, name, role } = req.body;

      // Validaciones
      if (!email || !name) {
        res.status(400).json({
          success: false,
          message: 'Email y nombre son requeridos',
        });
        return;
      }

      if (role && !Object.values(UserRole).includes(role as UserRole)) {
        res.status(400).json({
          success: false,
          message: 'Rol inválido',
        });
        return;
      }

      const newUser = await this.authService.createUserByAdmin(
        email,
        name,
        role || UserRole.CLIENT
      );

      SecurityLogger.logAdminAction(
        req.user!.userId,
        'create_user',
        { targetUserId: newUser.id }
      );

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
        },
      });
    } catch (error) {
      logger.error('Error al crear usuario', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al crear usuario',
      });
    }
  }

  /**
   * DELETE /api/v1/users/:id
   * Eliminar usuario (solo admin)
   */
  async deleteUser(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      // Prevenir auto-eliminación
      if (id === req.user!.userId) {
        res.status(400).json({
          success: false,
          message: 'No puedes eliminarte a ti mismo',
        });
        return;
      }

      await this.authService.deleteUser(id);

      SecurityLogger.logAdminAction(
        req.user!.userId,
        'delete_user',
        { targetUserId: id }
      );

      res.status(200).json({
        success: true,
        message: 'Usuario eliminado exitosamente',
      });
    } catch (error) {
      logger.error('Error al eliminar usuario', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al eliminar usuario',
      });
    }
  }

  /**
   * PUT /api/v1/users/profile
   * Actualizar perfil propio
   */
  async updateProfile(
    req: AuthenticatedRequest,
    res: Response,
    __next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { name } = req.body;

      if (!name || name.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'El nombre es requerido',
        });
        return;
      }

      const updatedUser = await this.authService.updateUser(
        userId,
        { name: name.trim() },
        userId,
        req.ip || 'unknown'
      );

      res.status(200).json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          createdAt: updatedUser.createdAt,
          lastLogin: updatedUser.lastLogin,
        },
      });
    } catch (error) {
      logger.error('Error al actualizar perfil', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al actualizar perfil',
      });
    }
  }
}
