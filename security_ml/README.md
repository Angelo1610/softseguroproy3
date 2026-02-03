# Security ML Module

Módulo de análisis automático de vulnerabilidades utilizando Machine Learning para código TypeScript/JavaScript.

## 📋 Descripción

Este módulo implementa un sistema de detección de vulnerabilidades basado en Machine Learning que analiza automáticamente el código fuente del proyecto backend para identificar posibles fallos de seguridad.

## 🎯 Características

- ✅ Clasificación binaria: **SEGURO** vs **VULNERABLE**
- ✅ Detección de 5 tipos de vulnerabilidades:
  - NoSQL Injection
  - Command Injection
  - Code Injection
  - Path Traversal
  - Validación Insuficiente de Entradas
- ✅ Análisis automático en Pull Requests
- ✅ Integración con GitHub Actions
- ✅ Notificaciones por Telegram
- ✅ Bloqueo automático de merge si se detectan vulnerabilidades

## 🏗️ Estructura

```
security_ml/
├── patterns_ts.py              # Patrones de vulnerabilidades
├── feature_extraction_ts.py    # Extracción de características
├── train_model.ipynb           # Notebook de entrenamiento
├── train_model.py              # Script de entrenamiento
├── analyze_pr.py               # Análisis de Pull Requests
├── requirements.txt            # Dependencias Python
├── model.joblib               # Modelo entrenado (generado)
├── scaler.joblib              # Scaler (generado)
├── feature_names.joblib       # Nombres de features (generado)
└── model_metadata.json        # Metadata del modelo (generado)
```

## 🚀 Instalación

### 1. Instalar dependencias Python

```bash
cd security_ml
pip install -r requirements.txt
```

### 2. Entrenar el modelo

Opción A: Usando Jupyter Notebook
```bash
jupyter notebook train_model.ipynb
```

Opción B: Usando el script Python
```bash
python train_model.py
```

Esto generará:
- `model.joblib` - Modelo entrenado
- `scaler.joblib` - Escalador de características
- `feature_names.joblib` - Nombres de características
- `model_metadata.json` - Metadatos del modelo

## 📊 Características Extraídas

### Tokens del código
- Número de líneas
- Longitud del código
- Número de imports

### Llamadas peligrosas
- `exec`, `execSync`, `spawn`, `spawnSync`
- `eval`, `new Function()`
- `readFile`, `writeFile`, `unlink`
- `$where`, `updateMany`, `deleteMany`

### Entrada de usuario
- `req.body`, `req.query`, `req.params`

### Sanitización
- `express-validator`
- `express-mongo-sanitize`
- `xss-clean`
- Validadores personalizados

### Seguridad
- `helmet`, `rateLimit`
- `bcrypt`, `jwt`
- Middleware de autenticación/autorización

## 🔍 Uso Manual

### Analizar archivos específicos

```bash
python analyze_pr.py --files backend/src/controllers/UserController.ts
```

### Analizar con integración completa

```bash
python analyze_pr.py \
  --pr-number 42 \
  --repo owner/repo \
  --github-token $GITHUB_TOKEN \
  --telegram-token $TELEGRAM_TOKEN \
  --telegram-chat-id $CHAT_ID \
  --files backend/src/controllers/*.ts
```

## ⚙️ Configuración de GitHub Actions

### 1. Crear secrets en GitHub

En tu repositorio GitHub, ve a `Settings > Secrets and variables > Actions` y agrega:

- `TELEGRAM_BOT_TOKEN`: Token del bot de Telegram (opcional)
- `TELEGRAM_CHAT_ID`: ID del chat de Telegram (opcional)

### 2. El workflow se ejecuta automáticamente

El workflow `security-ml-analysis.yml` se ejecuta automáticamente cuando:
- Se crea un Pull Request a `main` o `develop`
- Se modifican archivos `.ts` o `.js` en `backend/`

## 📈 Métricas del Modelo

El modelo debe cumplir con:
- **F1-Score mínimo**: 0.85
- **Validación cruzada**: 5-fold stratified

Métricas típicas del mejor modelo:
- Accuracy: ~0.90
- Precision: ~0.88
- Recall: ~0.92
- F1-Score: ~0.90

## 🔄 Flujo de Trabajo

1. **Desarrollador** crea un PR con cambios en el backend
2. **GitHub Actions** detecta cambios en archivos `.ts`/`.js`
3. **ML Analyzer** extrae características del código
4. **Modelo** clasifica cada archivo como SEGURO o VULNERABLE
5. Si **VULNERABLE**:
   - ❌ Bloquea el merge
   - 💬 Publica comentario detallado en el PR
   - 🏷️ Agrega etiqueta `security-vulnerability`
   - 📝 Crea issue de seguridad
   - 📱 Envía notificación por Telegram
6. Si **SEGURO**:
   - ✅ Permite continuar con el merge

## 🎓 Dataset de Entrenamiento

El módulo incluye un dataset sintético basado en patrones reales de:
- Código vulnerable documentado en OWASP
- CVEs de Node.js y Express
- Mejores prácticas de seguridad

Para producción, se recomienda entrenar con datasets públicos:
- **Big-Vul**: https://github.com/ZeoVan/MSR_20_Code_vulnerability_CSV_Dataset
- **DiverseVul**: https://github.com/wagner-group/diversevul
- **CVEFixes**: https://github.com/secureIT-project/CVEfixes
- **Juliet Test Suite**: https://samate.nist.gov/SARD/test-suites/112

## 🔧 Personalización

### Agregar nuevos patrones

Edita `patterns_ts.py`:
```python
DANGEROUS_FUNCTIONS = [
    'exec',
    'your_dangerous_function',
    # ...
]
```

### Modificar extracción de características

Edita `feature_extraction_ts.py`:
```python
def extract_custom_feature(code: str) -> int:
    return len(re.findall(r'pattern', code))
```

### Ajustar el modelo

Edita el notebook `train_model.ipynb` para:
- Cambiar hiperparámetros
- Agregar nuevos modelos
- Modificar el threshold de clasificación

## 📝 Tipos de Vulnerabilidades Detectadas

### 1. NoSQL Injection
```typescript
// ❌ VULNERABLE
User.findOne({ username: req.body.username })

// ✅ SEGURO
User.findOne({ username: sanitize(req.body.username) })
```

### 2. Command Injection
```typescript
// ❌ VULNERABLE
exec('ls ' + req.query.dir)

// ✅ SEGURO
// No ejecutar comandos con entrada de usuario
```

### 3. Code Injection
```typescript
// ❌ VULNERABLE
eval(req.body.expression)

// ✅ SEGURO
// No usar eval con entrada de usuario
```

### 4. Path Traversal
```typescript
// ❌ VULNERABLE
readFileSync(req.params.filename)

// ✅ SEGURO
const safePath = path.join(__dirname, path.basename(req.params.filename))
readFileSync(safePath)
```

### 5. Validación Insuficiente
```typescript
// ❌ VULNERABLE
await User.updateOne({ _id: id }, req.body)

// ✅ SEGURO
body('email').isEmail()
await User.updateOne({ _id: id }, { email: req.body.email })
```

## 🐛 Troubleshooting

### El modelo no se carga
```bash
# Verifica que existan los archivos
ls -la *.joblib

# Reentrena el modelo
jupyter nbconvert --to script train_model.ipynb
python train_model.py
```

### Error en GitHub Actions
```yaml
# Verifica que los secrets estén configurados
# Settings > Secrets > Actions
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

### Falsos positivos
```python
# Ajusta el threshold en analyze_pr.py
if probabilities[1] > 0.7:  # En lugar de 0.5
    prediction = 1
```

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [GitHub Actions](https://docs.github.com/en/actions)

## 🤝 Contribuciones

Para mejorar el modelo:
1. Agrega más ejemplos al dataset
2. Mejora la extracción de características
3. Prueba nuevos algoritmos de ML
4. Reporta falsos positivos/negativos

## 📄 Licencia

MIT
