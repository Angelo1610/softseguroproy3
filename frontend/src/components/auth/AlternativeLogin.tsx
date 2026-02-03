import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';

/**
 * Componente de Login Alternativo (Fallback)
 * Proporciona método alternativo cuando falla la biometría
 */

interface AlternativeLoginProps {
  onLoginSuccess: (user: User) => void;
}

export const AlternativeLogin: React.FC<AlternativeLoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Simular envío de código de verificación
      // En producción, esto llamaría al backend para enviar un código por email
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setMessage('Se ha enviado un código de verificación a tu correo electrónico');
      setStep('code');
    } catch (err) {
      setError('Error al enviar código de verificación');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Simular verificación de código
      // En producción, esto llamaría al backend para verificar el código
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setError('Método alternativo aún no implementado completamente. Por favor, contacte al administrador para habilitar su acceso biométrico.');
    } catch (err) {
      setError('Código de verificación inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-500 to-gray-700 p-4">
      <div className="max-w-md w-full bg-white shadow-2xl rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔐 Método Alternativo
          </h1>
          <p className="text-gray-600">
            {step === 'email' 
              ? 'Ingresa tu correo para recibir un código de verificación'
              : 'Ingresa el código enviado a tu correo'
            }
          </p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg 
                className="h-5 w-5 text-yellow-400" 
                viewBox="0 0 20 20" 
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Nota:</strong> Este método alternativo requiere configuración adicional por parte del administrador del sistema.
              </p>
            </div>
          </div>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleRequestCode}>
            <div className="mb-4">
              <label 
                htmlFor="alt-email" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Correo Electrónico
              </label>
              <input
                type="email"
                id="alt-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 bg-white"
                placeholder="tu@email.com"
                disabled={loading}
                required
                aria-label="Ingresa tu correo electrónico para recibir código de verificación"
                aria-required="true"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded" role="alert">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {message && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded" role="status">
                <p className="text-sm text-green-800">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-md transition-colors duration-200 mb-4"
              aria-label="Enviar código de verificación"
            >
              {loading ? 'Enviando...' : 'Enviar Código'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <div className="mb-4">
              <label 
                htmlFor="verification-code" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Código de Verificación
              </label>
              <input
                type="text"
                id="verification-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 bg-white text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                disabled={loading}
                required
                aria-label="Ingresa el código de verificación de 6 dígitos"
                aria-required="true"
              />
              <p className="mt-1 text-xs text-gray-500">
                Código enviado a {email}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded" role="alert">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-md transition-colors duration-200 mb-4"
              aria-label="Verificar código"
            >
              {loading ? 'Verificando...' : 'Verificar Código'}
            </button>
          </form>
        )}

        <button
          onClick={() => navigate('/login')}
          className="w-full bg-white hover:bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-md border border-gray-300 transition-colors duration-200"
          aria-label="Volver al login biométrico"
        >
          ← Volver al Login Biométrico
        </button>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            ¿Por qué un método alternativo?
          </h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>✓ Acceso cuando la biometría no está disponible</li>
            <li>✓ Dispositivos sin soporte biométrico</li>
            <li>✓ Problemas técnicos temporales</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AlternativeLogin;
