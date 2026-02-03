# ================================================================================
# Script para limpiar branches de prueba
# Elimina los branches creados por los scripts de prueba
# ================================================================================

Write-Host @"
================================================================================
  LIMPIAR BRANCHES DE PRUEBA
================================================================================
"@ -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "security_ml")) {
    Write-Host "[ERROR] Ejecuta este script desde el directorio raiz del proyecto" -ForegroundColor Red
    exit 1
}

# ================================================================================
# PASO 1: Volver a rama dev
# ================================================================================
Write-Host "`n[1/4] Cambiando a rama dev..." -ForegroundColor Yellow
git checkout dev 2>&1 | Out-Null
Write-Host "[OK] En rama dev" -ForegroundColor Green

# ================================================================================
# PASO 2: Obtener lista de branches de prueba
# ================================================================================
Write-Host "`n[2/4] Buscando branches de prueba..." -ForegroundColor Yellow

$localBranches = git branch | Select-String "test/secure-code" | ForEach-Object { $_.ToString().Trim() -replace '^\* ', '' }
$localBranches += git branch | Select-String "test/vulnerable-code" | ForEach-Object { $_.ToString().Trim() -replace '^\* ', '' }
$localBranches = $localBranches | Where-Object { $_ -ne "" }

if ($localBranches.Count -eq 0) {
    Write-Host "[INFO] No hay branches locales de prueba para eliminar" -ForegroundColor Yellow
} else {
    Write-Host "[INFO] Encontrados $($localBranches.Count) branches locales:" -ForegroundColor Cyan
    foreach ($branch in $localBranches) {
        Write-Host "  - $branch" -ForegroundColor Gray
    }
}

# ================================================================================
# PASO 3: Eliminar branches locales
# ================================================================================
if ($localBranches.Count -gt 0) {
    Write-Host "`n[3/4] Eliminando branches locales..." -ForegroundColor Yellow
    
    $confirm = Read-Host "Eliminar $($localBranches.Count) branches locales? (s/n)"
    if ($confirm -eq "s") {
        foreach ($branch in $localBranches) {
            git branch -D $branch 2>&1 | Out-Null
            if ($?) {
                Write-Host "[OK] Eliminado: $branch" -ForegroundColor Green
            } else {
                Write-Host "[ERROR] No se pudo eliminar: $branch" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "[CANCELADO] No se eliminaron branches locales" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[3/4] No hay branches locales para eliminar" -ForegroundColor Yellow
}

# ================================================================================
# PASO 4: Eliminar branches remotos
# ================================================================================
Write-Host "`n[4/4] Buscando branches remotos de prueba..." -ForegroundColor Yellow

$hasRemote = git remote get-url origin 2>&1
if (-not $?) {
    Write-Host "[INFO] No hay remote configurado, saltando eliminacion remota" -ForegroundColor Yellow
} else {
    # Actualizar referencias remotas
    git fetch --prune 2>&1 | Out-Null
    
    $remoteBranches = git branch -r | Select-String "origin/test/secure-code" | ForEach-Object { $_.ToString().Trim() -replace 'origin/', '' }
    $remoteBranches += git branch -r | Select-String "origin/test/vulnerable-code" | ForEach-Object { $_.ToString().Trim() -replace 'origin/', '' }
    $remoteBranches = $remoteBranches | Where-Object { $_ -ne "" }
    
    if ($remoteBranches.Count -eq 0) {
        Write-Host "[INFO] No hay branches remotos de prueba para eliminar" -ForegroundColor Yellow
    } else {
        Write-Host "[INFO] Encontrados $($remoteBranches.Count) branches remotos:" -ForegroundColor Cyan
        foreach ($branch in $remoteBranches) {
            Write-Host "  - $branch" -ForegroundColor Gray
        }
        
        $confirm = Read-Host "`nEliminar $($remoteBranches.Count) branches remotos? (s/n)"
        if ($confirm -eq "s") {
            foreach ($branch in $remoteBranches) {
                git push origin --delete $branch 2>&1 | Out-Null
                if ($?) {
                    Write-Host "[OK] Eliminado remoto: $branch" -ForegroundColor Green
                } else {
                    Write-Host "[ERROR] No se pudo eliminar remoto: $branch" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "[CANCELADO] No se eliminaron branches remotos" -ForegroundColor Yellow
        }
    }
}

# ================================================================================
# PASO 5: Eliminar archivos de prueba
# ================================================================================
Write-Host "`n[5/5] Eliminando archivos de prueba..." -ForegroundColor Yellow

$testFiles = @(
    "backend/src/presentation/controllers/TestSecureController.ts",
    "backend/src/presentation/controllers/TestVulnerableController.ts"
)

$foundFiles = $testFiles | Where-Object { Test-Path $_ }

if ($foundFiles.Count -gt 0) {
    Write-Host "[INFO] Encontrados $($foundFiles.Count) archivos de prueba:" -ForegroundColor Cyan
    foreach ($file in $foundFiles) {
        Write-Host "  - $file" -ForegroundColor Gray
    }
    
    $confirm = Read-Host "`nEliminar archivos de prueba? (s/n)"
    if ($confirm -eq "s") {
        foreach ($file in $foundFiles) {
            Remove-Item $file -Force
            Write-Host "[OK] Eliminado: $file" -ForegroundColor Green
        }
        
        # Commit de eliminacion
        $hasChanges = git status --porcelain
        if ($hasChanges) {
            Write-Host "`n[INFO] Haciendo commit de limpieza..." -ForegroundColor Yellow
            git add .
            git commit -m "chore: eliminar archivos de prueba ML"
            
            $pushConfirm = Read-Host "Push de cambios? (s/n)"
            if ($pushConfirm -eq "s") {
                git push
                Write-Host "[OK] Cambios subidos" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "[CANCELADO] No se eliminaron archivos de prueba" -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] No hay archivos de prueba para eliminar" -ForegroundColor Yellow
}

# ================================================================================
# RESUMEN
# ================================================================================
Write-Host @"

================================================================================
  LIMPIEZA COMPLETADA
================================================================================
"@ -ForegroundColor Green

Write-Host "`nESTADO ACTUAL:" -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host "  Rama actual: $currentBranch" -ForegroundColor Green

$remainingBranches = git branch | Select-String "test/" | Measure-Object
Write-Host "  Branches de prueba restantes: $($remainingBranches.Count)" -ForegroundColor White

Write-Host @"

================================================================================
"@ -ForegroundColor Cyan
