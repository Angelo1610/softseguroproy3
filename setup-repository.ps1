# ================================================================================
# Script de Configuración del Repositorio con Flujo de Ramas Obligatorio
# ================================================================================
# Este script configura el repositorio con las ramas obligatorias:
# dev → test → main
# ================================================================================

param(
    [string]$RepoUrl = "https://github.com/Angelo1610/softseguroproy3.git"
)

Clear-Host

Write-Host @"
================================================================================
  CONFIGURACION DE REPOSITORIO - FLUJO dev -> test -> main
================================================================================
"@ -ForegroundColor Cyan

# Función para mostrar estado
function Show-Status {
    param([string]$Message, [string]$Status)
    
    if ($Status -eq "OK") {
        Write-Host "  [OK] $Message" -ForegroundColor Green
    } elseif ($Status -eq "INFO") {
        Write-Host "  [*] $Message" -ForegroundColor Yellow
    } elseif ($Status -eq "ERROR") {
        Write-Host "  [ERROR] $Message" -ForegroundColor Red
    } else {
        Write-Host "  [ ] $Message" -ForegroundColor Gray
    }
}

# ================================================================================
# PASO 1: Verificar Git
# ================================================================================
Write-Host "`nPASO 1: Verificando Git..." -ForegroundColor Yellow

try {
    $gitVersion = git --version 2>&1
    if ($?) {
        Show-Status "Git instalado: $gitVersion" "OK"
    } else {
        Show-Status "Git no encontrado" "ERROR"
        exit 1
    }
} catch {
    Show-Status "Error al verificar Git" "ERROR"
    exit 1
}

# ================================================================================
# PASO 2: Inicializar repositorio (si no existe)
# ================================================================================
Write-Host "`nPASO 2: Inicializando repositorio..." -ForegroundColor Yellow

if (-not (Test-Path ".git")) {
    Show-Status "Inicializando git..." "INFO"
    git init
    Show-Status "Repositorio inicializado" "OK"
} else {
    Show-Status "Repositorio ya inicializado" "OK"
}

# ================================================================================
# PASO 3: Configurar remote
# ================================================================================
Write-Host "`nPASO 3: Configurando remote..." -ForegroundColor Yellow

$existingRemote = git remote get-url origin 2>&1
if ($?) {
    Show-Status "Remote ya configurado: $existingRemote" "OK"
    
    # Verificar si es el mismo URL
    if ($existingRemote -ne $RepoUrl) {
        Show-Status "Cambiando remote a: $RepoUrl" "INFO"
        git remote set-url origin $RepoUrl
    }
} else {
    Show-Status "Agregando remote: $RepoUrl" "INFO"
    git remote add origin $RepoUrl
    Show-Status "Remote agregado" "OK"
}

# ================================================================================
# PASO 4: Crear y configurar rama main
# ================================================================================
Write-Host "`nPASO 4: Configurando rama main..." -ForegroundColor Yellow

# Asegurar que estamos en main
$currentBranch = git branch --show-current 2>&1
if ($currentBranch -ne "main") {
    Show-Status "Creando rama main..." "INFO"
    git branch -M main
    Show-Status "Rama main creada" "OK"
} else {
    Show-Status "Ya estamos en rama main" "OK"
}

# Hacer commit inicial si no hay commits
$hasCommits = git log --oneline 2>&1
if (-not $?) {
    Show-Status "Creando commit inicial..." "INFO"
    
    # Agregar todos los archivos
    git add .
    git commit -m "Initial commit: Proyecto de Software Seguro - Sistema ML de Análisis de Vulnerabilidades"
    
    Show-Status "Commit inicial creado" "OK"
} else {
    Show-Status "Ya existen commits" "OK"
}

# ================================================================================
# PASO 5: Crear rama dev
# ================================================================================
Write-Host "`nPASO 5: Creando rama dev..." -ForegroundColor Yellow

$devExists = git show-ref --verify --quiet refs/heads/dev
if ($?) {
    Show-Status "Rama dev ya existe" "OK"
} else {
    Show-Status "Creando rama dev desde main..." "INFO"
    git checkout -b dev
    Show-Status "Rama dev creada" "OK"
}

# ================================================================================
# PASO 6: Crear rama test
# ================================================================================
Write-Host "`nPASO 6: Creando rama test..." -ForegroundColor Yellow

# Volver a main para crear test
git checkout main 2>&1 | Out-Null

$testExists = git show-ref --verify --quiet refs/heads/test
if ($?) {
    Show-Status "Rama test ya existe" "OK"
} else {
    Show-Status "Creando rama test desde main..." "INFO"
    git checkout -b test
    Show-Status "Rama test creada" "OK"
}

# ================================================================================
# PASO 7: Push de todas las ramas
# ================================================================================
Write-Host "`nPASO 7: Subiendo ramas a GitHub..." -ForegroundColor Yellow

# Push main
git checkout main 2>&1 | Out-Null
Show-Status "Subiendo rama main..." "INFO"
$pushResult = git push -u origin main 2>&1
if ($?) {
    Show-Status "Rama main subida" "OK"
} else {
    if ($pushResult -match "up-to-date") {
        Show-Status "Rama main ya está actualizada" "OK"
    } else {
        Show-Status "Error al subir main: $pushResult" "ERROR"
    }
}

# Push test
git checkout test 2>&1 | Out-Null
Show-Status "Subiendo rama test..." "INFO"
$pushResult = git push -u origin test 2>&1
if ($?) {
    Show-Status "Rama test subida" "OK"
} else {
    if ($pushResult -match "up-to-date") {
        Show-Status "Rama test ya está actualizada" "OK"
    } else {
        Show-Status "Error al subir test: $pushResult" "ERROR"
    }
}

# Push dev
git checkout dev 2>&1 | Out-Null
Show-Status "Subiendo rama dev..." "INFO"
$pushResult = git push -u origin dev 2>&1
if ($?) {
    Show-Status "Rama dev subida" "OK"
} else {
    if ($pushResult -match "up-to-date") {
        Show-Status "Rama dev ya está actualizada" "OK"
    } else {
        Show-Status "Error al subir dev: $pushResult" "ERROR"
    }
}

# ================================================================================
# PASO 8: Proteger ramas test y main en GitHub
# ================================================================================
Write-Host "`nPASO 8: Configuración de protección de ramas" -ForegroundColor Yellow

Show-Status "MANUAL: Protege las ramas test y main en GitHub:" "INFO"
Write-Host @"

  1. Ve a GitHub: Settings > Branches > Add rule
  
  2. Para la rama 'test':
     - Branch name pattern: test
     - [x] Require pull request reviews before merging
     - [x] Require status checks to pass (Security ML Analysis)
     - [x] Include administrators
  
  3. Para la rama 'main':
     - Branch name pattern: main
     - [x] Require pull request reviews before merging
     - [x] Require status checks to pass
     - [x] Include administrators

"@ -ForegroundColor Gray

# ================================================================================
# RESUMEN FINAL
# ================================================================================
Write-Host @"

================================================================================
  CONFIGURACION COMPLETADA
================================================================================
"@ -ForegroundColor Cyan

Write-Host "`nESTRUCTURA DE RAMAS:" -ForegroundColor Yellow
Write-Host "  dev   -> Rama de desarrollo (commits diarios)" -ForegroundColor Green
Write-Host "  test  -> Rama de pruebas (PR desde dev)" -ForegroundColor Yellow
Write-Host "  main  -> Rama principal (PR desde test)" -ForegroundColor Cyan

Write-Host "`nFLUJO DE TRABAJO:" -ForegroundColor Yellow
Write-Host "  1. Desarrolla en rama 'dev'" -ForegroundColor White
Write-Host "  2. Crea PR: dev → test (activa análisis ML)" -ForegroundColor White
Write-Host "  3. Si pasa análisis, merge a 'test'" -ForegroundColor White
Write-Host "  4. Crea PR: test → main" -ForegroundColor White
Write-Host "  5. Merge a 'main' (versión estable)" -ForegroundColor White

Write-Host "`nRAMA ACTUAL:" -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host "  Estás en rama: $currentBranch" -ForegroundColor Green

Write-Host "`nPROXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "  1. Ejecuta: .\create-secure-pr.ps1" -ForegroundColor White
Write-Host "  2. Ejecuta: .\create-vulnerable-pr.ps1" -ForegroundColor White
Write-Host "  3. Ve a GitHub para ver los resultados" -ForegroundColor White

Write-Host @"

================================================================================
"@ -ForegroundColor Cyan
