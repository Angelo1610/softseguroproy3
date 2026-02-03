# Quick Start - Sistema de Análisis de Vulnerabilidades ML

## ✅ Estado del Sistema

El sistema está **100% funcional** con:
- ✅ Modelo entrenado (F1-Score: 1.0)
- ✅ 29 características extraídas
- ✅ 4 pruebas pasadas exitosamente
- ✅ Random Forest como mejor modelo

---

## 🚀 Inicio Rápido (5 minutos)

### 1. Verificar Instalación

```powershell
cd security_ml
python --version  # Debe ser Python 3.11+
```

### 2. Instalar Dependencias

```powershell
pip install -r requirements.txt
```

**Dependencias principales:**
- scikit-learn (ML)
- pandas, numpy (datos)
- xgboost (clasificador)
- PyGithub (integración GitHub)

### 3. Verificar Modelo

```powershell
# Verificar que el modelo existe
dir *.joblib

# Si no existe, entrenar:
python train_model.py
```

**Salida esperada:**
```
🚀 ENTRENAMIENTO DEL MODELO DE DETECCIÓN DE VULNERABILIDADES
✅ Dataset creado: 16 ejemplos
✅ 29 características extraídas
🏆 Mejor modelo: Random Forest
   F1-Score: 1.0000
✅ ENTRENAMIENTO COMPLETADO EXITOSAMENTE
```

### 4. Ejecutar Pruebas

```powershell
python test_analyzer.py
```

**Resultado esperado:**
```
======================================================================
RESUMEN DE PRUEBAS
======================================================================
Total de pruebas:  4
Correctas:         4
Precision:         100.00%
[OK] TODAS LAS PRUEBAS PASARON!
```

### 5. Analizar Archivos del Proyecto

```powershell
# Analizar un archivo específico
python analyze_pr.py --files ../backend/src/presentation/controllers/AuthController.ts

# Analizar múltiples archivos
python analyze_pr.py --files ../backend/src/presentation/controllers/*.ts
```

**Salida esperada si es SEGURO:**
```
✅ ANÁLISIS EXITOSO: No se detectaron vulnerabilidades
Estado general: SEGURO
Archivos analizados: 1
Archivos vulnerables: 0
```

**Salida esperada si es VULNERABLE:**
```
❌ ANÁLISIS FALLIDO: Se detectaron vulnerabilidades
Estado general: VULNERABLE
Tipo: NoSQL Injection
Confianza: 87.45%
```

---

## 📁 Archivos Generados

Después del entrenamiento:

```
security_ml/
├── model.joblib           # Modelo Random Forest (92 KB)
├── scaler.joblib          # Normalizador (2 KB)
├── feature_names.joblib   # 29 características
└── model_metadata.json    # Metadatos del modelo
```

---

## 🎯 Ejemplos de Uso

### Ejemplo 1: Código Vulnerable (NoSQL Injection)

Crear archivo `test_vulnerable.ts`:

```typescript
router.post('/login', async (req, res) => {
    const user = await User.findOne({ 
        username: req.body.username,
        password: req.body.password 
    });
    res.json(user);
});
```

Analizar:
```powershell
echo "..." > test_vulnerable.ts
python analyze_pr.py --files test_vulnerable.ts
```

**Resultado:**
```
Estado general: VULNERABLE
Tipo: NoSQL Injection
Patrones detectados:
- Uso de req.body sin validación
```

### Ejemplo 2: Código Seguro

Crear archivo `test_secure.ts`:

```typescript
import { body, validationResult } from 'express-validator';

router.post('/login', [
    body('username').isAlphanumeric().trim(),
    body('password').isLength({ min: 8 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // ... código seguro
});
```

Analizar:
```powershell
python analyze_pr.py --files test_secure.ts
```

**Resultado:**
```
Estado general: SEGURO
Archivos analizados: 1
```

---

## 🔧 Comandos Útiles

### Verificar Estado del Sistema

```powershell
# Ver versión de Python
python --version

# Ver paquetes instalados
pip list | Select-String "scikit|pandas|xgboost"

# Ver archivos del modelo
dir *.joblib, *.json

# Ver metadata del modelo
Get-Content model_metadata.json | ConvertFrom-Json
```

### Re-entrenar el Modelo

```powershell
# Eliminar modelo anterior
Remove-Item *.joblib, model_metadata.json

# Entrenar nuevo modelo
python train_model.py
```

### Ejecutar Tests

```powershell
# Test básico
python test_analyzer.py

# Test con salida detallada
python test_analyzer.py 2>&1 | Out-File test_results.txt
```

---

## 📊 Tipos de Vulnerabilidades Detectadas

| Tipo | Patrones | Ejemplo |
|------|----------|---------|
| **NoSQL Injection** | `req.body` sin validación, `$where` | `User.findOne({ username: req.body.username })` |
| **Command Injection** | `exec`, `spawn` con user input | `exec('ls ' + req.query.dir)` |
| **Code Injection** | `eval`, `new Function()` | `eval(req.body.expression)` |
| **Path Traversal** | `readFile` con `req.params` | `readFileSync(req.params.filename)` |
| **Validación Insuficiente** | `req.body` sin validators | `User.update(req.body)` |

---

## ⚙️ Configuración de GitHub (Opcional)

### 1. Crear Bot de Telegram (Opcional)

```
1. Hablar con @BotFather en Telegram
2. Enviar: /newbot
3. Guardar el TOKEN
4. Hablar con @userinfobot para obtener CHAT_ID
```

### 2. Configurar Secrets en GitHub

```
Repositorio > Settings > Secrets and variables > Actions

Agregar:
- TELEGRAM_BOT_TOKEN: tu_token_aqui
- TELEGRAM_CHAT_ID: tu_chat_id_aqui
```

### 3. Verificar Workflow

El archivo `.github/workflows/security-ml-analysis.yml` ya está configurado.

Se ejecuta automáticamente cuando:
- Hay un Pull Request a `main` o `develop`
- Se modifican archivos `.ts` o `.js` en `backend/`

---

## 🐛 Solución de Problemas

### Error: "No such file: model.joblib"

```powershell
cd security_ml
python train_model.py
```

### Error: "ModuleNotFoundError: No module named 'sklearn'"

```powershell
pip install scikit-learn pandas numpy xgboost joblib
```

### Error: Encoding con emojis en Windows

Los archivos ya están corregidos para usar caracteres ASCII.

### Muchos Falsos Positivos

El threshold se puede ajustar en `analyze_pr.py` línea ~140:

```python
# Cambiar threshold de 0.5 a 0.7 para ser más estricto
prediction = 1 if probabilities[1] > 0.7 else 0
```

---

## 📈 Métricas del Modelo Actual

```json
{
  "model_name": "Random Forest",
  "f1_score": 1.0,
  "accuracy": 1.0,
  "num_features": 29
}
```

**Características:**
- 29 features extraídas por archivo
- Validación cruzada 5-fold
- Dataset: 16 ejemplos (10 vulnerables, 6 seguros)

---

## 📚 Próximos Pasos

1. ✅ **Sistema operativo** - Funciona correctamente
2. 📝 Ampliar dataset con más ejemplos
3. 🎯 Fine-tuning de hiperparámetros
4. 🔄 Integrar con datasets públicos (Big-Vul, CVEFixes)
5. 📊 Dashboard de métricas históricas

---

## 🎓 Documentación Adicional

- [README.md](README.md) - Documentación completa del módulo
- [USAGE_GUIDE.md](USAGE_GUIDE.md) - Guía de uso detallada
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Resumen de implementación
- [train_model.ipynb](train_model.ipynb) - Notebook interactivo de entrenamiento

---

## ✅ Checklist de Validación

Antes de hacer un commit, verifica:

- [ ] `python train_model.py` ejecuta sin errores
- [ ] `python test_analyzer.py` muestra 4/4 pruebas OK
- [ ] Existen archivos: `model.joblib`, `scaler.joblib`, `feature_names.joblib`
- [ ] `python analyze_pr.py --files backend/src/controllers/*.ts` funciona
- [ ] El F1-Score es ≥ 0.85 (actualmente es 1.0)

---

**Última actualización:** 2 de febrero de 2026  
**Versión:** 1.0.0  
**Estado:** ✅ Producción
