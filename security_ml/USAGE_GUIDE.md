# Guía de Uso: Sistema de Análisis de Vulnerabilidades con ML

## 📚 Tabla de Contenidos

1. [Instalación y Configuración](#instalación-y-configuración)
2. [Entrenamiento del Modelo](#entrenamiento-del-modelo)
3. [Uso Local](#uso-local)
4. [Configuración de GitHub](#configuración-de-github)
5. [Interpretación de Resultados](#interpretación-de-resultados)
6. [Solución de Problemas](#solución-de-problemas)

---

## 🚀 Instalación y Configuración

### Paso 1: Instalar Dependencias Python

```bash
cd security_ml
pip install -r requirements.txt
```

**Dependencias principales:**
- scikit-learn (Machine Learning)
- pandas, numpy (Análisis de datos)
- xgboost (Clasificador avanzado)
- PyGithub (Integración con GitHub)
- joblib (Serialización de modelos)

### Paso 2: Verificar Instalación

```bash
python -c "import sklearn, pandas, xgboost; print('✅ Dependencias OK')"
```

---

## 🤖 Entrenamiento del Modelo

### Opción 1: Jupyter Notebook (Recomendado)

```bash
jupyter notebook train_model.ipynb
```

**Ventajas:**
- Visualización interactiva
- Gráficos de rendimiento
- Exploración de datos paso a paso

### Opción 2: Script Python

```bash
python train_model.py
```

**Ventajas:**
- Ejecución rápida
- Ideal para CI/CD
- No requiere interfaz gráfica

### Archivos Generados

Después del entrenamiento se crean:

```
security_ml/
├── model.joblib           # Modelo entrenado (Random Forest o XGBoost)
├── scaler.joblib          # Normalizador de características
├── feature_names.joblib   # Nombres de las 28 características
└── model_metadata.json    # Metadatos (F1-Score, fecha, etc.)
```

### Métricas Esperadas

El modelo debe alcanzar **mínimo**:
- **F1-Score**: ≥ 0.85
- **Accuracy**: ≥ 0.80
- **Validación cruzada**: 5-fold

---

## 🔍 Uso Local

### 1. Probar el Modelo

```bash
python test_analyzer.py
```

Esto ejecuta 4 casos de prueba automáticos:
- ✅ NoSQL Injection (VULNERABLE)
- ✅ Código con Validación (SEGURO)
- ✅ Command Injection (VULNERABLE)
- ✅ Código con Helmet (SEGURO)

### 2. Analizar Archivos Específicos

```bash
# Analizar un archivo
python analyze_pr.py --files ../backend/src/controllers/AuthController.ts

# Analizar múltiples archivos
python analyze_pr.py --files \
  ../backend/src/controllers/AuthController.ts \
  ../backend/src/controllers/UserController.ts
```

### 3. Analizar Todo el Backend

```bash
python analyze_pr.py --files ../backend/src/**/*.ts
```

### Salida Esperada

```
🚀 Iniciando análisis de vulnerabilidades...
✅ Modelo cargado: model.joblib
🔍 Analizando: ../backend/src/controllers/AuthController.ts
======================================================================
📊 RESULTADOS DEL ANÁLISIS
======================================================================
Estado general: SEGURO
Archivos analizados: 1
Archivos vulnerables: 0
Archivos seguros: 1
======================================================================
```

---

## ⚙️ Configuración de GitHub

### 1. Configurar Secrets

Ve a tu repositorio en GitHub:

```
Settings > Secrets and variables > Actions > New repository secret
```

**Secrets requeridos:**

| Nombre | Descripción | Ejemplo |
|--------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram | `123456789:ABCdef...` |
| `TELEGRAM_CHAT_ID` | ID del chat/usuario | `987654321` |

**Opcional:** Si no configuras Telegram, el sistema funcionará sin notificaciones.

### 2. Crear Bot de Telegram (Opcional)

```
1. Habla con @BotFather en Telegram
2. Envía: /newbot
3. Sigue las instrucciones
4. Guarda el TOKEN que te da
5. Habla con @userinfobot para obtener tu CHAT_ID
```

### 3. Verificar Workflow

El archivo `.github/workflows/security-ml-analysis.yml` ya está configurado.

**Se ejecuta cuando:**
- Se crea un Pull Request a `main` o `develop`
- Se modifican archivos `.ts` o `.js` en `backend/`

---

## 📊 Interpretación de Resultados

### Resultado: SEGURO ✅

```markdown
## ✅ Análisis de Seguridad - APROBADO

**Resultado**: ✅ Código SEGURO

Se analizaron 3 archivos y no se detectaron vulnerabilidades.
```

**Acción:**
- ✅ El PR puede continuar con el merge
- ✅ No se bloquea el proceso
- ✅ No se crea issue

### Resultado: VULNERABLE ❌

```markdown
## ⚠️ Análisis de Seguridad - VULNERABILIDADES DETECTADAS

**Archivos analizados**: 3
**Archivos vulnerables**: 1
**Archivos seguros**: 2

### 🔴 Vulnerabilidades Encontradas:

#### 📄 `backend/src/controllers/UserController.ts`

- **Tipo**: NoSQL Injection
- **Confianza**: 87.45%
- **Probabilidad de vulnerabilidad**: 87.45%

**Patrones detectados**:
- ⚠️  Uso de req.body sin validación
- ⚠️  Uso de $where en MongoDB
```

**Acción automática:**
- ❌ Bloquea el merge del PR
- 💬 Publica comentario en el PR
- 🏷️ Agrega etiqueta `security-vulnerability`
- 📝 Crea issue de seguridad
- 📱 Envía notificación por Telegram

---

## 🔧 Solución de Problemas

### Error: "No such file: model.joblib"

**Causa:** No se ha entrenado el modelo.

**Solución:**
```bash
cd security_ml
python train_model.py
```

### Error: "ModuleNotFoundError: No module named 'sklearn'"

**Causa:** Dependencias no instaladas.

**Solución:**
```bash
pip install -r requirements.txt
```

### Muchos Falsos Positivos

**Causa:** Threshold muy bajo.

**Solución:** Edita `analyze_pr.py` línea ~140:

```python
# Cambiar de:
prediction = model.predict(features_scaled)[0]

# A:
probabilities = model.predict_proba(features_scaled)[0]
prediction = 1 if probabilities[1] > 0.75 else 0  # Threshold más alto
```

### Muchos Falsos Negativos

**Causa:** Dataset insuficiente.

**Solución:**
1. Agrega más ejemplos vulnerables al notebook
2. Reentrena el modelo
3. Verifica que el F1-Score sea ≥ 0.85

### GitHub Actions Falla

**Verifica:**

```bash
# 1. El workflow está en la ubicación correcta
.github/workflows/security-ml-analysis.yml

# 2. Los secrets están configurados
Settings > Secrets > Actions

# 3. Los permisos del workflow
# El archivo .yml ya incluye los permisos necesarios
```

### Telegram No Envía Mensajes

**Verifica:**

```bash
# 1. Token del bot correcto
curl "https://api.telegram.org/bot<TOKEN>/getMe"

# 2. Chat ID correcto
curl "https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>&text=test"

# 3. El bot tiene permiso para enviar mensajes al chat
```

---

## 📖 Ejemplos de Código

### Código VULNERABLE ❌

```typescript
// NoSQL Injection
router.post('/login', async (req, res) => {
    const user = await User.findOne({ 
        username: req.body.username,  // ⚠️ Sin validación
        password: req.body.password 
    });
});

// Command Injection
const { exec } = require('child_process');
router.post('/run', (req, res) => {
    exec('ls ' + req.body.dir);  // ⚠️ Ejecución directa
});

// Code Injection
router.post('/calc', (req, res) => {
    const result = eval(req.body.expr);  // ⚠️ eval con user input
});
```

### Código SEGURO ✅

```typescript
// Con validación
import { body, validationResult } from 'express-validator';

router.post('/login', [
    body('username').isAlphanumeric().trim(),  // ✅ Validación
    body('password').isLength({ min: 8 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // ... resto del código
});

// Con sanitización
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize());  // ✅ Sanitización global

// Sin ejecución de comandos
import fs from 'fs/promises';
router.get('/files', async (req, res) => {
    const files = await fs.readdir('./public');  // ✅ Sin user input
    res.json(files);
});
```

---

## 🎯 Mejores Prácticas

### 1. Ejecuta análisis localmente antes de hacer PR

```bash
cd security_ml
python analyze_pr.py --files ../backend/src/controllers/*.ts
```

### 2. Reentrena el modelo periódicamente

```bash
# Cada mes o cuando agregues nuevos patrones
python train_model.py
git add model.joblib scaler.joblib
git commit -m "chore: actualizar modelo ML"
```

### 3. Revisa los reportes falsos positivos

Si el modelo marca código seguro como vulnerable:
1. Analiza el código manualmente
2. Agrega el ejemplo al dataset
3. Reentrena el modelo

### 4. Mantén el dataset actualizado

Agrega nuevos ejemplos al notebook cuando:
- Encuentres nuevas vulnerabilidades
- Implementes nuevos patrones de seguridad
- Tengas falsos positivos/negativos

---

## 📞 Soporte

Si tienes problemas:

1. Verifica esta guía
2. Revisa los logs del workflow en GitHub Actions
3. Ejecuta `test_analyzer.py` localmente
4. Consulta el README.md del módulo

---

**Última actualización:** Febrero 2026
