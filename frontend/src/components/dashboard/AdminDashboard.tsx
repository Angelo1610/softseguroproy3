import React, { useState, useEffect } from 'react';
import userService, { CreateUserData } from '../../services/userService';
import { User } from '../../types';

/**
 * Dashboard de Administrador
 * Gestión completa de usuarios del sistema
 */

interface AdminDashboardProps {
  currentUser: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    name: '',
    role: 'client',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Filtrar usuarios según búsqueda
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.email.toLowerCase().includes(query) ||
            user.name.toLowerCase().includes(query) ||
            user.role.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedUsers = await userService.getAllUsers();
      setUsers(fetchedUsers);
      setFilteredUsers(fetchedUsers);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await userService.createUser(formData);
      setFormData({ email: '', name: '', role: 'client' });
      setShowCreateForm(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear usuario');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setError(null);
      await userService.updateUser(editingUser.id!, {
        name: formData.name,
        role: formData.role,
      });
      setEditingUser(null);
      setFormData({ email: '', name: '', role: 'client' });
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar usuario');
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({ email: '', name: '', role: 'client' });
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setError(null);
      await userService.deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2" aria-label="Título del panel">
          Panel de Administrador
        </h1>
        <p className="text-gray-600">
          Bienvenido, <strong>{currentUser.name}</strong>
        </p>
      </div>

      {/* Search and Create */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex-1">
            <label htmlFor="search-users" className="sr-only">
              Buscar usuarios
            </label>
            <input
              type="text"
              id="search-users"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, email o rol..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              aria-label="Buscar usuarios por nombre, email o rol"
            />
          </div>
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setEditingUser(null);
              setFormData({ email: '', name: '', role: 'client' });
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
            aria-label="Crear nuevo usuario"
          >
            + Nuevo Usuario
          </button>
        </div>

        {/* Create/Edit Form */}
        {(showCreateForm || editingUser) && (
          <form
            onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
            className="bg-gray-50 p-4 rounded-lg mb-4 border-2 border-blue-200"
            aria-label={editingUser ? "Formulario de edición de usuario" : "Formulario de creación de usuario"}
          >
            <h3 className="text-lg font-semibold mb-4">
              {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="user-email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUser}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900"
                  required
                  aria-label="Correo electrónico del usuario"
                  aria-required="true"
                />
              </div>
              <div>
                <label htmlFor="user-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  id="user-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                  aria-label="Nombre completo del usuario"
                  aria-required="true"
                />
              </div>
              <div>
                <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  id="user-role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'client' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  aria-label="Rol del usuario en el sistema"
                >
                  <option value="client">Cliente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                aria-label={editingUser ? "Guardar cambios del usuario" : "Crear usuario"}
              >
                {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  cancelEdit();
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                aria-label="Cancelar operación"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded" role="alert">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Usuarios del Sistema ({filteredUsers.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600" role="status" aria-live="polite">Cargando usuarios...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500" role="status">
            No se encontraron usuarios
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" aria-label="Tabla de usuarios del sistema">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Registro
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                        aria-label={`Rol: ${user.role}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => startEdit(user)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        aria-label={`Editar usuario ${user.name}`}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id!, user.name)}
                        className="text-red-600 hover:text-red-900"
                        aria-label={`Eliminar usuario ${user.name}`}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
