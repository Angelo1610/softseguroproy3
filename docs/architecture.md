# Guía de Implementación - Sistema de Autenticación Biométrica

## 🚀 Inicio Rápido

### Prerrequisitos

```bash
# Software requerido:
- Node.js 18+ y npm 9+
- MongoDB 6+ (o PostgreSQL 14+ como alternativa)
- Git
- Navegador moderno con soporte WebAuthn (Chrome 67+, Firefox 60+, Safari 13+, Edge 18+)
```

### Instalación

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd "Proyecto 3P"

# 2. Configurar backend
cd backend
npm install
cp .env.example .env
# Editar .env con tus configuraciones

# 3. Configurar frontend
cd ../frontend
npm install

# 4. Iniciar MongoDB
# En Windows:
mongod --dbpath C:\data\db

# En Linux/Mac:
sudo systemctl start mongod
```

### Ejecución en Desarrollo

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Acceder a http://localhost:3000
```

---

## 📋 Configuración Detallada

### Variables de Entorno (Backend)

```env
# Servidor
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Base de Datos
MONGODB_URI=mongodb://localhost:27017/biometric_auth_db

# JWT (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET=<generar-con-openssl-rand-base64-32>
JWT_REFRESH_SECRET=<generar-con-openssl-rand-base64-32>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# WebAuthn
RP_NAME=Biometric Auth System
RP_ID=localhost
EXPECTED_ORIGIN=http://localhost:3000

# Seguridad
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Generar Secretos Seguros

```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))
```

---

## 🔐 Primeros Pasos

### 1. Crear Usuario Admin Inicial

```bash
# Opción 1: Via script (crear este archivo)
node backend/scripts/create-admin.js

# Opción 2: Via API (requiere modificación temporal para permitir primer registro)
POST http://localhost:5000/api/v1/auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "name": "Administrador",
  "role": "admin"
}
```

### 2. Registrar Credencial Biométrica

1. Iniciar sesión como admin
2. Navegar a configuración de cuenta
3. Click en "Registrar Biometría"
4. Seguir las instrucciones del dispositivo

### 3. Crear Usuario Cliente

```bash
POST http://localhost:5000/api/v1/auth/register
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{
  "email": "cliente@example.com",
  "name": "Usuario Cliente",
  "role": "client"
}
```

---

## 🏗️ Arquitectura del Proyecto

### Backend (Arquitectura en Capas)

```
backend/src/
├── presentation/          # Capa de Presentación
│   ├── controllers/       # Controladores HTTP
│   ├── middleware/        # Middlewares de seguridad y auth
│   └── routes/           # Definición de rutas
│
├── application/          # Capa de Aplicación
│   ├── services/         # Lógica de negocio
│   ├── interfaces/       # Interfaces/Contratos
│   └── dtos/            # Data Transfer Objects
│
├── domain/              # Capa de Dominio
│   ├── entities/        # Entidades del negocio
│   ├── validators/      # Validadores de dominio
│   └── strategies/      # Patrones Strategy
│
├── infrastructure/      # Capa de Infraestructura
│   ├── database/        # Conexión y modelos de BD
│   ├── repositories/    # Implementación de repositorios
│   ├── factories/       # Factories para creación de objetos
│   └── adapters/       # Adaptadores a servicios externos
│
├── config/             # Configuración
└── utils/              # Utilidades (logger, etc.)
```

### Principios SOLID Aplicados

#### S - Single Responsibility
- Cada clase tiene una única responsabilidad
- `UserRepository`: Solo maneja persistencia de usuarios
- `AuthService`: Solo maneja autenticación
- `WebAuthnService`: Solo maneja WebAuthn

#### O - Open/Closed
- Extensible mediante interfaces
- `IValidator`: Permite agregar nuevos validadores sin modificar código existente

#### L - Liskov Substitution
- `IUserRepository` puede ser implementado con MongoDB, PostgreSQL, etc.
- Implementaciones intercambiables sin romper el código

#### I - Interface Segregation
- Interfaces específicas: `IUserRepository`, `IAuditRepository`
- Clientes solo dependen de métodos que usan

#### D - Dependency Inversion
- Servicios dependen de interfaces, no de implementaciones concretas
- Inyección de dependencias en controladores

### Patrones de Diseño Implementados

#### 1. Repository Pattern
```typescript
// Abstracción
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  // ...
}

// Implementación
class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    // Implementación con MongoDB
  }
}
```

#### 2. Factory Pattern
```typescript
class ValidatorFactory {
  static createEmailValidator(): IValidator<string> {
    return new EmailValidator();
  }
  // ...
}
```

#### 3. Strategy Pattern
```typescript
interface IValidator<T> {
  validate(data: T): ValidationResult;
}

class EmailValidator implements IValidator<string> {
  validate(email: string): ValidationResult {
    // Estrategia de validación de email
  }
}
```

#### 4. Dependency Injection
```typescript
class AuthService {
  constructor(
    private userRepository: IUserRepository,
    private auditRepository: IAuditRepository
  ) {}
}
```

#### 5. Singleton Pattern
```typescript
class Database {
  private static instance: Database;
  
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
}
```

---

## 🛡️ Seguridad

### Protecciones Implementadas

#### 1. XSS (Cross-Site Scripting)
- Sanitización de inputs con `xss-clean`
- Content Security Policy (CSP) headers
- Validación estricta de datos
- No usar `dangerouslySetInnerHTML` en React

#### 2. CSRF (Cross-Site Request Forgery)
- Cookies con `SameSite=Strict`
- Verificación de origin/referer
- Tokens anti-CSRF (implementar si es necesario)

#### 3. Inyección SQL/NoSQL
- Mongoose (ORM) con queries parametrizadas
- `express-mongo-sanitize` para sanitizar queries
- Validación de tipos de datos

#### 4. Autenticación Segura
- WebAuthn (FIDO2) - sin contraseñas
- JWT con expiración corta (15 min)
- Refresh tokens en cookies httpOnly
- Rate limiting en endpoints de login

#### 5. Autorización
- Basada en roles (Admin/Cliente)
- Middleware de autorización en cada endpoint protegido
- Validación de ownership de recursos

#### 6. Protección de Datos
- **NO se almacenan datos biométricos en servidor**
- Claves privadas permanecen en dispositivo
- Solo se guarda clave pública de credencial
- Hashing de datos sensibles con bcrypt

---

## 🧪 Pruebas

### Ejecutar Pruebas

```bash
# Backend
cd backend

# Todas las pruebas
npm test

# Con cobertura
npm test -- --coverage

# Solo pruebas de seguridad
npm run test:security

# Análisis estático
npm run lint

# Análisis de seguridad con IA
npm run security:ai-scan
```

### Pruebas de Seguridad Manual

```bash
# 1. Intentos de XSS
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","name":"<script>alert(1)</script>"}'

# 2. Inyección NoSQL
curl -X POST http://localhost:5000/api/v1/auth/biometric/login/start \
  -H "Content-Type: application/json" \
  -d '{"email":{"$ne":null}}'

# 3. Rate Limiting
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/v1/auth/biometric/login/start \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com"}'
done
```

---

## 📊 Monitoreo y Auditoría

### Logs de Seguridad

Los logs se almacenan en:
- `backend/logs/combined.log` - Todos los logs
- `backend/logs/error.log` - Solo errores
- `backend/logs/security.log` - Eventos de seguridad

### Eventos de Auditoría

El sistema registra:
- Intentos de login (exitosos y fallidos)
- Registros de usuarios
- Cambios de roles
- Accesos no autorizados
- Actividad sospechosa
- Modificaciones de datos

### Consultar Auditoría

```bash
GET /api/v1/users/:userId/audit
Authorization: Bearer <admin-token>
```

---

## 🚢 Despliegue en Producción

### Checklist de Seguridad

- [ ] Cambiar todos los secretos en `.env`
- [ ] Configurar HTTPS (TLS 1.3)
- [ ] Actualizar `RP_ID` y `EXPECTED_ORIGIN`
- [ ] Configurar firewall
- [ ] Habilitar MongoDB authentication
- [ ] Configurar backups automáticos
- [ ] Implementar monitoreo (Datadog, New Relic)
- [ ] Configurar alertas de seguridad
- [ ] Revisar permisos de archivos
- [ ] Deshabilitar stack traces en errores

### Ejemplo de Configuración HTTPS

```javascript
// app.ts
import https from 'https';
import fs from 'fs';

const httpsOptions = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
};

https.createServer(httpsOptions, app).listen(443);
```

### Variables de Entorno de Producción

```env
NODE_ENV=production
PORT=443

# URLs de producción
RP_ID=tu-dominio.com
EXPECTED_ORIGIN=https://tu-dominio.com
CORS_ORIGIN=https://tu-dominio.com

# Conexión segura a MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority

# Secretos fuertes (mínimo 32 caracteres)
JWT_SECRET=<generar-aleatorio-seguro>
JWT_REFRESH_SECRET=<generar-aleatorio-seguro>
```

---

## 🔄 Flujo de Autenticación WebAuthn

### Registro de Credencial

1. Usuario autenticado solicita registrar biometría
2. Backend genera challenge aleatorio único
3. Frontend llama a `navigator.credentials.create()`
4. Dispositivo solicita biometría al usuario
5. Dispositivo genera par de claves (pública/privada)
6. Clave privada se almacena en hardware seguro (TPM/Secure Enclave)
7. Frontend envía clave pública + credentialID al backend
8. Backend verifica y guarda en base de datos
9. ¡Registro completado!

**Importante:** Los datos biométricos NUNCA salen del dispositivo.

### Autenticación

1. Usuario inicia sesión
2. Backend genera challenge aleatorio
3. Frontend llama a `navigator.credentials.get()`
4. Dispositivo solicita biometría
5. Dispositivo firma challenge con clave privada
6. Frontend envía firma al backend
7. Backend verifica firma con clave pública almacenada
8. Backend valida contador (prevención de replay)
9. Si es válido, genera tokens JWT
10. ¡Autenticación exitosa!

---

## 📚 Referencias

### Estándares y Especificaciones

- [W3C WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [FIDO2 Project](https://fidoalliance.org/fido2/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)

### Documentación de Librerías

- [@simplewebauthn/server](https://simplewebauthn.dev/)
- [@simplewebauthn/browser](https://simplewebauthn.dev/)
- [Express.js](https://expressjs.com/)
- [React](https://react.dev/)
- [Mongoose](https://mongoosejs.com/)

### Herramientas de Seguridad Recomendadas

- [Snyk](https://snyk.io/) - Análisis de vulnerabilidades
- [SonarQube](https://www.sonarqube.org/) - Calidad de código
- [OWASP ZAP](https://www.zaproxy.org/) - Penetration testing
- [Burp Suite](https://portswigger.net/burp) - Security testing

---

## 🐛 Troubleshooting

### Error: "WebAuthn not supported"

**Solución:** Usar navegador moderno (Chrome 67+, Firefox 60+, Safari 13+)

### Error: "No authenticator available"

**Solución:** 
- Verificar que el dispositivo tiene biometría configurada
- En Windows: Configurar Windows Hello
- En Mac: Verificar Touch ID/Face ID

### Error: "Invalid origin"

**Solución:** 
- Verificar que `EXPECTED_ORIGIN` coincide con la URL del frontend
- En desarrollo: `http://localhost:3000`
- En producción: `https://tu-dominio.com`

### Error: "Challenge not found or expired"

**Solución:**
- Los challenges expiran en 5 minutos
- Reiniciar el proceso de login/registro
- Considerar aumentar timeout en producción

---

## 👥 Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Guías de Estilo

- TypeScript con tipos estrictos
- ESLint para linting
- Comentarios JSDoc para funciones públicas
- Commits descriptivos (Conventional Commits)

---

## 📄 Licencia

MIT License - Ver archivo LICENSE para detalles

---

## 📞 Soporte

Para reportar problemas de seguridad: security@example.com

Para bugs y features: Usar GitHub Issues
