import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import { config } from '../../config';
import { IUserRepository } from '../interfaces/IUserRepository';
import logger, { SecurityLogger } from '../../utils/logger';
import { User } from '../../domain/entities/User';

/**
 * Servicio de Autenticación Biométrica WebAuthn
 * 
 * NO almacena datos biométricos en el servidor
 * Los datos biométricos permanecen en el dispositivo del usuario
 * Solo gestiona credenciales criptográficas públicas
 * 
 * Patrón de Diseño: Service Layer Pattern
 * Principio SOLID: Single Responsibility - Solo gestiona autenticación WebAuthn
 * Principio SOLID: Dependency Inversion - Depende de IUserRepository (abstracción)
 */

export interface RegistrationChallenge {
  challenge: string;
  options: any;
  userId: string;
}

export interface AuthenticationChallenge {
  challenge: string;
  options: any;
}

/**
 * Almacenamiento temporal de challenges
 * En producción, usar Redis para escalabilidad
 */
class ChallengeStore {
  private challenges: Map<string, { challenge: string; timestamp: number }> = new Map();
  private readonly CHALLENGE_TIMEOUT = 5 * 60 * 1000; // 5 minutos

  set(key: string, challenge: string): void {
    this.challenges.set(key, {
      challenge,
      timestamp: Date.now(),
    });

    // Limpiar challenges expirados
    this.cleanup();
  }

  get(key: string): string | undefined {
    const data = this.challenges.get(key);
    if (!data) return undefined;

    // Verificar si expiró
    if (Date.now() - data.timestamp > this.CHALLENGE_TIMEOUT) {
      this.challenges.delete(key);
      return undefined;
    }

    return data.challenge;
  }

  delete(key: string): void {
    this.challenges.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.challenges.entries()) {
      if (now - data.timestamp > this.CHALLENGE_TIMEOUT) {
        this.challenges.delete(key);
      }
    }
  }
}

export class WebAuthnService {
  private challengeStore: ChallengeStore;

  constructor(private userRepository: IUserRepository) {
    this.challengeStore = new ChallengeStore();
    logger.info('WebAuthn Service inicializado');
  }

  /**
   * Generar opciones para registro de credencial biométrica
   * Paso 1 del flujo de registro WebAuthn
   */
  async generateRegistrationOptions(user: User): Promise<RegistrationChallenge> {
    try {
      SecurityLogger.logSecurityEvent(
        'WebAuthn registration options generated',
        'low',
        { userId: user.id }
      );

      const options = await generateRegistrationOptions({
        rpName: config.webauthn.rpName,
        rpID: config.webauthn.rpID,
        userID: user.id || '',
        userName: user.email,
        userDisplayName: user.name,
        timeout: config.webauthn.timeout,
        attestationType: 'none', // 'direct' para dispositivos específicos
        
        // Excluir credenciales existentes para evitar duplicados
        excludeCredentials: user.webAuthnCredentials.map((cred) => ({
          id: cred.credentialID,
          type: 'public-key',
          transports: cred.transports,
        })),

        authenticatorSelection: {
          // Autenticador de plataforma (huella, Face ID, Windows Hello)
          // o autenticador roaming (YubiKey, etc.)
          authenticatorAttachment: 'platform', // 'cross-platform' para llaves USB
          userVerification: 'required', // Requiere biometría o PIN
          residentKey: 'preferred', // Permite autenticación sin nombre de usuario
        },

        supportedAlgorithmIDs: [-7, -257], // ES256 y RS256
      });

      // Almacenar challenge temporalmente
      this.challengeStore.set(
        `registration:${user.id}`,
        options.challenge
      );

      return {
        challenge: options.challenge,
        options,
        userId: user.id || '',
      };
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'Error generating WebAuthn registration options',
        'high',
        {
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      throw new Error('Error al generar opciones de registro biométrico');
    }
  }

  /**
   * Verificar respuesta de registro de credencial biométrica
   * Paso 2 del flujo de registro WebAuthn
   */
  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    deviceName?: string
  ): Promise<{ verified: boolean; user?: User }> {
    try {
      // Recuperar challenge almacenado
      const expectedChallenge = this.challengeStore.get(`registration:${userId}`);

      if (!expectedChallenge) {
        SecurityLogger.logSecurityEvent(
          'Invalid or expired registration challenge',
          'medium',
          { userId }
        );
        return { verified: false };
      }

      // Verificar la respuesta del autenticador
      let verification: VerifiedRegistrationResponse;

      try {
        verification = await verifyRegistrationResponse({
          response,
          expectedChallenge,
          expectedOrigin: config.webauthn.expectedOrigin,
          expectedRPID: config.webauthn.rpID,
          requireUserVerification: true, // Requiere biometría
        });
      } catch (error) {
        SecurityLogger.logSecurityEvent(
          'WebAuthn registration verification failed',
          'medium',
          {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        );
        return { verified: false };
      }

      const { verified, registrationInfo } = verification;

      if (!verified || !registrationInfo) {
        return { verified: false };
      }

      // Almacenar credencial en el usuario
      // IMPORTANTE: No almacenamos datos biométricos, solo la clave pública
      const { credentialPublicKey, credentialID, counter } = registrationInfo;

      const updatedUser = await this.userRepository.addWebAuthnCredential(
        userId,
        {
          credentialID: Buffer.from(credentialID),
          credentialPublicKey: Buffer.from(credentialPublicKey),
          counter,
          transports: response.response.transports,
          deviceName: deviceName || 'Dispositivo sin nombre',
        }
      );

      // Limpiar challenge usado
      this.challengeStore.delete(`registration:${userId}`);

      SecurityLogger.logSecurityEvent(
        'WebAuthn registration successful',
        'low',
        { userId, deviceName }
      );

      return {
        verified: true,
        user: updatedUser || undefined,
      };
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'Error verifying WebAuthn registration',
        'high',
        {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      throw new Error('Error al verificar registro biométrico');
    }
  }

  /**
   * Generar opciones para autenticación biométrica
   * Paso 1 del flujo de autenticación WebAuthn
   */
  async generateAuthenticationOptions(
    email?: string
  ): Promise<AuthenticationChallenge> {
    try {
      let allowCredentials: any[] = [];

      // Si se proporciona email, obtener credenciales del usuario
      if (email) {
        const user = await this.userRepository.findByEmail(email);
        if (user && user.webAuthnCredentials.length > 0) {
          allowCredentials = user.webAuthnCredentials.map((cred) => ({
            id: cred.credentialID,
            type: 'public-key',
            transports: cred.transports,
          }));
        }
      }

      const options = await generateAuthenticationOptions({
        rpID: config.webauthn.rpID,
        timeout: config.webauthn.timeout,
        userVerification: 'required',
        
        // Si no hay credenciales específicas, permite cualquier credencial del RP
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      });

      // Almacenar challenge
      const challengeKey = email
        ? `authentication:${email}`
        : `authentication:anonymous:${options.challenge}`;

      this.challengeStore.set(challengeKey, options.challenge);

      SecurityLogger.logSecurityEvent(
        'WebAuthn authentication options generated',
        'low',
        { email: email || 'anonymous' }
      );

      return {
        challenge: options.challenge,
        options,
      };
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'Error generating WebAuthn authentication options',
        'high',
        {
          email,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      throw new Error('Error al generar opciones de autenticación biométrica');
    }
  }

  /**
   * Verificar respuesta de autenticación biométrica
   * Paso 2 del flujo de autenticación WebAuthn
   */
  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    email?: string
  ): Promise<{ verified: boolean; user?: User }> {
    try {
      // Recuperar challenge
      const challengeKey = email
        ? `authentication:${email}`
        : `authentication:anonymous:${response.response.clientDataJSON}`;

      let expectedChallenge = this.challengeStore.get(challengeKey);

      // Si no se encuentra con email, intentar búsqueda alternativa
      if (!expectedChallenge && !email) {
        // Intentar extraer del clientDataJSON (fallback)
        const clientData = JSON.parse(
          Buffer.from(response.response.clientDataJSON, 'base64').toString()
        );
        expectedChallenge = this.challengeStore.get(
          `authentication:anonymous:${clientData.challenge}`
        );
      }

      if (!expectedChallenge) {
        SecurityLogger.logSecurityEvent(
          'Invalid or expired authentication challenge',
          'medium',
          { email }
        );
        return { verified: false };
      }

      // Buscar usuario por credencial ID
      const user = await this.findUserByCredentialId(
        Buffer.from(response.id, 'base64url')
      );

      if (!user) {
        SecurityLogger.logSecurityEvent(
          'User not found for credential',
          'medium',
          { credentialId: response.id }
        );
        return { verified: false };
      }

      // Obtener credencial del usuario
      const credential = user.webAuthnCredentials.find(
        (cred) => Buffer.from(cred.credentialID).toString('base64url') === response.id
      );

      if (!credential) {
        return { verified: false };
      }

      // Verificar la respuesta de autenticación
      let verification: VerifiedAuthenticationResponse;

      try {
        verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge,
          expectedOrigin: config.webauthn.expectedOrigin,
          expectedRPID: config.webauthn.rpID,
          authenticator: {
            credentialID: credential.credentialID,
            credentialPublicKey: credential.credentialPublicKey,
            counter: credential.counter,
          },
          requireUserVerification: true,
        });
      } catch (error) {
        SecurityLogger.logSecurityEvent(
          'WebAuthn authentication verification failed',
          'medium',
          {
            userId: user.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        );
        return { verified: false };
      }

      const { verified, authenticationInfo } = verification;

      if (!verified) {
        return { verified: false };
      }

      // Actualizar contador (prevención de ataques de replay)
      await this.userRepository.updateWebAuthnCounter(
        user.id!,
        credential.credentialID,
        authenticationInfo.newCounter
      );

      // Limpiar challenge usado
      this.challengeStore.delete(challengeKey);

      SecurityLogger.logSecurityEvent(
        'WebAuthn authentication successful',
        'low',
        { userId: user.id }
      );

      return {
        verified: true,
        user,
      };
    } catch (error) {
      SecurityLogger.logSecurityEvent(
        'Error verifying WebAuthn authentication',
        'high',
        {
          email,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      throw new Error('Error al verificar autenticación biométrica');
    }
  }

  /**
   * Buscar usuario por credencial ID
   * Helper privado
   */
  private async findUserByCredentialId(
    credentialID: Buffer
  ): Promise<User | null> {
    // En una implementación real, se debería tener un índice en la BD
    // Por ahora, buscamos iterando (no óptimo para producción a gran escala)
    const users = await this.userRepository.findAll(1, 1000);

    for (const user of users.users) {
      const hasCredential = user.webAuthnCredentials.some(
        (cred) => Buffer.compare(cred.credentialID, credentialID) === 0
      );

      if (hasCredential) {
        return user;
      }
    }

    return null;
  }
}
