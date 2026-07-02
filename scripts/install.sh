#!/usr/bin/env bash
set -euo pipefail

REPO="alessiobacin/website2markdown"
BRANCH="main"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.w2m}"

# ── colours ──────────────────────────────────────────────────────────
BOLD='\033[1m'; DIM='\033[2m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

info()  { printf "${GREEN}✔${NC} %s\n" "$1"; }
warn()  { printf "${RED}✖${NC} %s\n" "$1"; }
step()  { printf "${BOLD}%s${NC} %s" "$1" "... "; }
ok()    { printf "${GREEN}✓${NC}\n"; }

# ── parse arguments ────────────────────────────────────────────────────
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --token)
      if [[ -n "${2:-}" ]]; then
        GITHUB_TOKEN="$2"
        shift 2
      else
        warn "Missing value for --token"
        exit 1
      fi
      ;;
    --install-dir)
      if [[ -n "${2:-}" ]]; then
        INSTALL_DIR="$2"
        shift 2
      else
        warn "Missing value for --install-dir"
        exit 1
      fi
      ;;
    --help)
      echo "Usage: install.sh [--token <github_token>] [--install-dir <path>]"
      echo ""
      echo "Installa w2m (website2markdown) globalmente."
      echo ""
      echo "Opzioni:"
      echo "  --token <token>       GitHub personal access token per repo privato"
      echo "  --install-dir <path>  Directory di installazione (default: ~/.w2m)"
      echo ""
      echo "Variabili d'ambiente:"
      echo "  GITHUB_TOKEN          Token GitHub (alternativa a --token)"
      exit 0
      ;;
    *)
      warn "Opzione sconosciuta: $1. Usa --help per vedere le opzioni."
      exit 1
      ;;
  esac
done

# ── prerequisiti ──────────────────────────────────────────────────────
step "Node.js"
if ! command -v node &>/dev/null; then
  warn "Node.js non trovato. Installalo da https://nodejs.org (versione 18+)"
  exit 1
fi
NODE_VER=$(node -v | sed 's/v//; s/\..*//')
if [ "$NODE_VER" -lt 18 ]; then
  warn "Node.js >= 18 richiesto (trovato: $(node -v))"
  exit 1
fi
ok

step "npm"
if ! command -v npm &>/dev/null; then
  warn "npm non trovato."
  exit 1
fi
ok

# ── download & install ────────────────────────────────────────────────

# Strategy 1: GITHUB_TOKEN present → git clone with token auth
if [ -n "$GITHUB_TOKEN" ]; then
  step "Clona con token GitHub"
  if ! command -v git &>/dev/null; then
    warn "git non trovato. Necessario per clonare con token."
    exit 1
  fi
  rm -rf "$INSTALL_DIR"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --depth 1 --branch "$BRANCH" "https://oauth2:${GITHUB_TOKEN}@github.com/${REPO}.git" "$INSTALL_DIR" 2>/dev/null
  ok

  step "Installa dipendenze"
  cd "$INSTALL_DIR"
  npm install --silent 2>/dev/null
  ok

  step "Compila TypeScript"
  npx tsc 2>/dev/null
  ok

  step "Collega comando w2m"
  npm link --silent 2>/dev/null
  ok

# Strategy 2: gh CLI disponibile → gh repo clone
elif command -v gh &>/dev/null; then
  step "Clona con gh CLI"
  TMP_DIR=$(mktemp -d)
  gh repo clone "$REPO" "$TMP_DIR" -- --depth 1 --branch "$BRANCH" 2>/dev/null
  rm -rf "$INSTALL_DIR"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  mv "$TMP_DIR" "$INSTALL_DIR"
  ok

  step "Installa dipendenze"
  cd "$INSTALL_DIR"
  npm install --silent 2>/dev/null
  ok

  step "Compila TypeScript"
  npx tsc 2>/dev/null
  ok

  step "Collega comando w2m"
  npm link --silent 2>/dev/null
  ok

# Strategy 3: Fallback → npm install -g direttamente da GitHub
else
  step "Installa via npm da GitHub"
  npm install -g "github:${REPO}" --silent 2>/dev/null
  ok
fi

# ── done ──────────────────────────────────────────────────────────────
INSTALL_PATH="${INSTALL_DIR:-$(npm root -g)/website2markdown}"
cat <<EOF

${GREEN}┌─────────────────────────────────────────────────────────┐${NC}
${GREEN}│  w2m installato!                                        │${NC}
${GREEN}└─────────────────────────────────────────────────────────┘${NC}

  Usa:  w2m --help

  Esempi:
    w2m status --api-url http://localhost:3004 --api-key la-tua-chiave
    w2m single https://example.com
    w2m robots github.com

  Configurazione (env):
    export W2M_API_URL=http://localhost:3004
    export W2M_API_KEY=la-tua-chiave

${DIM}  Per rimuovere: npm uninstall -g website2markdown${NC}

  Attenzione: se il repository e' privato, questo script deve essere eseguito
  localmente (dopo aver clonato il repo). Le opzioni sono:

    1. Clona con token:  git clone https://<token>@github.com/alessiobacin/website2markdown.git
       poi:              cd website2markdown && bash scripts/install.sh

    2. Installa diretto: GITHUB_TOKEN=<token> bash scripts/install.sh

    3. Via npm:          npm install -g github:alessiobacin/website2markdown

    4. Via npx:          npx github:alessiobacin/website2markdown w2m --help
EOF
