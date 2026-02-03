import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

/**
 * Componente de Login Biométrico
 * Implementa autenticación WebAuthn
 */

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const BiometricLogin: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@biometric-auth.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [platformAuthAvailable, setPlatformAuthAvailable] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    const supported = authService.isBiometricSupported();
    setBiometricSupported(supported);

    if (supported) {
      const available = await authService.isPlatformAuthenticatorAvailable();
      setPlatformAuthAvailable(available);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricSupported) {
      setError('Tu navegador no soporta autenticación biométrica');
      return;
    }

    // Validar que el email no esté vacío
    if (!email || email.trim() === '') {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authService.loginWithBiometric(email);
      
      if (response.success && response.data) {
        onLoginSuccess(response.data.user);
      }
    } catch (err: any) {
      console.error('Error en login:', err);
      const errorMessage = err.response?.data?.message || err.message;
      
      // Manejo especial para rate limiting
      if (err.response?.status === 429) {
        setError('Demasiados intentos. Por favor espera unos minutos antes de intentar nuevamente.');
      } else if (errorMessage?.includes('no tiene credenciales') || errorMessage?.includes('no encontrado')) {
        setError('Este usuario no tiene credenciales biométricas registradas. Si eres admin, contacta al soporte.');
      } else {
        setError(errorMessage || 'Error al iniciar sesión con biometría');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!biometricSupported) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-lg" role="alert" aria-live="polite">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Autenticación Biométrica No Disponible
        </h2>
        <p className="text-red-700">
          Tu navegador no soporta WebAuthn. Por favor, usa un navegador moderno como Chrome, Firefox, Edge o Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center" id="login-heading">
        Iniciar Sesión con Biometría
      </h2>

      {!platformAuthAvailable && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded" role="alert">
          <p className="text-sm text-yellow-800">
            No se detectó autenticador de plataforma. Asegúrate de tener configurada la biometría en tu dispositivo.
          </p>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email del Usuario
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          placeholder="admin@biometric-auth.com"
          disabled={loading}
          aria-label="Correo electrónico del usuario"
          aria-required="true"
          aria-describedby="email-hint"
        />
        <p id="email-hint" className="mt-1 text-xs text-gray-500">
          Usuario admin por defecto: admin@biometric-auth.com
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded" role="alert" aria-live="assertive">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        onClick={handleBiometricLogin}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
        aria-label="Iniciar sesión con Face ID o Touch ID"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Procesando...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Usar Face ID / Touch ID
          </>
        )}
      </button>

      {/* Botón de método alternativo */}
      <button
        onClick={() => navigate('/alternative')}
        disabled={loading}
        className="w-full mt-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors duration-200"
        aria-label="Usar método alternativo de inicio de sesión"
      >
        Usar método alternativo
      </button>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded" role="complementary" aria-label="Información sobre autenticación biométrica">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">
          ¿Cómo funciona?
        </h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>✓ Usa Face ID, Touch ID o Windows Hello</li>
          <li>✓ Tus datos biométricos nunca salen de tu dispositivo</li>
          <li>✓ Autenticación segura sin contraseñas</li>
        </ul>
      </div>
    </div>
  );
};

export default BiometricLogin;
