<#
.SYNOPSIS
    Installa w2m (website2markdown) CLI globalmente su Windows.

.DESCRIPTION
    Scarica, compila e collega globalmente il comando w2m.

.PARAMETER InstallDir
    Directory di installazione (default: ~\.w2m).

.EXAMPLE
    .\install.ps1
#>

param(
    [string]$InstallDir
)

$Repo = "alessiobacin/website2markdown"
$Branch = "main"

if (-not $InstallDir) {
    $InstallDir = "$env:USERPROFILE\.w2m"
}

# ── helper functions ──────────────────────────────────────────────────
function Write-Step {
    param([string]$Message)
    Write-Host -NoNewline "$Message ... "
}

function Write-Ok {
    Write-Host "OK" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "ERRORE: $Message" -ForegroundColor Red
}

# ── prerequisiti ──────────────────────────────────────────────────────
Write-Step "Node.js"
try {
    $nodeVersion = node -v 2>$null
    if (-not $nodeVersion) { throw "Node.js non trovato" }
    $majorVersion = [int]($nodeVersion -replace 'v', '' -replace '\..*', '')
    if ($majorVersion -lt 18) {
        Write-Warn "Node.js >= 18 richiesto (trovato: $nodeVersion)"
        exit 1
    }
} catch {
    Write-Warn "Node.js non trovato. Installalo da https://nodejs.org (versione 18+)"
    exit 1
}
Write-Ok

Write-Step "npm"
try {
    $npmVersion = npm -v 2>$null
    if (-not $npmVersion) { throw "npm non trovato" }
} catch {
    Write-Warn "npm non trovato."
    exit 1
}
Write-Ok

# ── download ──────────────────────────────────────────────────────────
Write-Step "Scarica ${Repo}"

if (Get-Command git -ErrorAction SilentlyContinue) {
    # git clone
    if (Test-Path $InstallDir) {
        Remove-Item -Recurse -Force $InstallDir -ErrorAction SilentlyContinue
    }
    $null = New-Item -ItemType Directory -Path $InstallDir -Force -ErrorAction SilentlyContinue
    git clone --depth 1 --branch $Branch "https://github.com/${Repo}.git" $InstallDir 2>$null
} else {
    # fallback: download zip
    $zipUrl = "https://github.com/${Repo}/archive/refs/heads/${Branch}.zip"
    $zipPath = "$env:TEMP\w2m.zip"
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    if (Test-Path $InstallDir) {
        Remove-Item -Recurse -Force $InstallDir -ErrorAction SilentlyContinue
    }
    Expand-Archive -Path $zipPath -DestinationPath "$env:TEMP\w2m-tmp" -Force
    $extracted = Get-ChildItem "$env:TEMP\w2m-tmp" | Select-Object -First 1
    Move-Item -Path $extracted.FullName -Destination $InstallDir -Force
    Remove-Item -Recurse -Force "$env:TEMP\w2m-tmp" -ErrorAction SilentlyContinue
    Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
}
Write-Ok

# ── build ─────────────────────────────────────────────────────────────
Push-Location $InstallDir
try {
    Write-Step "Installa dipendenze"
    npm install --silent 2>$null
    Write-Ok

    Write-Step "Compila TypeScript"
    npx tsc 2>$null
    & chmod +x "$InstallDir/dist/cli/index.js" 2>$null
    Write-Ok

    Write-Step "Collega comando w2m"
    npm link --silent 2>$null
    Write-Ok
}
finally {
    Pop-Location
}

# ── done ──────────────────────────────────────────────────────────────
Write-Host @"

┌─────────────────────────────────────────────────────────┐
│  w2m installato!                                        │
└─────────────────────────────────────────────────────────┘

  Usa:  w2m --help

  Esempi:
    w2m status --api-url http://localhost:3004 --api-key la-tua-chiave
    w2m single https://example.com
    w2m robots github.com

  Configurazione (env):
    set W2M_API_URL=http://localhost:3004
    set W2M_API_KEY=la-tua-chiave

  Per rimuovere: npm uninstall -g website2markdown
"@ -ForegroundColor Green
