# ================================================================================
# Script para crear PR de prueba con código VULNERABLE
# Flujo: dev -> test (debe ser BLOQUEADO por el análisis ML)
# ================================================================================

Write-Host @"
================================================================================
  CREAR PR DE PRUEBA - CODIGO VULNERABLE (dev -> test)
================================================================================
"@ -ForegroundColor Red

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "security_ml")) {
    Write-Host "[ERROR] Ejecuta este script desde el directorio raiz del proyecto" -ForegroundColor Red
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$branchName = "test/vulnerable-code-$timestamp"

# ================================================================================
# PASO 1: Checkout a dev
# ================================================================================
Write-Host "`n[1/6] Cambiando a rama dev..." -ForegroundColor Yellow

$devExists = git show-ref --verify --quiet refs/heads/dev
if (-not $?) {
    Write-Host "[ERROR] La rama dev no existe. Ejecuta primero: .\setup-repository.ps1" -ForegroundColor Red
    exit 1
}

git checkout dev 2>&1 | Out-Null
Write-Host "[OK] En rama dev" -ForegroundColor Green

# ================================================================================
# PASO 2: Crear feature branch desde dev
# ================================================================================
Write-Host "`n[2/6] Creando feature branch..." -ForegroundColor Yellow
git checkout -b $branchName
Write-Host "[OK] Branch creado: $branchName" -ForegroundColor Green

# ================================================================================
# PASO 3: Crear archivo VULNERABLE de prueba
# ================================================================================
Write-Host "`n[3/6] Creando archivo de prueba VULNERABLE..." -ForegroundColor Yellow

$vulnerableCode = @"
import { Request, Response } from 'express';
import { exec } from 'child_process';

/**
 * Controlador de prueba con código VULNERABLE
 * ⚠️ Este código contiene vulnerabilidades intencionalmente
 * para probar el sistema de análisis ML
 * 
 * Vulnerabilidades incluidas:
 * - Inyección NoSQL
 * - Inyección de comandos
 * - Sin validación de entrada
 * - Sin sanitización
 * - Uso de funciones peligrosas
 */
export class TestVulnerableController {
    /**
     * ⚠️ VULNERABLE: Inyección NoSQL
     * No valida ni sanitiza la entrada del usuario
     */
    async vulnerableMethod(req: Request, res: Response) {
        // ⚠️ VULNERABLE: req.body usado directamente sin validación
        const userId = req.body.userId;
        
        // ⚠️ VULNERABLE: Query NoSQL sin sanitización
        const data = await User.find({ _id: userId });
        
        res.json(data);
    }
    
    /**
     * ⚠️ VULNERABLE: Inyección de comandos
     * Ejecuta comandos del sistema con entrada del usuario
     */
    async executeCommand(req: Request, res: Response) {
        // ⚠️ VULNERABLE: req.body usado directamente
        const command = req.body.command;
        
        // ⚠️ VULNERABLE: exec() con entrada del usuario
        exec(command, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }
            res.json({ output: stdout });
        });
    }
    
    /**
     * ⚠️ VULNERABLE: Búsqueda sin validación
     * Permite inyección NoSQL
     */
    async unsafeSearch(req: Request, res: Response) {
        // ⚠️ VULNERABLE: req.query usado directamente
        const searchQuery = req.query.q;
        
        // ⚠️ VULNERABLE: Consulta directa sin sanitización
        const results = await User.find(searchQuery);
        
        res.json(results);
    }
    
    /**
     * ⚠️ VULNERABLE: Evaluación de código dinámico
     */
    async dangerousEval(req: Request, res: Response) {
        // ⚠️ VULNERABLE: eval() con entrada del usuario
        const code = req.body.code;
        const result = eval(code);
        
        res.json({ result });
    }
}
"@

# Crear directorio si no existe
if (-not (Test-Path "backend/src/presentation/controllers")) {
    New-Item -ItemType Directory -Force -Path "backend/src/presentation/controllers" | Out-Null
}

$vulnerableCode | Out-File -Encoding utf8 "backend/src/presentation/controllers/TestVulnerableController.ts"
Write-Host "[OK] Archivo vulnerable creado" -ForegroundColor Green

# ================================================================================
# PASO 4: Commit
# ================================================================================
Write-Host "`n[4/6] Haciendo commit..." -ForegroundColor Yellow
git add backend/src/presentation/controllers/TestVulnerableController.ts
git commit -m "test: agregar controlador VULNERABLE para prueba de ML

ATENCION: Este codigo contiene vulnerabilidades intencionalmente:
- Inyeccion NoSQL
- Inyeccion de comandos
- Uso de exec() y eval()
- Sin validacion de entrada
- Sin sanitizacion de datos

Este commit debe ser BLOQUEADO por el sistema ML
"
Write-Host "[OK] Commit creado" -ForegroundColor Green

# ================================================================================
# PASO 5: Push
# ================================================================================
Write-Host "`n[5/6] Subiendo a GitHub..." -ForegroundColor Yellow

$hasRemote = git remote get-url origin 2>&1
if (-not $?) {
    Write-Host "[ERROR] No hay remote configurado" -ForegroundColor Red
    Write-Host "[INFO] Ejecuta primero: .\setup-repository.ps1" -ForegroundColor Yellow
    exit 1
}

git push -u origin $branchName
Write-Host "[OK] Branch subido a GitHub" -ForegroundColor Green

# ================================================================================
# PASO 6: Crear Pull Request
# ================================================================================
Write-Host "`n[6/6] Creando Pull Request (dev -> test)..." -ForegroundColor Yellow

# Verificar si GitHub CLI está instalado
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
if ($ghInstalled) {
    $prTitle = "[VULNERABLE] Test de codigo vulnerable - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    $prBody = @"
## Analisis de Seguridad - Codigo VULNERABLE

Este PR contiene codigo intencionalmente vulnerable para probar el sistema de analisis ML.

### Vulnerabilidades introducidas:
- [X] Inyeccion NoSQL
- [X] Inyeccion de comandos
- [X] Sin validacion de entrada
- [X] Sin sanitizacion
- [X] Uso de funciones peligrosas (exec, eval)

### Resultado esperado:
- [ERROR] El analisis debe **RECHAZAR** este PR
- [ERROR] Se deben detectar multiples vulnerabilidades
- [ERROR] El merge debe estar **BLOQUEADO**
- [AUTO] Se debe crear un issue automaticamente
- [AUTO] Debe enviar notificacion (si Telegram esta configurado)

### Flujo de trabajo:
dev -> test (BLOQUEADO) -> main
     ^
   (estas aqui - debe ser bloqueado)

### Tipo de vulnerabilidades:
1. **NoSQL Injection**: Uso directo de req.body/req.query sin validacion
2. **Command Injection**: Uso de exec() con entrada del usuario
3. **Code Injection**: Uso de eval() con entrada del usuario
4. **Falta de validacion**: No usa express-validator
5. **Falta de sanitizacion**: No usa mongo-sanitize

---
**Generado automaticamente por:** create-vulnerable-pr.ps1

**NOTA:** Este codigo NO debe ser mergeado bajo ninguna circunstancia.
"@

    gh pr create --base test --head $branchName --title "$prTitle" --body "$prBody"
    
    if ($?) {
        Write-Host "[OK] Pull Request creado exitosamente" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] No se pudo crear el PR con GitHub CLI" -ForegroundColor Red
        Write-Host "[INFO] Crea el PR manualmente en:" -ForegroundColor Yellow
        Write-Host "  https://github.com/Angelo1610/softseguroproy3/compare/test...$branchName" -ForegroundColor White
    }
} else {
    Write-Host "[INFO] GitHub CLI no instalado" -ForegroundColor Yellow
    Write-Host "[INFO] Crea el PR manualmente en:" -ForegroundColor Yellow
    Write-Host "  https://github.com/Angelo1610/softseguroproy3/compare/test...$branchName" -ForegroundColor White
    Write-Host ""
    Write-Host "O instala GitHub CLI: winget install GitHub.cli" -ForegroundColor Cyan
}

# ================================================================================
# RESUMEN
# ================================================================================
Write-Host @"

================================================================================
  EXITO! PR DE CODIGO VULNERABLE CREADO
================================================================================
"@ -ForegroundColor Red

Write-Host "`nRESUMEN:" -ForegroundColor Yellow
Write-Host "  Branch: $branchName" -ForegroundColor White
Write-Host "  Base: test (rama de pruebas)" -ForegroundColor White
Write-Host "  Archivo: backend/src/presentation/controllers/TestVulnerableController.ts" -ForegroundColor White

Write-Host "`nPROXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "  1. Ve a GitHub: https://github.com/Angelo1610/softseguroproy3/pulls" -ForegroundColor White
Write-Host "  2. Abre el Pull Request creado" -ForegroundColor White
Write-Host "  3. Ve a la pestania 'Checks' para ver el analisis ML en ejecucion" -ForegroundColor White
Write-Host "  4. Espera el resultado: [ERROR] Codigo VULNERABLE" -ForegroundColor Red
Write-Host "  5. El PR debe ser BLOQUEADO y rechazado" -ForegroundColor Red
Write-Host "  6. Verifica que se cree un issue automaticamente" -ForegroundColor Yellow

Write-Host @"

================================================================================
"@ -ForegroundColor Cyan
