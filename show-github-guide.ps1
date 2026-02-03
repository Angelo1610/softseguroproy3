# Guía Rápida de Pruebas con GitHub
# Ejecutar: .\show-github-guide.ps1

Clear-Host

Write-Host @"
================================================================================
        GUIA RAPIDA - PROBAR SISTEMA ML CON GITHUB
================================================================================
"@ -ForegroundColor Cyan

Write-Host @"

PASO 1: CONFIGURAR GITHUB
--------------------------
"@ -ForegroundColor Yellow

Write-Host @"
1. Crea un repositorio en GitHub (si no tienes uno):
   https://github.com/new

2. Configura el remote:
"@ -ForegroundColor White

Write-Host @"
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git branch -M main
   git add .
   git commit -m "initial commit"
   git push -u origin main
"@ -ForegroundColor Gray

Write-Host @"

PASO 2: CONFIGURAR SECRETS (OPCIONAL)
--------------------------------------
"@ -ForegroundColor Yellow

Write-Host @"
Para notificaciones de Telegram:

1. Crear bot en Telegram:
   - Busca @BotFather
   - Envia: /newbot
   - Guarda el TOKEN

2. Obtener Chat ID:
   - Busca @userinfobot
   - Envia: /start
   - Guarda tu CHAT_ID

3. En GitHub:
   Settings > Secrets and variables > Actions > New secret
   
   Agregar:
   - TELEGRAM_BOT_TOKEN: tu_token
   - TELEGRAM_CHAT_ID: tu_chat_id
"@ -ForegroundColor White

Write-Host @"

PASO 3: PROBAR CON PR SEGURO
-----------------------------
"@ -ForegroundColor Yellow

Write-Host @"
Ejecutar script automatico:
"@ -ForegroundColor White

Write-Host @"
   .\create-secure-pr.ps1
"@ -ForegroundColor Green

Write-Host @"

Resultado esperado:
"@ -ForegroundColor White

Write-Host @"
   [OK] Analisis de Seguridad - APROBADO
   [OK] Codigo SEGURO
   [OK] Merge permitido
"@ -ForegroundColor Green

Write-Host @"

PASO 4: PROBAR CON PR VULNERABLE
---------------------------------
"@ -ForegroundColor Yellow

Write-Host @"
Ejecutar script automatico:
"@ -ForegroundColor White

Write-Host @"
   .\create-vulnerable-pr.ps1
"@ -ForegroundColor Red

Write-Host @"

Resultado esperado:
"@ -ForegroundColor White

Write-Host @"
   [ERROR] Vulnerabilidades detectadas
   [ERROR] Merge bloqueado
   [AUTO] Issue creada
   [AUTO] Notificacion Telegram enviada
"@ -ForegroundColor Red

Write-Host @"

PASO 5: VER RESULTADOS EN GITHUB
---------------------------------
"@ -ForegroundColor Yellow

Write-Host @"
1. Ve al Pull Request en GitHub
2. Tab "Checks" - Ver analisis ML en ejecución
3. Tab "Conversation" - Ver comentario automatico del bot
4. Tab "Actions" - Ver logs detallados

Si es VULNERABLE:
- Merge estará bloqueado con X roja
- Comentario detallado con tipo de vulnerabilidad
- Issue creada automaticamente
- Etiqueta 'security-vulnerability' agregada
"@ -ForegroundColor White

Write-Host @"

PASO 6: LIMPIAR PRUEBAS
------------------------
"@ -ForegroundColor Yellow

Write-Host @"
Cuando termines de probar:
"@ -ForegroundColor White

Write-Host @"
   .\cleanup-test-prs.ps1
"@ -ForegroundColor Green

Write-Host @"

COMANDOS UTILES
---------------
"@ -ForegroundColor Yellow

Write-Host @"
# Ver estado del repositorio
git status

# Ver branches
git branch -a

# Ver workflow en GitHub CLI
gh workflow list
gh run list
gh pr list

# Ver logs del ultimo run
gh run view

# Crear PR desde consola
gh pr create --title "Titulo" --body "Descripcion"
"@ -ForegroundColor Gray

Write-Host @"

ARCHIVOS DE AYUDA
-----------------
"@ -ForegroundColor Yellow

Write-Host @"
  security_ml/GITHUB_TESTING.md  - Guia completa de pruebas
  security_ml/QUICKSTART.md      - Inicio rapido del sistema
  security_ml/README.md          - Documentacion completa
  
  create-secure-pr.ps1           - Script para PR seguro
  create-vulnerable-pr.ps1       - Script para PR vulnerable
  cleanup-test-prs.ps1           - Script para limpiar pruebas
"@ -ForegroundColor White

Write-Host @"

VERIFICAR ANTES DE EMPEZAR
--------------------------
"@ -ForegroundColor Yellow

$checks = @(
    @{Name="Git instalado"; Command="git --version"},
    @{Name="Modelo entrenado"; Path="security_ml/model.joblib"},
    @{Name="Workflow configurado"; Path=".github/workflows/security-ml-analysis.yml"}
)

foreach ($check in $checks) {
    Write-Host "  [ ] $($check.Name)..." -NoNewline
    
    if ($check.Command) {
        try {
            $result = Invoke-Expression $check.Command 2>&1
            if ($?) {
                Write-Host " OK" -ForegroundColor Green
            } else {
                Write-Host " FALTA" -ForegroundColor Red
            }
        } catch {
            Write-Host " FALTA" -ForegroundColor Red
        }
    } elseif ($check.Path) {
        if (Test-Path $check.Path) {
            Write-Host " OK" -ForegroundColor Green
        } else {
            Write-Host " FALTA" -ForegroundColor Red
        }
    }
}

Write-Host @"

================================================================================
        LISTO PARA EMPEZAR!
================================================================================

Siguiente paso: Configura el remote de GitHub y ejecuta:
  .\create-secure-pr.ps1

"@ -ForegroundColor Cyan

# Preguntar si quiere ver la guía completa
$viewFull = Read-Host "`nVer guia completa de GitHub? (s/n)"
if ($viewFull -eq "s") {
    code security_ml/GITHUB_TESTING.md
}
