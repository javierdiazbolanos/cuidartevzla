#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
# Cuídarte Venezuela — Deploy to QAS (qas.cuidartevzla.com)
# ═══════════════════════════════════════════════════════════════════
# Usage: ./scripts/deploy-qas.sh
# 
# Pipeline:
#   1. Build local → dist/
#   2. Backup QAS code (FTP download) + DB (curl backup.php)
#   3. Deploy dist/ + backend/ to QAS
#   4. Smoke test QAS endpoints
#   5. Log everything
# ═══════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${PROJECT_DIR}/bak/qas/cuidartevzla-${TIMESTAMP}"
LOG_FILE="${PROJECT_DIR}/bak/qas/deploy-${TIMESTAMP}.log"
BUILD_DIR="${PROJECT_DIR}/dist"

# ─── QAS Environment ─────────────────────────────────────────────
QAS_URL="https://qas.cuidartevzla.com"
QAS_API="${QAS_URL}/api"
FTP_HOST="${FTP_QAS_HOST:-ftp.equiposdecamping.com}"
FTP_USER="${FTP_QAS_USER:-alex-qas@qas.cuidartevzla.com}"
FTP_PASS="${FTP_QAS_PASS:-ElGato@2026}"
FTP_REMOTE_DIR="${FTP_QAS_REMOTE_DIR:-/htdocs}"
SUPERUSER_CODE="${SUPERUSER_CODE:-15731877}"

# ─── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'
pass() { echo -e "${GREEN}  ✓${NC} $1"; }
fail() { echo -e "${RED}  ✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }
info() { echo -e "${BLUE}  ℹ${NC} $1"; }

# ─── Init ────────────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}" "$(dirname "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║  Cuídarte Venezuela — QAS Deploy                                  ║"
echo "║  Timestamp: ${TIMESTAMP}                                    ║"
echo "║  Target: ${QAS_URL}                                           ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ═══════════════════════════════════════════════════════════════════
# STEP 1: Build
# ═══════════════════════════════════════════════════════════════════
echo "━━━ STEP 1/5: Build ━━━"
cd "$PROJECT_DIR"

info "Running npm ci..."
npm ci --silent 2>&1 || fail "npm ci failed"

info "Running npm run build..."
npm run build 2>&1 || fail "Build failed"

if [ ! -d "$BUILD_DIR" ]; then
    fail "dist/ directory not found after build"
fi
pass "Build complete ($(du -sh "$BUILD_DIR" | cut -f1))"

# ═══════════════════════════════════════════════════════════════════
# STEP 2: Backup QAS (code + database)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "━━━ STEP 2/5: Backup QAS ━━━"

# 2a. Download current code from QAS
info "Downloading QAS code via FTP..."
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
    warn "Code backup empty or failed — proceeding anyway"
fi

# 2b. Database dump via backup.php endpoint
info "Requesting DB dump from QAS backup endpoint (may take a while)..."
DB_DUMP_FILE="${BACKUP_DIR}/data.sql"

HTTP_CODE=$(curl -s -w "%{http_code}" \
    -H "X-Codigo-Voluntario: ${SUPERUSER_CODE}" \
    -o "${DB_DUMP_FILE}" \
    --max-time 300 \
    "${QAS_API}/backup.php" 2>&1)

if [ "$HTTP_CODE" = "200" ] && [ -s "$DB_DUMP_FILE" ]; then
    FILE_SIZE=$(du -sh "$DB_DUMP_FILE" | cut -f1)
    
    # Compress the SQL dump
    (cd "${BACKUP_DIR}" && zip -q "data.zip" "data.sql" && rm -f "data.sql")
    pass "DB backup: data.zip (${FILE_SIZE} raw, HTTP ${HTTP_CODE})"
else
    if [ "$HTTP_CODE" = "000" ]; then
        warn "DB backup TIMEOUT (>300s). This can happen with large databases."
        warn "Consider: (1) verify backup.php is deployed, (2) increase --max-time"
        if [ -s "$DB_DUMP_FILE" ]; then
            PARTIAL_SIZE=$(du -sh "$DB_DUMP_FILE" | cut -f1)
            warn "Partial data saved: ${PARTIAL_SIZE} (may be incomplete)"
            (cd "${BACKUP_DIR}" && zip -q "data-partial.zip" "data.sql" && rm -f "data.sql")
        else
            rm -f "$DB_DUMP_FILE"
            warn "No data received — backup skipped"
        fi
    else
        warn "DB backup failed (HTTP ${HTTP_CODE}) — check backup.php deployment"
        cat "$DB_DUMP_FILE" 2>/dev/null | head -5
        rm -f "$DB_DUMP_FILE"
    fi
fi

pass "Backup complete → ${BACKUP_DIR}/"

# ═══════════════════════════════════════════════════════════════════
# STEP 3: Deploy to QAS
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "━━━ STEP 3/5: Deploy to QAS ━━━"

info "Uploading dist/ to ${FTP_HOST}:${FTP_REMOTE_DIR}/..."

# Upload dist files
lftp -c "
set ftp:ssl-allow no
set ftp:ssl-force false
set ftp:ssl-protect-data false
set ftp:use-site-chmod false
set xfer:clobber on
open -u \"${FTP_USER}\",\"${FTP_PASS}\" ${FTP_HOST}
mirror --reverse --verbose --parallel=4 --delete ${BUILD_DIR}/ ${FTP_REMOTE_DIR}/
" 2>&1 || fail "FTP upload failed"

# Upload backend PHP files (but NOT .env!)
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

pass "Deploy complete"

# ═══════════════════════════════════════════════════════════════════
# STEP 4: Smoke Tests
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "━━━ STEP 4/5: Smoke Tests ━━━"
FAILED_TESTS=0

# Wait for server to pick up changes
sleep 2

smoke_test() {
    local name="$1" url="$2" expected_code="${3:-200}" check="${4:-}"
    
    local resp=$(curl -s -w "\n%{http_code}" --max-time 15 "$url" 2>&1)
    local http_code=$(echo "$resp" | tail -1)
    local body=$(echo "$resp" | sed '$d')
    
    if [ "$http_code" = "$expected_code" ]; then
        if [ -n "$check" ]; then
            if echo "$body" | grep -q "$check"; then
                pass "$name"
            else
                fail "$name — response didn't contain expected content"
            fi
        else
            pass "$name (HTTP $http_code)"
        fi
    else
        fail "$name — expected HTTP $expected_code, got $http_code"
    fi
}

smoke_test "Frontend HTML"           "${QAS_URL}/"                   200 "Cuídarte"
smoke_test "API hospitales"          "${QAS_API}/hospitales.php"      200 '"ok":true'
smoke_test "API stats"               "${QAS_API}/stats.php"           200 '"pacientes_count"'
smoke_test "API backup (auth check)" "${QAS_API}/backup.php"          403 "No autorizado"
smoke_test "API medicamentos"        "${QAS_API}/medicamentos.php"    200 '"ok":true'
smoke_test "API transporte"          "${QAS_API}/transporte.php"      200 '"ok":true'

echo ""
info "Failed tests: ${FAILED_TESTS}"
[ "$FAILED_TESTS" -eq 0 ] || fail "Smoke tests FAILED"

pass "All smoke tests passed"

# ═══════════════════════════════════════════════════════════════════
# STEP 5: Summary
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║  ✅ QAS Deploy Complete                                           ║"
echo "╠═══════════════════════════════════════════════════════════════════╣"
echo "║  Target:   ${QAS_URL}                           ║"
echo "║  Backup:   ${BACKUP_DIR}  ║"
echo "║  Log:      ${LOG_FILE}  ║"
echo "║  Rollback: ./scripts/rollback.sh --env qas --backup ${BACKUP_DIR} ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"

exit 0