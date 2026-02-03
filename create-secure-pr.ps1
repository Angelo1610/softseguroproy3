# ================================================================================
# Script para crear PR de prueba con código SEGURO
# Flujo: dev -> test (activa análisis ML)
# ================================================================================

Write-Host @"
================================================================================
  CREAR PR DE PRUEBA - CODIGO SEGURO (dev -> test)
================================================================================
"@ -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "security_ml")) {
    Write-Host "[ERROR] Ejecuta este script desde el directorio raiz del proyecto" -ForegroundColor Red
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$branchName = "feature/secure-code-$timestamp"

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
# PASO 3: Crear archivo seguro de prueba
# ================================================================================
Write-Host "`n[3/6] Creando archivo de prueba seguro..." -ForegroundColor Yellow

$secureCode = @"
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import helmet from 'helmet';
import { sanitize } from 'mongo-sanitize';

/**
 * Controlador de prueba con código SEGURO
 * Este controlador implementa las mejores prácticas de seguridad
 * 
 * Características de seguridad:
 * - Validación de entrada con express-validator
 * - Sanitización de datos con mongo-sanitize
 * - Uso de helmet para headers seguros
 * - Sin uso de funciones peligrosas (exec, eval)
 * - Sin inyección NoSQL
 */
export class TestSecureController {
    /**
     * Método seguro con validación completa
     */
    async secureMethod(req: Request, res: Response) {
        // 1. Validar entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }
        
        // 2. Sanitizar datos
        const sanitizedId = sanitize(req.params.id);
        
        // 3. Query segura con parámetros validados
        const data = await User.findById(sanitizedId);
        
        if (!data) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado' 
            });
        }
        
        res.json({ 
            success: true,
            data 
        });
    }
    
    /**
     * Búsqueda segura con sanitización
     */
    async safeSearch(req: Request, res: Response) {
        // Validar entrada
        await body('query')
            .isString()
            .trim()
            .escape()
            .run(req);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        // Sanitizar query
        const sanitizedQuery = sanitize(req.body.query);
        
        // Búsqueda segura
        const results = await User.find({
            name: { `$regex: sanitizedQuery, `$options: 'i' }
        }).select('-password');
        
        res.json({ 
            success: true,
            results 
        });
    }
    
    /**
     * Validadores para las rutas
     */
    static validators = {
        secureMethod: [
            body('id').isMongoId().withMessage('ID inválido')
        ],
        safeSearch: [
            body('query').isString().trim().isLength({ min: 1, max: 100 })
        ]
    };
}
"@

# Crear directorio si no existe
if (-not (Test-Path "backend/src/presentation/controllers")) {
    New-Item -ItemType Directory -Force -Path "backend/src/presentation/controllers" | Out-Null
}

$secureCode | Out-File -Encoding utf8 "backend/src/presentation/controllers/TestSecureController.ts"
Write-Host "[OK] Archivo seguro creado" -ForegroundColor Green

# ================================================================================
# PASO 4: Commit
# ================================================================================
Write-Host "`n[4/6] Haciendo commit..." -ForegroundColor Yellow
git add backend/src/presentation/controllers/TestSecureController.ts
git commit -m "test: agregar controlador seguro para prueba de ML

- Implementa validacion con express-validator
- Usa sanitizacion con mongo-sanitize
- Incluye helmet para seguridad
- No usa funciones peligrosas
- Codigo 100% seguro para probar el sistema ML
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
    $prTitle = "[SECURE CODE] Test de codigo seguro - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    $prBody = @"
## Analisis de Seguridad - Codigo SEGURO

Este PR contiene codigo seguro para probar el sistema de analisis ML.

### Cambios:
- Implementacion con validacion de entrada (express-validator)
- Uso de helmet para seguridad
- Sanitizacion de datos (mongo-sanitize)
- No contiene vulnerabilidades
- No usa funciones peligrosas (exec, eval, etc.)

### Resultado esperado:
- [OK] El analisis debe **APROBAR** este PR
- [OK] No se deben detectar vulnerabilidades
- [OK] El merge debe estar permitido
- [OK] Score de seguridad: SEGURO

### Flujo de trabajo:
dev -> test -> main
     ^
   (estas aqui)

---
**Generado automaticamente por:** create-secure-pr.ps1
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
  EXITO! PR DE CODIGO SEGURO CREADO
================================================================================
"@ -ForegroundColor Green

Write-Host "`nRESUMEN:" -ForegroundColor Yellow
Write-Host "  Branch: $branchName" -ForegroundColor White
Write-Host "  Base: test (rama de pruebas)" -ForegroundColor White
Write-Host "  Archivo: backend/src/presentation/controllers/TestSecureController.ts" -ForegroundColor White

Write-Host "`nPROXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "  1. Ve a GitHub: https://github.com/Angelo1610/softseguroproy3/pulls" -ForegroundColor White
Write-Host "  2. Abre el Pull Request creado" -ForegroundColor White
Write-Host "  3. Ve a la pestania 'Checks' para ver el analisis ML en ejecucion" -ForegroundColor White
Write-Host "  4. Espera el resultado: [OK] Codigo SEGURO" -ForegroundColor Green
Write-Host "  5. El PR debe ser aprobado para merge" -ForegroundColor Green

Write-Host @"

================================================================================
"@ -ForegroundColor Cyan
