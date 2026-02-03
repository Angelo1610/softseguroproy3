import React, { useState } from 'react';
import authService from '../../services/authService';

interface SetupProps {
  onSetupComplete: () => void;
}

export const InitialSetup: React.FC<SetupProps> = ({ onSetupComplete }) => {
  const [email] = useState('admin@biometric-auth.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegisterBiometric = async () => {
    setLoading(true);
    setError(null);

    try {
      // Usar el endpoint especial para registro inicial de admin
      const response = await authService.registerInitialAdmin(email);
      
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          onSetupComplete();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error en registro:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Error al registrar credencial biométrica'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="max-w-md w-full bg-white shadow-2xl rounded-lg p-8" role="main" aria-labelledby="setup-heading">
        <div className="text-center mb-8">
          <h1 id="setup-heading" className="text-3xl font-bold text-gray-900 mb-2">
            🔐 Configuración Inicial
          </h1>
          <p className="text-gray-600">
            Sistema de Autenticación Biométrica
          </p>
        </div>

        {!success ? (
          <>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6" role="status">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Bienvenido al sistema. Necesitas registrar tu credencial biométrica (Face ID, Touch ID o Windows Hello) para continuar.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Usuario Administrador
                </label>
                <input
                  type="email"
                  id="admin-email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  aria-label="Correo electrónico del administrador"
                  aria-readonly="true"
                />
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4" role="alert">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Importante:</strong> Asegúrate de tener configurado Face ID, Touch ID o Windows Hello en tu dispositivo antes de continuar.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4" role="alert" aria-live="assertive">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleRegisterBiometric}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                aria-label="Registrar credencial biométrica"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                    <span>Registrar Biometría</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                ¿Cómo funciona?
              </h3>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Haz clic en "Registrar Biometría"</li>
                <li>Tu dispositivo solicitará Face ID, Touch ID o PIN</li>
                <li>La credencial se guardará de forma segura</li>
                <li>¡Listo! Podrás iniciar sesión con reconocimiento facial o huella</li>
              </ol>
            </div>
          </>
        ) : (
          <div className="text-center py-8" role="status" aria-live="polite">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Configuración Completada!
            </h3>
            <p className="text-gray-600">
              Redirigiendo al inicio de sesión...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
