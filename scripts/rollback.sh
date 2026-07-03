#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
# Cuídarte Venezuela — Emergency Rollback
# ═══════════════════════════════════════════════════════════════════
# Usage: 
#   ./scripts/rollback.sh --env qas [--backup <dir>]
#   ./scripts/rollback.sh --env prd [--backup <dir>]
#
# If --backup is omitted, uses the most recent backup found.
# ═══════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ─── Parse arguments ─────────────────────────────────────────────
ENV=""
BACKUP_DIR=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --env) ENV="$2"; shift 2 ;;
        --backup) BACKUP_DIR="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [ -z "$ENV" ] || [ "$ENV" != "qas" -a "$ENV" != "prd" ]; then
    echo "Usage: $0 --env qas|prd [--backup <dir>]"
    exit 1
fi

# ─── Find backup ─────────────────────────────────────────────────
if [ -z "$BACKUP_DIR" ]; then
    BACKUP_BASE="${PROJECT_DIR}/bak/${ENV}"
    if [ ! -d "$BACKUP_BASE" ]; then
        echo "No backups found in ${BACKUP_BASE}"
        exit 1
    fi
    BACKUP_DIR=$(ls -dt "${BACKUP_BASE}"/cuidartevzla-* 2>/dev/null | head -1)
    if [ -z "$BACKUP_DIR" ]; then
        echo "No backups found in ${BACKUP_BASE}"
        exit 1
    fi
    echo "Auto-selected latest backup: ${BACKUP_DIR}"
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Backup directory not found: ${BACKUP_DIR}"
    exit 1
fi

# ─── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; MAGENTA='\033[1;35m'; NC='\033[0m'
pass() { echo -e "${GREEN}  ✓${NC} $1"; }
fail() { echo -e "${RED}  ✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }
info() { echo -e "${BLUE}  ℹ${NC} $1"; }

# ─── Environment-specific config ─────────────────────────────────
if [ "$ENV" = "qas" ]; then
    TARGET_URL="https://qas.cuidartevzla.com"
    FTP_HOST="${FTP_QAS_HOST:-ftp.equiposdecamping.com}"
    FTP_USER="${FTP_QAS_USER:-alex-qas@qas.cuidartevzla.com}"
    FTP_PASS="${FTP_QAS_PASS:-ElGato@2026}"
    FTP_REMOTE_DIR="${FTP_QAS_REMOTE_DIR:-/htdocs}"
else
    TARGET_URL="https://cuidartevzla.com"
    FTP_HOST="${FTP_PRD_HOST:-ftp.equiposdecamping.com}"
    FTP_USER="${FTP_PRD_USER:-alex-cuidartevzla@cuidartevzla.com}"
    FTP_PASS="${FTP_PRD_PASS:-3lG4t0@2026}"
    FTP_REMOTE_DIR="${FTP_PRD_REMOTE_DIR:-/voluntarios}"
fi

# ─── Confirmation ────────────────────────────────────────────────
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║  🔄 Emergency Rollback — ${ENV^^}                                  ║"
echo "╠═══════════════════════════════════════════════════════════════════╣"
echo "║  Target:  ${TARGET_URL}                          ║"
echo "║  Backup:  ${BACKUP_DIR}  ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${RED}⚠️  ESTO VA A SOBRESCRIBIR ${ENV^^} CON LA VERSIÓN DEL BACKUP${NC}"
echo ""
read -p "Escribe 'ROLLBACK' para confirmar: " CONFIRM

if [ "$CONFIRM" != "ROLLBACK" ]; then
    warn "Rollback cancelado."
    exit 0
fi

# ─── Check backup contents ───────────────────────────────────────
CODE_BACKUP=""
if [ -f "${BACKUP_DIR}/code.zip" ]; then
    CODE_BACKUP="${BACKUP_DIR}/code.zip"
elif [ -d "${BACKUP_DIR}/code" ]; then
    CODE_BACKUP="${BACKUP_DIR}/code"
else
    fail "No code backup found in ${BACKUP_DIR}"
fi

info "Using code backup: ${CODE_BACKUP}"

# ─── Restore code ────────────────────────────────────────────────
echo ""
echo "━━━ Restoring Code ━━━"

RESTORE_TMP="/tmp/cuidartevzla-rollback-$$"
rm -rf "$RESTORE_TMP"
mkdir -p "$RESTORE_TMP"

if [[ "$CODE_BACKUP" == *.zip ]]; then
    info "Extracting code backup..."
    unzip -q "$CODE_BACKUP" -d "$RESTORE_TMP"
    RESTORE_SRC="$RESTORE_TMP"
    # If zip had a 'code/' folder inside, use that
    if [ -d "${RESTORE_TMP}/code" ]; then
        RESTORE_SRC="${RESTORE_TMP}/code"
    fi
else
    RESTORE_SRC="$CODE_BACKUP"
fi

info "Uploading restored code to ${ENV^^}..."

# Delete current content first (preserving .env and api/config)
lftp -c "
set ftp:ssl-allow no
set ftp:ssl-force false
set ftp:ssl-protect-data false
set ftp:use-site-chmod false
set xfer:clobber on
open -u \"${FTP_USER}\",\"${FTP_PASS}\" ${FTP_HOST}
mirror --reverse --verbose --parallel=4 --delete ${RESTORE_SRC}/ ${FTP_REMOTE_DIR}/
" 2>&1

rm -rf "$RESTORE_TMP"
pass "Code restored to ${ENV^^}"

# ─── Smoke tests ─────────────────────────────────────────────────
echo ""
echo "━━━ Post-Rollback Smoke Tests ━━━"

sleep 3

smoke() {
    local name="$1" url="$2" check="${3:-}"
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url" 2>&1)
    if [ "$http_code" = "200" ]; then
        pass "$name (HTTP 200)"
    else
        fail "$name — HTTP $http_code (rollback may have failed!)"
    fi
}

smoke "Frontend"     "${TARGET_URL}/"
smoke "API hospitals" "${TARGET_URL}/api/hospitales.php"

echo ""
pass "Rollback complete — ${ENV^^} is now running the backup version from $(basename "$BACKUP_DIR")"

exit 0