<#
.SYNOPSIS
    Installa w2m (website2markdown) CLI globalmente su Windows.

.DESCRIPTION
    Scarica, compila e collega globalmente il comando w2m.
    Supporta repo privati tramite token GitHub.

.PARAMETER GithubToken
    GitHub Personal Access Token per autenticazione su repo privato.
    Alternativa: impostare la variabile d'ambiente GITHUB_TOKEN.

.PARAMETER InstallDir
    Directory di installazione (default: ~/.w2m).

.PARAMETER Help
    Mostra questo messaggio di aiuto.

.EXAMPLE
    .\install.ps1

.EXAMPLE
    .\install.ps1 -GithubToken ghp_xxxxxxxxxxxx

.EXAMPLE
    $env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxx"
    .\install.ps1
#>

param(
    [string]$GithubToken,
    [string]$InstallDir,
    [switch]$Help
)

$Repo = "alessiobacin/website2markdown"
$Branch = "main"

if (-not $InstallDir) {
    $InstallDir = "$env:USERPROFILE\.w2m"
}

if (-not $GithubToken) {
    $GithubToken = $env:GITHUB_TOKEN
}

if ($Help) {
    Write-Host @"
Installazione di w2m (website2markdown)

Utilizzo: .\install.ps1 [opzioni]

Opzioni:
  -GithubToken <token>   GitHub Personal Access Token per repo privato
  -InstallDir <path>     Directory di installazione (default: ~\.w2m)
  -Help                  Mostra questo messaggio

Variabili d'ambiente:
  GITHUB_TOKEN           Token GitHub (alternativa a -GithubToken)

Esempi:
  .\install.ps1
  .\install.ps1 -GithubToken ghp_xxxxxxxxxxxx
"@
    exit 0
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

function Install-AndLink {
    param([string]$Dir)
    Push-Location $Dir
    try {
        Write-Step "Installa dipendenze"
        npm install --silent 2>$null
        Write-Ok

        Write-Step "Compila TypeScript"
        npx tsc 2>$null
        if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
            throw "TypeScript compilation fallita"
        }
        Write-Ok

        Write-Step "Collega comando w2m"
        npm link --silent 2>$null
        Write-Ok
    }
    finally {
        Pop-Location
    }
}

# ── download ──────────────────────────────────────────────────────────
if ($GithubToken) {
    # Strategy 1: Token presente → git clone con token auth
    Write-Step "Clona con token GitHub"
    $gitAvailable = Get-Command git -ErrorAction SilentlyContinue
    if (-not $gitAvailable) {
        Write-Warn "git non trovato. Necessario per clonare con token."
        exit 1
    }
    if (Test-Path $InstallDir) {
        Remove-Item -Recurse -Force $InstallDir -ErrorAction SilentlyContinue
    }
    $null = New-Item -ItemType Directory -Path $InstallDir -Force -ErrorAction SilentlyContinue
    $cloneUrl = "https://oauth2:${GithubToken}@github.com/${Repo}.git"
    git clone --depth 1 --branch $Branch $cloneUrl $InstallDir 2>$null
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        Write-Warn "git clone fallito. Verifica il token e la connettivita'."
        exit 1
    }
    Write-Ok

    Install-AndLink $InstallDir

} elseif (Get-Command gh -ErrorAction SilentlyContinue) {
    # Strategy 2: gh CLI disponibile
    Write-Step "Clona con gh CLI"
    $tmpDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), [System.Guid]::NewGuid().ToString())
    $null = New-Item -ItemType Directory -Path $tmpDir -Force
    gh repo clone $Repo $tmpDir -- --depth 1 --branch $Branch 2>$null
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        Write-Warn "gh repo clone fallito. Verifica che tu sia autenticato (gh auth login)."
        exit 1
    }
    if (Test-Path $InstallDir) {
        Remove-Item -Recurse -Force $InstallDir -ErrorAction SilentlyContinue
    }
    $null = New-Item -ItemType Directory -Path $InstallDir -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "$tmpDir\*" -Destination $InstallDir -Recurse -Force
    Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
    Write-Ok

    Install-AndLink $InstallDir

} else {
    # Strategy 3: Fallback → npm install -g direttamente da GitHub
    Write-Step "Installa via npm da GitHub"
    npm install -g "github:${Repo}" --silent 2>$null
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        Write-Warn "npm install fallito. Verifica la connettivita'."
        Write-Warn "Per repo privati, usa: `$env:GITHUB_TOKEN='<token>' .\install.ps1"
        exit 1
    }
    Write-Ok
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

  Nota: se il repository e' privato, usa una delle seguenti opzioni:
    1. .\install.ps1 -GithubToken <token>
    2. `$env:GITHUB_TOKEN = '<token>'; .\install.ps1
    3. npm install -g github:alessiobacin/website2markdown
    4. npx github:alessiobacin/website2markdown w2m --help
"@ -ForegroundColor Green
