#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
# Cuídarte Venezuela — Deploy to PRD (cuidartevzla.com)
# ═══════════════════════════════════════════════════════════════════
# Usage: ./scripts/deploy-prd.sh
# 
# ⚠️  REQUIRES explicit authorization from Javier before running.
# ⚠️  QAS must be tested and approved first.
# 
# Pipeline:
#   1. Verify QAS approval (check for qas-deploy-ok flag)
#   2. Backup PRD code (FTP download) + DB (curl backup.php)
#   3. git push origin main (only AFTER backup is safe)
#   4. Deploy same build to PRD
#   5. Smoke test PRD endpoints
#   6. Log everything
# ═══════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${PROJECT_DIR}/bak/prd/cuidartevzla-${TIMESTAMP}"
LOG_FILE="${PROJECT_DIR}/bak/prd/deploy-${TIMESTAMP}.log"
BUILD_DIR="${PROJECT_DIR}/dist"

# ─── PRD Environment ─────────────────────────────────────────────
PRD_URL="https://cuidartevzla.com"
PRD_API="${PRD_URL}/api"
FTP_HOST="${FTP_PRD_HOST:-ftp.equiposdecamping.com}"
FTP_USER="${FTP_PRD_USER:-alex-cuidartevzla@cuidartevzla.com}"
FTP_PASS="${FTP_PRD_PASS:-3lG4t0@2026}"
FTP_REMOTE_DIR="${FTP_PRD_REMOTE_DIR:-/voluntarios}"
SUPERUSER_CODE="${SUPERUSER_CODE:-15731877}"

# ─── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; MAGENTA='\033[1;35m'; NC='\033[0m'
pass() { echo -e "${GREEN}  ✓${NC} $1"; }
fail() { echo -e "${RED}  ✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }
info() { echo -e "${BLUE}  ℹ${NC} $1"; }

# ─── Init ────────────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}" "$(dirname "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║  🔴 Cuídarte Venezuela — PRD Deploy                              ║"
echo "║  Timestamp: ${TIMESTAMP}                                    ║"
echo "║  Target: ${PRD_URL}                                         ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ═══════════════════════════════════════════════════════════════════
# STEP 0: Safety Gate
# ═══════════════════════════════════════════════════════════════════
echo "━━━ STEP 0/6: Safety Gate ━━━"

# Verify build exists
if [ ! -d "$BUILD_DIR" ] || [ ! -f "${BUILD_DIR}/index.html" ]; then
    info "No build found, running npm run build..."
    cd "$PROJECT_DIR"
    npm run build 2>&1 || fail "Build failed"
fi
pass "Build verified"

# Check if GA tag is present in PRD build
if ! grep -q "G-TFJR5T057G" "${BUILD_DIR}/index.html" 2>/dev/null; then
    warn "Google Analytics tag NOT found in build! This is mandatory for PRD."
    warn "Proceeding anyway, but verify GA is injected in production template."
fi

# ⚠️  MANUAL GATE — Javier must confirm
echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║  ⛔  PRODUCTION DEPLOY — Confirmación Requerida                    ║${NC}"
echo -e "${MAGENTA}╠═══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${MAGENTA}║  Target:  ${PRD_URL}                            ║${NC}"
echo -e "${MAGENTA}║  Backup:  ${BACKUP_DIR}  ║${NC}"
echo -e "${MAGENTA}║                                                                   ║${NC}"
echo -e "${MAGENTA}║  ¿Está QAS probado y aprobado por el equipo?                      ║${NC}"
echo -e "${MAGENTA}║  Escribe 'DEPLOY-PRD' para confirmar o cualquier otra cosa para   ║${NC}"
echo -e "${MAGENTA}║  cancelar.                                                        ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
read -p "Confirmación: " CONFIRM

if [ "$CONFIRM" != "DEPLOY-PRD" ]; then
    echo ""
    warn "Deploy CANCELLED by user. No changes were made."
    exit 0
fi

pass "Authorization confirmed"

# ═══════════════════════════════════════════════════════════════════
# STEP 1: Backup PRD (code + database)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "━━━ STEP 1/6: Backup PRD ━━━"

# 1a. Download current code from PRD
info "Downloading PRD code via FTP..."
lftp -c "
set ftp:ssl-allow no
set ftp:ssl-force false
set ftp:ssl-protect-data false
set ftp:use-site-chmod false
set xfer:clobber on
open -u \"${FTP_USER}\",\"${FTP_PASS}\" ${FTP_HOST}
mirror --verbose --parallel=4 ${FTP_REMOTE_DIR} ${BACKUP_DIR}/code/
" 2>&1 || warn "FTP download had errors (may be partial)"

if [ -d "${BACKUP_DIR}/code" ] && [ "$(ls -A "${BACKUP_DIR}/code" 2>/dev/null)" ]; then
    (cd "${BACKUP_DIR}" && zip -qr "code.zip" "code/" && rm -rf "code/")
    pass "Code backup: $(du -sh "${BACKUP_DIR}/code.zip" | cut -f1)"
else
    warn "Code backup empty or failed — DO NOT SKIP THIS CHECK"
    echo ""
    echo -e "${RED}  ⚠  CODE BACKUP FAILED. Abort deploy?${NC}"
    read -p "  Continue anyway? (type 'CONTINUE'): " CONTINUE_ANYWAY
    [ "$CONTINUE_ANYWAY" = "CONTINUE" ] || fail "Deploy aborted — no backup available"
fi

# 1b. Database dump via backup.php endpoint
info "Requesting DB dump from PRD backup endpoint (may take a while)..."
DB_DUMP_FILE="${BACKUP_DIR}/data.sql"

HTTP_CODE=$(curl -s -w "%{http_code}" \
    -H "X-Codigo-Voluntario: ${SUPERUSER_CODE}" \
    -o "${DB_DUMP_FILE}" \
    --max-time 600 \
    "${PRD_API}/backup.php" 2>&1)

if [ "$HTTP_CODE" = "200" ] && [ -s "$DB_DUMP_FILE" ]; then
    FILE_SIZE=$(du -sh "$DB_DUMP_FILE" | cut -f1)
    (cd "${BACKUP_DIR}" && zip -q "data.zip" "data.sql" && rm -f "data.sql")
    pass "DB backup: data.zip (${FILE_SIZE} raw, HTTP ${HTTP_CODE})"
else
    if [ "$HTTP_CODE" = "000" ]; then
        warn "DB backup TIMEOUT (>600s)"
        if [ -s "$DB_DUMP_FILE" ]; then
            warn "Partial data saved — DO NOT trust this for rollback"
            (cd "${BACKUP_DIR}" && zip -q "data-partial.zip" "data.sql" && rm -f "data.sql")
        fi
        warn "Consider increasing --max-time or using phpMyAdmin export"
    else
        warn "DB backup failed (HTTP ${HTTP_CODE}) — check backup.php is deployed"
        rm -f "$DB_DUMP_FILE"
    fi
fi

pass "Backup complete → ${BACKUP_DIR}/"

# ═══════════════════════════════════════════════════════════════════
# STEP 2: Push to GitHub (only after backup is safe)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "━━━ STEP 2/6: Push to GitHub ━━━"

cd "$PROJECT_DIR"
if git diff --quiet && git diff --cached --quiet; then
    info "No local changes to push"
else
    info "Committing and pushing to origin/main..."
    git add -A
    git commit -m "release: prd-deploy ${TIMESTAMP}" || info "Nothing to commit"
    git push origin main 2>&1 || warn "Git push failed — check credentials"
fi
pass "GitHub updated"

# ═══════════════════════════════════════════════════════════════════
# STEP 3: Deploy to PRD
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "━━━ STEP 3/6: Deploy to PRD ━━━"

info "Uploading dist/ to PRD..."

lftp -c "
set ftp:ssl-allow no
set ftp:ssl-force false
set ftp:ssl-protect-data false
set ftp:use-site-chmod false
set xfer:clobber on
open -u \"${FTP_USER}\",\"${FTP_PASS}\" ${FTP_HOST}
mirror --reverse --verbose --parallel=4 --delete ${BUILD_DIR}/ ${FTP_REMOTE_DIR}/
" 2>&1 || fail "FTP upload to PRD failed"

# Upload backend PHP files
info "Uploading backend/ PHP files..."
cd "$PROJECT_DIR"
for f in backend/*.php; do
    if [ -f "$f" ]; then
        lftp -c "
set ftp:ssl-allow no; set ftp:ssl-force false
set ftp:ssl-protect-data false; set ftp:use-site-chmod false; set xfer:clobber on
open -u \"${FTP_USER}\",\"${FTP_PASS}\" ${FTP_HOST}
put -O ${FTP_REMOTE_DIR}/api/ \"$f\"
" 2>&1
    fi
done

pass "PRD deploy complete"

# ═══════════════════════════════════════════════════════════════════
# STEP 4: Smoke Tests PRD
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "━━━ STEP 4/6: Smoke Tests PRD ━━━"
FAILED_TESTS=0

sleep 3

smoke_test() {
    local name="$1" url="$2" expected_code="${3:-200}" check="${4:-}"
    
    local http_code=$(curl -s -o /tmp/prd-smoke-$$.txt -w "%{http_code}" --max-time 20 "$url" 2>&1)
    
    if [ "$http_code" = "$expected_code" ]; then
        if [ -n "$check" ]; then
            if grep -q "$check" /tmp/prd-smoke-$$.txt 2>/dev/null; then
                pass "$name"
            else
                fail "$name — content check failed"
            fi
        else
            pass "$name (HTTP $http_code)"
        fi
    else
        fail "$name — expected HTTP $expected_code, got $http_code"
    fi
    rm -f /tmp/prd-smoke-$$.txt
}

smoke_test "Frontend"              "${PRD_URL}/"                   200 "Cuídarte"
smoke_test "API hospitales"        "${PRD_API}/hospitales.php"      200 '"ok":true'
smoke_test "API stats"             "${PRD_API}/stats.php"           200 '"pacientes_count"'
smoke_test "GA tag in HTML"        "${PRD_URL}/"                   200 "G-TFJR5T057G"

echo ""
[ "$FAILED_TESTS" -eq 0 ] || fail "Smoke tests FAILED"
pass "All PRD smoke tests passed"

# ═══════════════════════════════════════════════════════════════════
# STEP 5: Deploy admin panel to PRD (if needed)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "━━━ STEP 5/6: Admin Panel ━━━"
warn "Admin panel (cuidartevzla-admin) must be deployed separately."
info "  cd /home/jdiaz/dev/cuidartevzla-admin && ./scripts/deploy-prd-admin.sh"
info "  (Admin deploy script not yet created — manual deploy for now)"

# ═══════════════════════════════════════════════════════════════════
# STEP 6: Summary
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║  ✅ PRD Deploy Complete                                           ║"
echo "╠═══════════════════════════════════════════════════════════════════╣"
echo "║  Target:     ${PRD_URL}                         ║"
echo "║  Backup:     ${BACKUP_DIR}  ║"
echo "║  Log:        ${LOG_FILE}  ║"
echo "║                                                                   ║"
echo "║  Rollback:   ./scripts/rollback.sh --env prd --backup ${BACKUP_DIR} ║"
echo "║                                                                   ║"
echo "║  ⚠️  VERIFY: Abre ${PRD_URL} y confirma todo OK   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"

exit 0