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

# ── download ──────────────────────────────────────────────────────────
step "Scarica ${REPO}"
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

if command -v git &>/dev/null; then
  git clone --depth 1 --branch "$BRANCH" "https://github.com/${REPO}.git" "$INSTALL_DIR" 2>/dev/null
else
  TMPZIP=$(mktemp)
  curl -sSL "https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip" -o "$TMPZIP"
  unzip -q "$TMPZIP" -d "$INSTALL_DIR"
  mv "$INSTALL_DIR"/*/* "$INSTALL_DIR"/
  rm -f "$TMPZIP"
fi
ok

# ── build ─────────────────────────────────────────────────────────────
step "Installa dipendenze"
cd "$INSTALL_DIR"
npm install --silent 2>/dev/null
ok

step "Compila TypeScript"
npx tsc 2>/dev/null
chmod +x dist/cli/index.js
ok

# ── link globale ──────────────────────────────────────────────────────
step "Collega comando w2m"
npm link --silent 2>/dev/null
ok

# ── done ──────────────────────────────────────────────────────────────
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

${DIM}  Installato in: ${INSTALL_DIR}${NC}
${DIM}  Per rimuovere: npm uninstall -g website2markdown && rm -rf ${INSTALL_DIR}${NC}
EOF
