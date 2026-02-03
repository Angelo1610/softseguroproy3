# Diagramas del Sistema - Autenticación Biométrica

## 1. Diagrama de Secuencia - Login Biométrico

```mermaid
sequenceDiagram
    participant U as Usuario
    participant B as Navegador
    participant F as Frontend
    participant API as Backend API
    participant DB as Base de Datos
    participant Auth as Autenticador<br/>(Dispositivo)

    U->>B: Acceder a la aplicación
    B->>F: Cargar página de login
    F->>U: Mostrar botón "Usar Biometría"
    
    U->>F: Click en "Usar Biometría"
    F->>API: POST /auth/biometric/login/start
    API->>API: Generar challenge aleatorio
    API->>DB: Almacenar challenge temporalmente
    API-->>F: Retornar opciones WebAuthn + challenge
    
    F->>B: navigator.credentials.get()
    B->>Auth: Solicitar autenticación
    Auth->>U: Pedir huella/Face ID
    U->>Auth: Proporcionar biometría
    
    Auth-->>B: Firma criptográfica (credencial)
    Note over Auth,B: Los datos biométricos<br/>NUNCA salen del dispositivo
    
    B-->>F: Respuesta firmada
    F->>API: POST /auth/biometric/login/complete<br/>{response, email}
    
    API->>DB: Recuperar challenge almacenado
    API->>API: Verificar firma con clave pública
    API->>DB: Validar credencial del usuario
    API->>API: Verificar contador (anti-replay)
    API->>DB: Actualizar contador de credencial
    
    alt Autenticación exitosa
        API->>API: Generar JWT (access + refresh)
        API->>DB: Guardar refresh token
        API->>DB: Actualizar último login
        API-->>F: {accessToken, refreshToken, user}
        F->>F: Almacenar tokens
        F->>U: Redirigir a Dashboard
    else Autenticación fallida
        API-->>F: Error 401
        F->>U: Mostrar error
    end
```

## 2. Diagrama de Secuencia - Registro de Credencial Biométrica

```mermaid
sequenceDiagram
    participant U as Usuario<br/>(Autenticado)
    participant F as Frontend
    participant API as Backend API
    participant DB as Base de Datos
    participant Auth as Autenticador<br/>(Dispositivo)

    U->>F: Click "Registrar Biometría"
    F->>API: POST /auth/biometric/register/start<br/>Header: Bearer {accessToken}
    
    API->>API: Verificar JWT
    API->>DB: Obtener usuario
    API->>API: Generar challenge + opciones
    API->>DB: Almacenar challenge
    API-->>F: Opciones de registro WebAuthn
    
    F->>Auth: navigator.credentials.create()
    Auth->>U: Solicitar registro de biometría
    U->>Auth: Proporcionar huella/Face ID
    
    Auth->>Auth: Generar par de claves<br/>(pública/privada)
    Auth->>Auth: Almacenar clave privada<br/>en hardware seguro
    Auth-->>F: Clave pública + credentialID
    
    Note over Auth,F: La clave privada y los datos<br/>biométricos permanecen<br/>en el dispositivo
    
    F->>API: POST /auth/biometric/register/complete<br/>{response, deviceName}
    
    API->>DB: Recuperar challenge
    API->>API: Verificar respuesta de attestation
    API->>DB: Guardar credencial pública
    API->>DB: Asociar credencial con usuario
    
    API-->>F: Registro exitoso
    F->>U: Confirmación
```

## 3. Diagrama de Flujo - Autorización por Roles

```mermaid
flowchart TD
    A[Petición HTTP] --> B{¿Tiene Token?}
    B -->|No| C[401 Unauthorized]
    B -->|Sí| D[Verificar JWT]
    
    D --> E{¿Token Válido?}
    E -->|No| C
    E -->|Sí| F[Extraer rol del payload]
    
    F --> G{¿Endpoint requiere<br/>autorización?}
    G -->|No| H[Procesar petición]
    G -->|Sí| I{¿Rol permitido?}
    
    I -->|No| J[403 Forbidden]
    I -->|Sí| K{¿Recurso propio<br/>o es Admin?}
    
    K -->|No| J
    K -->|Sí| H
    
    H --> L[Respuesta exitosa]
    
    C --> M[Log de seguridad]
    J --> M
    M --> N[Auditoría]
```

## 4. Diagrama de Arquitectura del Sistema

```mermaid
graph TB
    subgraph "Cliente - Frontend"
        UI[Interfaz de Usuario<br/>React + TypeScript]
        WA[WebAuthn API<br/>@simplewebauthn/browser]
        ST[State Management<br/>Zustand/Context]
    end
    
    subgraph "Backend - Arquitectura en Capas"
        subgraph "Capa de Presentación"
            MW[Middlewares de Seguridad]
            RT[Rutas/Routes]
            CT[Controladores]
        end
        
        subgraph "Capa de Aplicación"
            SV[Servicios]
            DTO[DTOs]
            IF[Interfaces]
        end
        
        subgraph "Capa de Dominio"
            ENT[Entidades]
            VAL[Validadores]
            STR[Estrategias]
        end
        
        subgraph "Capa de Infraestructura"
            REPO[Repositorios]
            DB[Modelos de BD]
            FACT[Factories]
        end
    end
    
    subgraph "Persistencia"
        MONGO[(MongoDB)]
        REDIS[(Redis<br/>Opcional)]
    end
    
    subgraph "Seguridad"
        HELM[Helmet.js]
        RATE[Rate Limiting]
        CORS[CORS]
        SAN[Sanitización]
    end
    
    UI --> WA
    UI --> ST
    WA --> RT
    ST --> RT
    
    RT --> MW
    MW --> CT
    CT --> SV
    SV --> IF
    IF --> REPO
    
    SV --> VAL
    VAL --> ENT
    
    REPO --> DB
    DB --> MONGO
    
    MW --> HELM
    MW --> RATE
    MW --> CORS
    MW --> SAN
    
    REDIS -.->|Cache/Sessions| SV
```

## 5. Diagrama de Componentes - WebAuthn

```mermaid
graph LR
    subgraph "Cliente"
        A[Usuario] --> B[Navegador]
        B --> C[WebAuthn API]
    end
    
    subgraph "Dispositivo"
        D[Autenticador]
        E[Biometría]
        F[Clave Privada<br/>en Hardware]
    end
    
    subgraph "Servidor"
        G[Backend API]
        H[Verificador WebAuthn]
        I[Base de Datos]
    end
    
    C <-->|1. Solicitar opciones| G
    C <-->|2. Iniciar registro/auth| D
    D <-->|3. Verificar biometría| E
    D -->|4. Firmar con clave privada| F
    D -->|5. Retornar firma| C
    C -->|6. Enviar respuesta| G
    G -->|7. Verificar firma| H
    H <-->|8. Consultar clave pública| I
    
    style E fill:#f9f,stroke:#333,stroke-width:2px
    style F fill:#bbf,stroke:#333,stroke-width:2px
```

## 6. Diagrama de Amenazas - STRIDE

```mermaid
mindmap
  root((Amenazas<br/>del Sistema))
    Spoofing
      Suplantación de identidad
      Falsificación de tokens
      Replay attacks
        Prevención: Challenges únicos
        Prevención: Contadores incrementales
    Tampering
      Modificación de datos en tránsito
        Prevención: HTTPS/TLS
      Manipulación de tokens
        Prevención: Firma JWT
    Repudiation
      Negación de acciones
        Prevención: Logs de auditoría
        Prevención: Timestamps
    Information Disclosure
      Exposición de datos sensibles
        Prevención: No almacenar biometría
        Prevención: Sanitización de logs
    Denial of Service
      Ataques de fuerza bruta
        Prevención: Rate limiting
      Sobrecarga del servidor
        Prevención: Límites de peticiones
    Elevation of Privilege
      Escalada de privilegios
        Prevención: Autorización por roles
        Prevención: Validación de permisos
```

## 7. Diagrama de Flujo - Manejo de Errores de Autenticación

```mermaid
flowchart TD
    A[Intento de Login] --> B[Autenticación Biométrica]
    B --> C{¿Exitosa?}
    
    C -->|Sí| D[Resetear contador de fallos]
    C -->|No| E[Incrementar fallos]
    
    E --> F{¿Fallos >= 5?}
    F -->|No| G[Registrar en auditoría]
    F -->|Sí| H[Bloquear cuenta 15 min]
    
    H --> I[Notificar al usuario]
    I --> J[Registrar evento crítico]
    
    D --> K[Generar tokens]
    K --> L[Actualizar último login]
    L --> M[Registrar login exitoso]
    
    G --> N[Retornar error]
    J --> N
    M --> O[Retornar tokens + usuario]
```

## 8. Diagrama de Componentes - Principios SOLID

```mermaid
graph TD
    subgraph "S - Single Responsibility"
        A1[AuthController]
        A2[UserController]
        A3[AuditController]
    end
    
    subgraph "O - Open/Closed"
        B1[IValidator<br/>Interface]
        B2[EmailValidator]
        B3[NameValidator]
        B4[RoleValidator]
    end
    
    subgraph "L - Liskov Substitution"
        C1[IUserRepository<br/>Interface]
        C2[UserRepository<br/>MongoDB]
        C3[UserRepository<br/>PostgreSQL<br/>Alternativa]
    end
    
    subgraph "I - Interface Segregation"
        D1[IUserRepository]
        D2[IAuditRepository]
        D3[IAuthService]
    end
    
    subgraph "D - Dependency Inversion"
        E1[AuthService] -.->|depende de| E2[IUserRepository]
        E1 -.->|depende de| E3[IAuditRepository]
        E4[UserController] -.->|depende de| E1
    end
    
    B1 --> B2
    B1 --> B3
    B1 --> B4
    
    C1 --> C2
    C1 --> C3
```

---

## Leyenda de Seguridad

- 🔐 **Cifrado**: Datos cifrados en tránsito y reposo
- 🛡️ **Validación**: Entrada validada y sanitizada
- 📝 **Auditoría**: Evento registrado en logs
- ⏱️ **Rate Limit**: Protección contra fuerza bruta
- 🔑 **Autenticación**: Requiere JWT válido
- 👮 **Autorización**: Requiere rol específico
