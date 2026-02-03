# Modelado de Amenazas - Sistema de Autenticación Biométrica

## Introducción

Este documento presenta el modelado de amenazas del sistema de autenticación biométrica basado en WebAuthn, siguiendo la metodología STRIDE y organizado en tres niveles de análisis.

---

## Nivel 1: Sistema Completo

### Contexto del Sistema

El sistema es una aplicación web full stack que permite autenticación de usuarios mediante biometría del dispositivo (huella digital, Face ID, Windows Hello, etc.), sin almacenar datos biométricos en el servidor.

### Límites del Sistema

**Componentes internos:**
- Frontend React (SPA)
- Backend API REST
- Base de datos MongoDB
- Autenticador del dispositivo (hardware)

**Componentes externos:**
- Navegadores web (Chrome, Firefox, Safari, Edge)
- Dispositivos biométricos (Touch ID, Face ID, Windows Hello, YubiKey)
- Internet (TLS/HTTPS)

### Amenazas a Nivel de Sistema (STRIDE)

| ID | Amenaza | Tipo | Severidad | Mitigación Implementada |
|----|---------|------|-----------|------------------------|
| S-01 | Suplantación de usuario mediante tokens robados | Spoofing | Alta | Tokens JWT con expiración corta, refresh tokens en cookies httpOnly |
| S-02 | Falsificación de respuestas WebAuthn | Spoofing | Crítica | Verificación de firma criptográfica en servidor, validación de origen |
| T-01 | Modificación de datos en tránsito | Tampering | Alta | HTTPS obligatorio (TLS 1.3), headers de seguridad |
| T-02 | Manipulación de roles en tokens JWT | Tampering | Crítica | Firma digital de JWT, validación en cada petición |
| R-01 | Negación de acciones administrativas | Repudiation | Media | Sistema de auditoría completo con timestamps y IP |
| I-01 | Exposición de credenciales en logs | Info Disclosure | Alta | Sanitización de logs, no loggear datos sensibles |
| I-02 | Fuga de información en mensajes de error | Info Disclosure | Media | Mensajes genéricos en producción |
| D-01 | Ataque de fuerza bruta en login | DoS | Alta | Rate limiting (5 intentos por 15 minutos) |
| D-02 | Sobrecarga del servidor con peticiones | DoS | Media | Rate limiting general, límite de payload |
| E-01 | Escalada de privilegios cliente → admin | Elevation | Crítica | Autorización basada en roles, validación estricta |

---

## Nivel 2: Subsistemas

### 2.1 Subsistema de Autenticación WebAuthn

#### Componentes
- WebAuthn Service (backend)
- WebAuthn API (frontend/navegador)
- Autenticador del dispositivo
- Challenge Store

#### Amenazas Específicas

| ID | Amenaza | Descripción | Mitigación |
|----|---------|-------------|----------|
| A-01 | Replay Attack | Reutilización de respuesta de autenticación | Challenges únicos de 5 min, contador incremental |
| A-02 | Clonación de credenciales | Copia de credenciales a otro dispositivo | Claves privadas en hardware seguro (TPM/Secure Enclave) |
| A-03 | Man-in-the-Middle | Interceptación de comunicación | HTTPS obligatorio, validación de origen |
| A-04 | Challenge Prediction | Predicción de challenges futuros | Generación aleatoria criptográficamente segura |
| A-05 | Phishing de credenciales | Sitio falso solicitando biometría | Validación de RP ID, origin checking |

#### Flujo de Datos Críticos

```
Usuario → Autenticador → Challenge → Firma → Servidor → Verificación
    ↓                                                        ↓
Biometría (local)                                    Clave Pública (DB)
```

**Protecciones:**
- Los datos biométricos NUNCA salen del dispositivo
- Solo se transmite la firma criptográfica
- Verificación de integridad en cada paso

### 2.2 Subsistema de Gestión de Sesiones

#### Componentes
- JWT Service
- Token Store (cookies)
- Middleware de autenticación

#### Amenazas Específicas

| ID | Amenaza | Descripción | Mitigación |
|----|---------|-------------|----------|
| S-01 | Robo de tokens | Extracción de tokens del navegador | httpOnly cookies, SameSite=Strict |
| S-02 | Session Fixation | Fijación de sesión | Regeneración de tokens en login |
| S-03 | Token Reuse | Reutilización de refresh tokens | Lista de tokens válidos en BD, invalidación en logout |
| S-04 | XSS para robo de tokens | Script malicioso extrae tokens | CSP headers, sanitización, no guardar en localStorage |

### 2.3 Subsistema de Autorización

#### Componentes
- Middleware de autorización
- Role Validator
- Permission Check

#### Amenazas Específicas

| ID | Amenaza | Descripción | Mitigación |
|----|---------|-------------|----------|
| E-01 | Bypassing de autorización | Saltar validación de roles | Middleware en todas las rutas protegidas |
| E-02 | Modificación de rol en JWT | Alterar payload del token | Firma digital verificada en servidor |
| E-03 | IDOR (Insecure Direct Object Reference) | Acceso a recursos de otros usuarios | Validación de ownership en cada operación |

---

## Nivel 3: Componentes Individuales

### 3.1 Componente: WebAuthnService

**Responsabilidad:** Generar y verificar credenciales WebAuthn

**Inputs:**
- Usuario autenticado (para registro)
- Respuesta de credencial
- Challenge almacenado

**Outputs:**
- Opciones de registro/autenticación
- Resultado de verificación

**Amenazas:**

| ID | Amenaza | Vector de Ataque | Contramedida |
|----|---------|------------------|--------------|
| W-01 | Challenge timing attack | Medir tiempo de validación para extraer información | Validación en tiempo constante |
| W-02 | Credential overflow | Registrar infinitas credenciales | Límite de credenciales por usuario (ej: 5) |
| W-03 | Invalid attestation | Attestation falsa o manipulada | Verificación estricta de attestation |

### 3.2 Componente: UserRepository

**Responsabilidad:** Persistir y recuperar usuarios

**Inputs:**
- Datos de usuario
- Queries de búsqueda

**Outputs:**
- Objetos User
- Listas paginadas

**Amenazas:**

| ID | Amenaza | Vector de Ataque | Contramedida |
|----|---------|------------------|--------------|
| D-01 | NoSQL Injection | Query manipulation en filtros | Sanitización con express-mongo-sanitize |
| D-02 | Data leakage | Exponer campos sensibles | toJSON transform, select: false en schemas |
| D-03 | Race conditions | Updates concurrentes | Transacciones, optimistic locking |

### 3.3 Componente: AuthMiddleware

**Responsabilidad:** Verificar autenticación y autorización

**Inputs:**
- HTTP Request con header Authorization
- User payload del token

**Outputs:**
- Request enriquecido con user info
- Error 401/403

**Amenazas:**

| ID | Amenaza | Vector de Ataque | Contramedida |
|----|---------|------------------|--------------|
| M-01 | Bypass de middleware | Rutas no protegidas | Aplicar middleware en app.use() general |
| M-02 | Token forgery | Tokens falsos o manipulados | Verificación de firma JWT |
| M-03 | Timing attacks | Deducir información por tiempos de respuesta | Respuestas en tiempo constante |

---

## Análisis de Superficie de Ataque

### Entradas del Sistema (Attack Surface)

1. **APIs públicas:**
   - `/api/v1/auth/biometric/login/*` - Rate limited
   - `/api/v1/auth/register` - Solo admin
   - `/api/v1/auth/refresh` - Validación de refresh token

2. **Datos de usuario:**
   - Email - Validado con regex
   - Nombre - Sanitizado, sin HTML
   - Respuestas WebAuthn - Verificadas criptográficamente

3. **Archivos estáticos:**
   - Frontend React - CSP headers
   - Assets - Servidos con headers seguros

### Salidas del Sistema

1. **Tokens:**
   - Access tokens (15 min)
   - Refresh tokens (7 días, httpOnly)

2. **Datos de usuario:**
   - Información pública (name, email, role)
   - NO se exponen: refreshTokens, failedLoginAttempts

3. **Logs:**
   - Sin datos sensibles
   - Timestamps para auditoría

---

## Controles de Seguridad Implementados

### Preventivos

- ✅ Validación de inputs (express-validator)
- ✅ Sanitización de datos (express-mongo-sanitize, xss-clean)
- ✅ Rate limiting (express-rate-limit)
- ✅ CORS configurado
- ✅ Helmet.js para headers de seguridad
- ✅ CSP (Content Security Policy)
- ✅ HTTPS obligatorio en producción
- ✅ Autenticación basada en JWT
- ✅ Autorización por roles
- ✅ WebAuthn con challenges únicos

### Detectivos

- ✅ Logging de eventos de seguridad (Winston)
- ✅ Sistema de auditoría completo
- ✅ Detección de patrones sospechosos (middleware)
- ✅ Monitoreo de intentos fallidos

### Correctivos

- ✅ Bloqueo automático de cuentas (5 intentos)
- ✅ Expiración automática de sesiones
- ✅ Invalidación de tokens en logout
- ✅ Limpieza de challenges expirados

---

## Escenarios de Ataque y Defensas

### Escenario 1: Ataque de Fuerza Bruta

**Atacante:** Externo no autenticado
**Objetivo:** Obtener acceso mediante múltiples intentos

**Pasos del ataque:**
1. Script automatizado intenta logins masivos
2. Variar emails y credenciales

**Defensas activadas:**
- Rate limiting bloquea después de 5 intentos
- IP bloqueada por 15 minutos
- Logs de seguridad registran el evento
- Cuenta bloqueada si es usuario válido

### Escenario 2: Robo de Token de Sesión

**Atacante:** Interno (XSS)
**Objetivo:** Robar access token

**Pasos del ataque:**
1. Inyectar script malicioso (XSS)
2. Extraer token del cliente

**Defensas activadas:**
- CSP bloquea scripts inline
- Sanitización previene XSS
- Tokens en httpOnly cookies (no accesibles por JS)
- SameSite cookies previenen CSRF

### Escenario 3: Escalada de Privilegios

**Atacante:** Usuario cliente autenticado
**Objetivo:** Acceder a funciones de admin

**Pasos del ataque:**
1. Modificar petición HTTP para endpoints admin
2. Intentar modificar JWT

**Defensas activadas:**
- Middleware de autorización verifica rol
- Firma JWT impide modificación
- Validación en cada endpoint
- Logs de intento no autorizado

---

## Recomendaciones Adicionales

### Corto Plazo (1-3 meses)

1. Implementar Redis para cache de challenges
2. Agregar 2FA de respaldo (TOTP)
3. Implementar CAPTCHA en registro
4. Mejorar monitoreo con herramientas especializadas (Datadog, New Relic)

### Mediano Plazo (3-6 meses)

1. Penetration testing profesional
2. Implementar WAF (Web Application Firewall)
3. Agregar detección de anomalías con ML
4. Implementar honeypots internos

### Largo Plazo (6-12 meses)

1. Certificación de seguridad (ISO 27001)
2. Bug bounty program
3. Cumplimiento GDPR/CCPA completo
4. Zero Trust Architecture

---

## Conclusión

El sistema implementa múltiples capas de seguridad siguiendo las mejores prácticas de OWASP y NIST. La autenticación biométrica mediante WebAuthn elimina los riesgos asociados con contraseñas, mientras que los controles de autorización, auditoría y rate limiting protegen contra amenazas comunes.

La arquitectura en capas y el cumplimiento de principios SOLID facilitan la mantenibilidad y extensibilidad del sistema con nuevas medidas de seguridad.
