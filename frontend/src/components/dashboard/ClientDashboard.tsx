import React, { useState } from 'react';
import userService from '../../services/userService';
import { User } from '../../types';

/**
 * Dashboard de Cliente
 * Perfil y gestión de datos personales
 */

interface ClientDashboardProps {
  currentUser: User;
  onProfileUpdate: (updatedUser: User) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ currentUser, onProfileUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedUser = await userService.updateProfile(name);
      onProfileUpdate(updatedUser);
      setSuccess('Perfil actualizado exitosamente');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(currentUser.name);
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2" aria-label="Título del panel de cliente">
          Mi Perfil
        </h1>
        <p className="text-gray-600">
          Gestiona tu información personal
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center">
                <span className="text-3xl font-bold text-blue-600" aria-label="Inicial del nombre">
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-6">
              <h2 className="text-2xl font-bold text-white">{currentUser.name}</h2>
              <p className="text-blue-100">{currentUser.email}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded" role="alert">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded" role="status">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} aria-label="Formulario de edición de perfil">
              <div className="space-y-4">
                <div>
                  <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                    disabled={loading}
                    aria-label="Nombre completo del usuario"
                    aria-required="true"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Este es el nombre que aparecerá en tu perfil
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    aria-label="Guardar cambios del perfil"
                  >
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:bg-gray-200"
                    aria-label="Cancelar edición"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Información Personal
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                      <p className="text-lg font-medium text-gray-900" aria-label={`Nombre: ${currentUser.name}`}>
                        {currentUser.name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Email</label>
                      <p className="text-lg font-medium text-gray-900" aria-label={`Email: ${currentUser.email}`}>
                        {currentUser.email}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        El email no se puede modificar
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Información de Cuenta
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Rol</label>
                      <span
                        className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800"
                        aria-label={`Rol en el sistema: ${currentUser.role}`}
                      >
                        {currentUser.role === 'admin' ? 'Administrador' : 'Cliente'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Fecha de Registro</label>
                      <p className="text-lg font-medium text-gray-900" aria-label={`Fecha de registro: ${new Date(currentUser.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`}>
                        {new Date(currentUser.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    {currentUser.lastLogin && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Último Acceso</label>
                        <p className="text-lg font-medium text-gray-900" aria-label={`Último acceso: ${new Date(currentUser.lastLogin).toLocaleString('es-ES')}`}>
                          {new Date(currentUser.lastLogin).toLocaleString('es-ES')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  aria-label="Editar información personal"
                >
                  Editar Información
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Seguridad
        </h2>
        <div className="space-y-3">
          <div className="flex items-start">
            <svg
              className="h-6 w-6 text-green-500 mr-3 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-medium text-gray-900">Autenticación Biométrica Activada</h3>
              <p className="text-sm text-gray-500">
                Tu cuenta está protegida con autenticación biométrica
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <svg
              className="h-6 w-6 text-green-500 mr-3 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <div>
              <h3 className="font-medium text-gray-900">Datos Protegidos</h3>
              <p className="text-sm text-gray-500">
                Tus datos biométricos nunca se almacenan en nuestros servidores
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>¿Necesitas ayuda?</strong> Si tienes problemas con tu cuenta o autenticación,
              contacta al administrador del sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
