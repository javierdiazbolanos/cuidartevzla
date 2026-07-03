<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela — Database Backup Endpoint
 * 
 * Protected by superuser auth. Generates a complete SQL dump of all tables.
 * Designed for automated CI/CD backup scripts.
 * 
 * Usage:
 *   curl -H "X-Codigo-Voluntario: <superuser_code>" \
 *        https://qas.cuidartevzla.com/api/backup.php > backup.sql
 */

require_once __DIR__ . '/db.php';

// ─── Auth: Superuser only ───────────────────────────────────────────
$codigo = $_SERVER['HTTP_X_CODIGO_VOLUNTARIO'] 
       ?? $_GET['codigo'] 
       ?? '';

// Superuser codes — should match the main app's superusers
$superCodes = ['15731877', '4078817688'];

if (!in_array(trim($codigo), $superCodes, true)) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'No autorizado: Requiere código de superusuario']);
    exit;
}

// ─── Timeout & memory protection ────────────────────────────────────
set_time_limit(0);           // Disable PHP timeout for large DBs
ignore_user_abort(true);     // Continue even if client disconnects
ini_set('memory_limit', '512M');

// ─── Output headers ─────────────────────────────────────────────────
$timestamp = date('Ymd-His');
header('Content-Type: application/sql; charset=utf-8');
header('Content-Disposition: attachment; filename="cuidartevzla-backup-' . $timestamp . '.sql"');
header('X-Backup-Timestamp: ' . $timestamp);
header('X-Content-Type-Options: nosniff');

// ─── Helper: flush output in chunks ─────────────────────────────────
function flush_chunk(string $data): void {
    echo $data;
    if (ob_get_level() > 0) {
        ob_flush();
    }
    flush();
}

// ─── Dump header ────────────────────────────────────────────────────
$dbName = DB_NAME;
$now = date('Y-m-d H:i:s T');

flush_chunk("-- ================================================================\n");
flush_chunk("-- Cuídarte Venezuela — Database Backup\n");
flush_chunk("-- Generated: {$now}\n");
flush_chunk("-- Database: {$dbName}\n");
flush_chunk("-- ================================================================\n\n");
flush_chunk("SET NAMES utf8mb4;\n");
flush_chunk("SET FOREIGN_KEY_CHECKS = 0;\n\n");

// ─── Get tables ─────────────────────────────────────────────────────
try {
    $pdo = get_db_connection();
    
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($tables)) {
        flush_chunk("-- WARNING: No tables found in database\n");
    }
    
    $totalTables = count($tables);
    flush_chunk("-- Total tables: {$totalTables}\n\n");
    
    foreach ($tables as $index => $table) {
        $tableNum = $index + 1;
        flush_chunk("\n-- ----------------------------------------------------------------\n");
        flush_chunk("-- Table {$tableNum}/{$totalTables}: `{$table}`\n");
        flush_chunk("-- ----------------------------------------------------------------\n\n");
        
        // ── DROP + CREATE ──────────────────────────────────────────
        $createRow = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_NUM);
        if ($createRow && isset($createRow[1])) {
            flush_chunk("DROP TABLE IF EXISTS `{$table}`;\n");
            flush_chunk($createRow[1] . ";\n\n");
        }
        
        // ── Count rows ─────────────────────────────────────────────
        $countStmt = $pdo->query("SELECT COUNT(*) FROM `{$table}`");
        $totalRows = (int) $countStmt->fetchColumn();
        flush_chunk("-- Rows: {$totalRows}\n\n");
        
        if ($totalRows === 0) {
            flush_chunk("-- (empty table)\n");
            continue;
        }
        
        // ── Fetch & generate INSERTs in chunks ─────────────────────
        $chunkSize = 100;
        $offset = 0;
        $rowsWritten = 0;
        
        while ($offset < $totalRows) {
            $stmt = $pdo->prepare("SELECT * FROM `{$table}` LIMIT {$chunkSize} OFFSET {$offset}");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($rows)) break;
            
            foreach ($rows as $row) {
                $columns = array_keys($row);
                $values = array_map(function($val) use ($pdo) {
                    if ($val === null) return 'NULL';
                    return $pdo->quote((string) $val);
                }, array_values($row));
                
                $insert = "INSERT INTO `{$table}` (`" 
                        . implode('`, `', $columns) 
                        . "`) VALUES (" 
                        . implode(', ', $values) 
                        . ");\n";
                flush_chunk($insert);
                $rowsWritten++;
            }
            
            $offset += $chunkSize;
            
            // Progress comment every 500 rows
            if ($rowsWritten % 500 === 0 && $rowsWritten < $totalRows) {
                flush_chunk("-- Progress: {$rowsWritten}/{$totalRows} rows\n");
            }
        }
        
        flush_chunk("\n-- Completed `{$table}`: {$rowsWritten} rows written\n");
    }
    
    // ── Footer ─────────────────────────────────────────────────────
    flush_chunk("\nSET FOREIGN_KEY_CHECKS = 1;\n");
    flush_chunk("\n-- ================================================================\n");
    flush_chunk("-- Backup complete: {$totalTables} tables, completed at " . date('Y-m-d H:i:s T') . "\n");
    flush_chunk("-- ================================================================\n");
    
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'ok' => false,
        'error' => 'Database error during backup: ' . $e->getMessage()
    ]);
    exit;
} catch (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'ok' => false,
        'error' => 'Unexpected error: ' . $e->getMessage()
    ]);
    exit;
}