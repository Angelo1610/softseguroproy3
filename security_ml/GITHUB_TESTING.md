# Guía de Pruebas con GitHub - Sistema ML de Vulnerabilidades

## 🎯 Objetivo

Probar la integración completa del sistema de análisis de vulnerabilidades ML con GitHub Actions.

---

## 📋 Prerequisitos

- [ ] Repositorio en GitHub (público o privado)
- [ ] Git instalado localmente
- [ ] Cuenta de GitHub con permisos de admin en el repo
- [ ] (Opcional) Bot de Telegram para notificaciones

---

## 🚀 Configuración Inicial de GitHub

### Paso 1: Subir el Código a GitHub

```powershell
# Navegar al directorio del proyecto
cd "C:\Users\sanch\OneDrive\Documentos\SEPTIMO\software seguro\P3\Proyecto 3P"

# Inicializar repositorio (si no existe)
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "feat: agregar sistema ML de detección de vulnerabilidades"

# Agregar remote (reemplaza con tu repositorio)
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git

# Subir a GitHub
git push -u origin main
```

### Paso 2: Verificar que el Workflow está en GitHub

Verifica que existe el archivo:
```
.github/workflows/security-ml-analysis.yml
```

En GitHub:
1. Ve a tu repositorio
2. Click en `.github` > `workflows`
3. Debe aparecer `security-ml-analysis.yml`

### Paso 3: Configurar Secrets (Opcional pero Recomendado)

#### Para Notificaciones de Telegram:

**3.1. Crear Bot de Telegram:**
```
1. Abre Telegram
2. Busca @BotFather
3. Envía: /newbot
4. Sigue las instrucciones
5. Guarda el TOKEN que te da (ejemplo: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)
```

**3.2. Obtener Chat ID:**
```
1. Busca @userinfobot en Telegram
2. Envía: /start
3. Te dará tu Chat ID (ejemplo: 987654321)
```

**3.3. Configurar Secrets en GitHub:**
```
1. Ve a tu repositorio en GitHub
2. Click en "Settings" (⚙️)
3. En el menú izquierdo: "Secrets and variables" > "Actions"
4. Click "New repository secret"

Agregar dos secrets:

Secret 1:
- Name: TELEGRAM_BOT_TOKEN
- Value: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz

Secret 2:
- Name: TELEGRAM_CHAT_ID
- Value: 987654321
```

---

## 🧪 Método 1: Prueba Local del Workflow

### Opción A: Simular el Análisis Localmente

```powershell
cd security_ml

# Analizar archivos específicos
python analyze_pr.py --files ../backend/src/presentation/controllers/AuthController.ts

# Simular análisis de múltiples archivos
python analyze_pr.py --files ../backend/src/presentation/controllers/*.ts
```

### Opción B: Probar con GitHub CLI (gh)

```powershell
# Instalar GitHub CLI (si no está instalado)
winget install GitHub.cli

# Autenticar
gh auth login

# Ver el workflow
gh workflow list

# Ejecutar workflow manualmente (si está configurado)
gh workflow run security-ml-analysis.yml
```

---

## 🔄 Método 2: Crear Pull Request de Prueba

### Escenario 1: PR con Código SEGURO

**1. Crear nueva rama:**
```powershell
cd "C:\Users\sanch\OneDrive\Documentos\SEPTIMO\software seguro\P3\Proyecto 3P"

git checkout -b test/secure-code
```

**2. Crear archivo de prueba seguro:**
```powershell
# Crear archivo seguro en backend
$secureCode = @"
import { body, validationResult } from 'express-validator';
import { Request, Response } from 'express';

export class TestSecureController {
    async testMethod(req: Request, res: Response) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const data = await Model.findById(req.params.id);
        res.json(data);
    }
}
"@

$secureCode | Out-File -Encoding utf8 backend/src/presentation/controllers/TestSecureController.ts
```

**3. Hacer commit y push:**
```powershell
git add backend/src/presentation/controllers/TestSecureController.ts
git commit -m "test: agregar controlador seguro para pruebas"
git push origin test/secure-code
```

**4. Crear Pull Request:**
```powershell
# Con GitHub CLI
gh pr create --title "Test: Código Seguro" --body "PR de prueba con código seguro"

# O manualmente en GitHub:
# Ve a: https://github.com/TU_USUARIO/TU_REPO/pulls
# Click "New pull request"
# Selecciona: base: main <- compare: test/secure-code
# Click "Create pull request"
```

**5. Ver el Workflow en Acción:**
```
1. Ve al Pull Request en GitHub
2. Verás un check ⏳ "Security ML Vulnerability Analysis" en ejecución
3. Espera a que termine
4. Debe mostrar ✅ "All checks have passed"
5. En los comentarios del PR debe aparecer:

   ## ✅ Análisis de Seguridad - APROBADO
   
   **Resultado**: ✅ Código SEGURO
   
   Se analizaron **1** archivos y no se detectaron vulnerabilidades.
```

---

### Escenario 2: PR con Código VULNERABLE

**1. Crear nueva rama:**
```powershell
git checkout main
git checkout -b test/vulnerable-code
```

**2. Crear archivo de prueba vulnerable:**
```powershell
$vulnerableCode = @"
import { Request, Response } from 'express';

export class TestVulnerableController {
    async vulnerableMethod(req: Request, res: Response) {
        // ⚠️ VULNERABLE: NoSQL Injection
        const user = await User.findOne({
            username: req.body.username,
            password: req.body.password
        });
        
        res.json(user);
    }
    
    async commandInjection(req: Request, res: Response) {
        // ⚠️ VULNERABLE: Command Injection
        const { exec } = require('child_process');
        exec('ls ' + req.query.directory, (error, stdout) => {
            res.send(stdout);
        });
    }
}
"@

$vulnerableCode | Out-File -Encoding utf8 backend/src/presentation/controllers/TestVulnerableController.ts
```

**3. Hacer commit y push:**
```powershell
git add backend/src/presentation/controllers/TestVulnerableController.ts
git commit -m "test: agregar código vulnerable para pruebas"
git push origin test/vulnerable-code
```

**4. Crear Pull Request:**
```powershell
gh pr create --title "Test: Código Vulnerable" --body "PR de prueba con vulnerabilidades intencionales"
```

**5. Ver el Workflow FALLAR:**
```
1. Ve al Pull Request en GitHub
2. Verás un check ❌ "Security ML Vulnerability Analysis" fallido
3. En los comentarios del PR debe aparecer:

   ## ⚠️ Análisis de Seguridad - VULNERABILIDADES DETECTADAS
   
   **Archivos analizados**: 1
   **Archivos vulnerables**: 1
   
   ### 🔴 Vulnerabilidades Encontradas:
   
   #### 📄 `backend/src/presentation/controllers/TestVulnerableController.ts`
   
   - **Tipo**: NoSQL Injection / Command Injection
   - **Confianza**: XX.XX%
   - **Patrones detectados**:
     - ⚠️ Uso de req.body sin validación
     - ⚠️ Ejecución de comandos del sistema (exec)

4. El merge estará bloqueado ❌
5. Se creará una issue automáticamente
6. (Si configuraste Telegram) Recibirás notificación
```

---

## 📊 Ver los Resultados en GitHub

### En el Pull Request:

1. **Tab "Conversation":**
   - Comentario automático del bot
   - Estado de checks (✅ o ❌)
   - Etiquetas (si es vulnerable: `security-vulnerability`)

2. **Tab "Checks":**
   - Click en "Security ML Vulnerability Analysis"
   - Ver logs completos del análisis
   - Ver detalles de la ejecución

3. **Tab "Files changed":**
   - Ver qué archivos fueron modificados
   - Ver el código que fue analizado

### En Actions:

```
1. Ve a: https://github.com/TU_USUARIO/TU_REPO/actions
2. Verás todos los workflows ejecutados
3. Click en uno para ver:
   - Logs detallados
   - Tiempo de ejecución
   - Archivos analizados
   - Resultados del modelo ML
```

### En Issues (si fue vulnerable):

```
1. Ve a: https://github.com/TU_USUARIO/TU_REPO/issues
2. Debe haber una issue automática:
   "🔴 Vulnerabilidad detectada en PR #X"
3. Con detalles de la vulnerabilidad
4. Vinculada al Pull Request
```

---

## 🔍 Verificar el Workflow Paso a Paso

### 1. Ver Logs en Tiempo Real:

```powershell
# Con GitHub CLI
gh run list
gh run watch
```

### 2. Inspeccionar un Run Específico:

```
1. GitHub > Actions > Security ML Vulnerability Analysis
2. Click en el run específico
3. Ver cada step:
   ✅ Checkout repository
   ✅ Setup Python
   ✅ Install Python dependencies
   ✅ Get changed files
   ✅ Run ML vulnerability analysis
   ✅ Generate security report
```

### 3. Ver Output del Script:

En los logs de GitHub Actions busca:
```
Run cd security_ml
🚀 Iniciando análisis de vulnerabilidades...
✅ Modelo cargado: model.joblib
🔍 Analizando: backend/src/...
======================================================================
📊 RESULTADOS DEL ANÁLISIS
======================================================================
Estado general: VULNERABLE/SEGURO
```

---

## 🧹 Limpiar Pruebas

Después de probar:

```powershell
# Eliminar branches de prueba
git checkout main
git branch -D test/secure-code
git branch -D test/vulnerable-code

# Eliminar en GitHub
gh pr close NUMERO_PR
git push origin --delete test/secure-code
git push origin --delete test/vulnerable-code

# Eliminar archivos de prueba
Remove-Item backend/src/presentation/controllers/TestSecureController.ts
Remove-Item backend/src/presentation/controllers/TestVulnerableController.ts
```

---

## 🎯 Checklist de Verificación

### Antes del Primer PR:

- [ ] Código está en GitHub
- [ ] Workflow `.github/workflows/security-ml-analysis.yml` existe
- [ ] Modelo está entrenado (`model.joblib` en `security_ml/`)
- [ ] Secrets configurados (opcional)
- [ ] Tests locales pasan (`python test_analyzer.py`)

### Durante el PR:

- [ ] Workflow se ejecuta automáticamente
- [ ] Aparece en "Checks" del PR
- [ ] Se genera comentario automático
- [ ] Si vulnerable: merge bloqueado
- [ ] Si vulnerable: issue creada
- [ ] Si vulnerable: etiqueta agregada

### Después del PR:

- [ ] Logs están disponibles en Actions
- [ ] Resultados son correctos
- [ ] Notificaciones funcionan (si configuradas)

---

## 🐛 Solución de Problemas

### El Workflow No Se Ejecuta

**Causa 1:** No hay archivos `.ts` o `.js` modificados en `backend/`
```powershell
# Solución: Modificar un archivo del backend
echo "// test" >> backend/src/app.ts
git add backend/src/app.ts
git commit -m "test: trigger workflow"
```

**Causa 2:** El PR no es a `main` o `develop`
```powershell
# Solución: Cambiar la rama base del PR en GitHub
```

**Causa 3:** GitHub Actions está deshabilitado
```
Solución: Settings > Actions > General > Allow all actions
```

### El Workflow Falla con Error

**Error: "No such file: model.joblib"**
```powershell
# Solución: El modelo debe estar en el repositorio
cd security_ml
python train_model.py
git add model.joblib scaler.joblib feature_names.joblib
git commit -m "chore: agregar modelo ML entrenado"
git push
```

**Error: "ModuleNotFoundError"**
```yaml
# El workflow ya instala las dependencias automáticamente
# Si persiste, verifica requirements.txt
```

### Los Comentarios No Aparecen

**Verificar permisos del workflow:**
```yaml
# En .github/workflows/security-ml-analysis.yml debe tener:
permissions:
  contents: read
  pull-requests: write  # ← Necesario para comentarios
  issues: write         # ← Necesario para crear issues
```

---

## 📱 Probar Notificaciones de Telegram

### 1. Verificar Bot:

```powershell
# Enviar mensaje de prueba
curl "https://api.telegram.org/bot<TU_TOKEN>/sendMessage?chat_id=<TU_CHAT_ID>&text=Test"
```

### 2. Ver Notificación en PR Vulnerable:

Cuando un PR es vulnerable, debes recibir:
```
🚨 VULNERABILIDAD DETECTADA

PR #123
Archivos vulnerables: 1

Revisa el PR para más detalles.
```

---

## 📈 Métricas y Monitoreo

### Ver Estadísticas de Workflows:

```
GitHub > Insights > Actions

Aquí puedes ver:
- Workflows ejecutados
- Tiempo promedio
- Tasa de éxito/fallo
- Uso de minutos
```

### Exportar Resultados:

```powershell
# Con GitHub CLI
gh run list --json conclusion,databaseId,startedAt > workflow_stats.json
```

---

## ✅ Resultado Esperado Final

Después de completar esta guía:

1. ✅ PR con código seguro → Aprobado automáticamente
2. ✅ PR con código vulnerable → Bloqueado con comentario detallado
3. ✅ Issues creadas automáticamente para vulnerabilidades
4. ✅ Notificaciones por Telegram funcionando
5. ✅ Logs completos disponibles en Actions

---

## 🎓 Ejemplo Completo de Flujo

```powershell
# 1. Crear branch
git checkout -b feature/new-endpoint

# 2. Modificar código
echo "..." > backend/src/presentation/controllers/NewController.ts

# 3. Commit
git add .
git commit -m "feat: nuevo endpoint de usuarios"

# 4. Push
git push origin feature/new-endpoint

# 5. Crear PR
gh pr create --title "Feature: Nuevo endpoint" --body "Agrega endpoint para gestión de usuarios"

# 6. GitHub Actions se ejecuta automáticamente
# 7. Ver resultados en el PR
gh pr view --web
```

**Resultado automático:**
- Análisis ML del código
- Comentario con resultado
- Merge permitido/bloqueado según vulnerabilidades
- Issue creada si hay problemas
- Notificación enviada

---

**¡Listo para producción!** 🚀
