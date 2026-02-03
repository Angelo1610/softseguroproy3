import apiClient from './apiClient';
import { ApiResponse, User } from '../types';

/**
 * Servicio de Gestión de Usuarios
 * Maneja operaciones CRUD de usuarios (solo admin)
 */

export interface CreateUserData {
  email: string;
  name: string;
  role: 'admin' | 'client';
}

export interface UpdateUserData {
  name?: string;
  role?: 'admin' | 'client';
}

class UserService {
  /**
   * Obtener todos los usuarios (solo admin)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const response: ApiResponse<any> = await apiClient.get('/users');
      
      if (!response.success || !response.data) {
        throw new Error('Error al obtener usuarios');
      }

      // El backend devuelve un objeto con paginación {users, total, page, totalPages}
      // Extraemos solo el array de usuarios
      return response.data.users || response.data;
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      throw error;
    }
  }

  /**
   * Buscar usuarios por email o nombre
   */
  async searchUsers(query: string): Promise<User[]> {
    try {
      const response: ApiResponse<any> = await apiClient.get(
        `/users/search?q=${encodeURIComponent(query)}`
      );
      
      if (!response.success || !response.data) {
        throw new Error('Error al buscar usuarios');
      }

      // El backend puede devolver paginación
      return response.data.users || response.data;
    } catch (error) {
      console.error('Error al buscar usuarios:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo usuario (solo admin)
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      const response: ApiResponse<any> = await apiClient.post('/users', userData);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al crear usuario');
      }

      return response.data.user || response.data;
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw error;
    }
  }

  /**
   * Actualizar usuario existente (solo admin)
   */
  async updateUser(userId: string, userData: UpdateUserData): Promise<User> {
    try {
      const response: ApiResponse<any> = await apiClient.put(`/users/${userId}`, userData);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al actualizar usuario');
      }

      return response.data.user || response.data;
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw error;
    }
  }

  /**
   * Actualizar perfil propio
   */
  async updateProfile(name: string): Promise<User> {
    try {
      const response: ApiResponse<any> = await apiClient.put('/users/profile', { name });
      
      if (!response.success) {
        throw new Error(response.message || 'Error al actualizar perfil');
      }

      return response.data.user || response.data;
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      throw error;
    }
  }

  /**
   * Eliminar usuario (solo admin)
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const response: ApiResponse = await apiClient.delete(`/users/${userId}`);
      
      if (!response.success) {
        throw new Error('Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
export default userService;
