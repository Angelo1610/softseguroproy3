import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import apiClient from './apiClient';
import {
  User,
  LoginResponse,
  ApiResponse,
  BiometricOptions,
} from '../types';

/**
 * Servicio de Autenticación
 * Gestiona todo el flujo de autenticación biométrica WebAuthn
 */

class AuthService {
  /**
   * Iniciar sesión con biometría
   */
  async loginWithBiometric(email?: string): Promise<LoginResponse> {
    try {
      // Paso 1: Obtener opciones de autenticación del servidor
      const optionsResponse: ApiResponse<BiometricOptions> = await apiClient.post(
        '/auth/biometric/login/start',
        { email }
      );

      if (!optionsResponse.success || !optionsResponse.data) {
        throw new Error('Error al obtener opciones de autenticación');
      }

      // Paso 2: Usar WebAuthn del navegador para autenticación biométrica
      const authResponse = await startAuthentication(optionsResponse.data.options);

      // Paso 3: Enviar respuesta al servidor para verificación
      const loginResponse: LoginResponse = await apiClient.post(
        '/auth/biometric/login/complete',
        {
          response: authResponse,
          email,
        }
      );

      if (loginResponse.success && loginResponse.data) {
        // Guardar access token
        apiClient.setAccessToken(loginResponse.data.accessToken);
        return loginResponse;
      }

      throw new Error(loginResponse.message || 'Error de autenticación');
    } catch (error) {
      console.error('Error en login biométrico:', error);
      throw error;
    }
  }

  /**
   * Registrar credencial biométrica para usuario autenticado
   */
  async registerBiometric(deviceName?: string): Promise<ApiResponse> {
    try {
      // Paso 1: Obtener opciones de registro del servidor
      const optionsResponse: ApiResponse<BiometricOptions> = await apiClient.post(
        '/auth/biometric/register/start'
      );

      if (!optionsResponse.success || !optionsResponse.data) {
        throw new Error('Error al obtener opciones de registro');
      }

      // Paso 2: Usar WebAuthn del navegador para registrar biometría
      const registrationResponse = await startRegistration(
        optionsResponse.data.options
      );

      // Paso 3: Enviar respuesta al servidor
      const completeResponse: ApiResponse = await apiClient.post(
        '/auth/biometric/register/complete',
        {
          response: registrationResponse,
          deviceName: deviceName || `Dispositivo ${new Date().toLocaleDateString()}`,
        }
      );

      return completeResponse;
    } catch (error) {
      console.error('Error en registro biométrico:', error);
      throw error;
    }
  }

  /**
   * Registrar credencial biométrica para admin inicial (sin autenticación previa)
   */
  async registerInitialAdmin(email: string, deviceName?: string): Promise<ApiResponse> {
    try {
      // Paso 1: Obtener opciones de registro del servidor
      const optionsResponse: ApiResponse<BiometricOptions> = await apiClient.post(
        '/auth/biometric/register/initial',
        { email }
      );

      if (!optionsResponse.success || !optionsResponse.data) {
        throw new Error('Error al obtener opciones de registro');
      }

      // Paso 2: Usar WebAuthn del navegador para registrar biometría
      const registrationResponse = await startRegistration(
        optionsResponse.data.options
      );

      // Paso 3: Enviar respuesta al servidor
      const completeResponse: ApiResponse = await apiClient.post(
        '/auth/biometric/register/initial',
        {
          email,
          response: registrationResponse,
          deviceName: deviceName || `Dispositivo ${new Date().toLocaleDateString()}`,
        }
      );

      return completeResponse;
    } catch (error) {
      console.error('Error en registro biométrico inicial:', error);
      throw error;
    }
  }

  /**
   * Obtener información del usuario autenticado
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response: ApiResponse<User> = await apiClient.get('/auth/me');

      if (!response.success || !response.data) {
        throw new Error('Error al obtener información del usuario');
      }

      return response.data;
    } catch (error) {
      console.error('Error al obtener usuario actual:', error);
      throw error;
    }
  }

  /**
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
      apiClient.clearTokens();
    } catch (error) {
      console.error('Error en logout:', error);
      // Limpiar tokens aunque falle la petición
      apiClient.clearTokens();
    }
  }

  /**
   * Verificar si el navegador soporta WebAuthn
   */
  isBiometricSupported(): boolean {
    return (
      window.PublicKeyCredential !== undefined &&
      navigator.credentials !== undefined
    );
  }

  /**
   * Verificar si hay credenciales de plataforma disponibles
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isBiometricSupported()) {
      return false;
    }

    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.error('Error al verificar autenticador de plataforma:', error);
      return false;
    }
  }
}

export const authService = new AuthService();
export default authService;
