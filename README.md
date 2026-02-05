# Sistema de Login Seguro con Autenticación Biométrica

## 🔐 Descripción

Aplicación web full stack con autenticación biométrica basada en WebAuthn, implementando las mejores prácticas de seguridad según OWASP y NIST.

## 🏗️ Arquitectura

### Arquitectura en Capas

```
┌─────────────────────────────────────┐
│   Capa de Presentación (Frontend)   │
│        React + TypeScript            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Capa de Aplicación (Controllers)  │
│      Express REST API                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Capa de Dominio (Services)        │
│   Lógica de Negocio + Patrones      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Capa de Infraestructura (Data)    │
│   Repositorios + Base de Datos      │
└─────────────────────────────────────┘
```

## 🎯 Características Principales

- ✅ **Autenticación Biométrica**: WebAuthn/FIDO2 (no almacena datos biométricos)
- ✅ **Control de Acceso por Roles**: Admin y Cliente
- ✅ **Principios SOLID**: Implementación estricta
- ✅ **Patrones de Diseño**: Factory, Strategy, Repository, Dependency Injection
- ✅ **Seguridad OWASP**: Protección contra XSS, CSRF, Inyección SQL
- ✅ **Rate Limiting**: Protección contra fuerza bruta
- ✅ **Sesiones Seguras**: JWT con expiración automática
- ✅ **Auditoría**: Logging de eventos de seguridad
- ✅ **Análisis ML de Vulnerabilidades**: Detección automática con Machine Learning
- ✅ **CI/CD Security**: GitHub Actions integrado con análisis automatizado

## 📁 Estructura del Proyecto

```
proyecto-3p/
├── backend/                    # Servidor Node.js/Express
│   ├── src/
│   │   ├── presentation/       # Capa de Presentación
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   └── routes/
│   │   ├── application/        # Capa de Aplicación
│   │   │   ├── dtos/
│   │   │   ├── interfaces/
│   │   │   └── services/
│   │   ├── domain/            # Capa de Dominio
│   │   │   ├── entities/
│   │   │   ├── validators/
│   │   │   └── strategies/
│   │   ├── infrastructure/    # Capa de Infraestructura
│   │   │   ├── database/
│   │   │   ├── repositories/
│   │   │   ├── factories/
│   │   │   └── adapters/
│   │   ├── config/
│   │   ├── utils/
│   │   └── app.ts
│   ├── tests/                 # Pruebas de seguridad
│   │   ├── unit/
│   │   ├── integration/
│   │   └── security/
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # Cliente React
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   ├── client/
│   │   │   └── common/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── contexts/
│   │   ├── utils/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                       # Documentación
│   ├── architecture.md
│   ├── security-analysis.md
│   ├── threat-modeling.md
│   └── diagrams.md
│
├── security_ml/                # Análisis de vulnerabilidades con ML
│   ├── patterns_ts.py          # Patrones de vulnerabilidades
│   ├── feature_extraction_ts.py # Extracción de características
│   ├── train_model.ipynb       # Notebook de entrenamiento
│   ├── train_model.py          # Script de entrenamiento
│   ├── analyze_pr.py           # Análisis de Pull Requests
│   ├── requirements.txt        # Dependencias Python
│   └── README.md               # Documentación del módulo
│
├── .github/
│   └── workflows/
│       └── security-ml-analysis.yml  # CI/CD para análisis ML
│
└── docker-compose.yml
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- MongoDB 6+ (o PostgreSQL 14+)
- Navegador con soporte WebAuthn (Chrome, Firefox, Edge, Safari)

### Instalación

```bash
# Clonar el repositorio
cd "c:\Users\sanch\OneDrive\Documentos\SEPTIMO\software seguro\P3\Proyecto 3P"

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
```

### Configuración

```bash
# Backend - crear archivo .env
cd backend
cp .env.example .env
# Configurar variables de entorno
```

### Ejecución

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

## 🔑 Roles y Permisos

### Rol Admin
- Dashboard administrativo
- Registro de nuevos usuarios
- Asignación de roles
- Búsqueda y edición de usuarios
- Auditoría de eventos de seguridad

### Rol Cliente
- Dashboard personal
- Visualización de perfil
- Edición limitada de datos no sensibles

## 🛡️ Seguridad

### Autenticación Biométrica (WebAuthn)

- **Sin almacenamiento de datos biométricos**: Los datos permanecen en el dispositivo
- **FIDO2 Compliance**: Estándar W3C WebAuthn
- **Fallback seguro**: Método alternativo si falla la biometría
- **Prevención de replay attacks**: Challenges únicos

### Protecciones Implementadas

- **XSS**: Sanitización de entradas, Content Security Policy
- **CSRF**: Tokens CSRF, SameSite cookies
- **Inyección SQL**: Consultas parametrizadas, ORM
- **Rate Limiting**: 5 intentos por 15 minutos
- **Sesiones**: JWT con expiración, refresh tokens seguros
- **HTTPS**: TLS 1.3 obligatorio en producción
- **Headers de Seguridad**: Helmet.js configurado

## 🧪 Pruebas de Seguridad

```bash
# Análisis estático
npm run security:static

# Análisis dinámico
npm run security:dynamic

# Escaneo con IA
npm run security:ai-scan

# Suite completa
npm run security:full
```

## 📊 Principios SOLID Aplicados

- **S** - Single Responsibility: Cada clase tiene una única responsabilidad
- **O** - Open/Closed: Extensible sin modificación
- **L** - Liskov Substitution: Subtipos intercambiables
- **I** - Interface Segregation: Interfaces específicas
- **D** - Dependency Inversion: Depende de abstracciones

## 🎨 Patrones de Diseño

1. **Repository Pattern**: Abstracción de acceso a datos
2. **Factory Pattern**: Creación de objetos complejos
3. **Strategy Pattern**: Algoritmos intercambiables de validación
4. **Dependency Injection**: Inversión de control
5. **Adapter Pattern**: Integración con APIs externas

## 📈 Rendimiento

- Tiempo de respuesta de login: < 2 segundos
- Soporte de usuarios concurrentes: 100+
- Caché de recursos estáticos
- Compresión gzip/brotli

## 🔍 Modelado de Amenazas

Ver documentación completa en [docs/threat-modeling.md](docs/threat-modeling.md)

### Niveles

1. **Sistema**: Amenazas a nivel de aplicación completa
2. **Subsistema**: Amenazas a módulos específicos
3. **Componente**: Amenazas a componentes individuales

## 📝 Licencia

MIT

## 👥 Contribución

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para guías de contribución.

## 📞 Soporte

Para reportar vulnerabilidades de seguridad: security@example.com
/ /   A c t u a l i z a c i � n   p a r a   d e m o s t r a c i � n   d e l   p r o f e s o r   -   2 0 2 6 - 0 2 - 0 3   0 0 : 1 3  
 
// Trigger GitHub Actions - 2026-02-05 12:35:11
