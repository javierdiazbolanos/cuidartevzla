<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - Backup de Base de Datos (vía archivo)
 * Guarda el dump en un archivo descargable vía FTP
 * Solo ejecutable con código de superusuario
 */

require_once __DIR__ . '/db.php';
cors_and_json();

// Verificar código de voluntario
$codigo = get_volunteer_code_from_request();
if (!isSuperUser($codigo)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Acceso denegado — se requiere superusuario']);
    exit;
}

try {
    $pdo = get_db_connection();
    
    $output = "-- Cuídarte Venezuela - Backup de Base de Datos\n";
    $output .= "-- Generado: " . date('Y-m-d H:i:s') . " UTC\n";
    $output .= "-- Servidor: " . DB_HOST . "\n";
    $output .= "-- Base de datos: " . DB_NAME . "\n\n";
    $output .= "SET NAMES utf8mb4;\n";
    $output .= "SET FOREIGN_KEY_CHECKS = 0;\n\n";
    
    // Obtener todas las tablas
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $totalRows = 0;
    
    foreach ($tables as $table) {
        // DROP + CREATE
        $create = $pdo->query("SHOW CREATE TABLE `$table`")->fetch();
        $output .= "DROP TABLE IF EXISTS `$table`;\n";
        $output .= $create['Create Table'] . ";\n\n";
        
        // INSERT datos
        $rows = $pdo->query("SELECT * FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
        $count = count($rows);
        $totalRows += $count;
        
        if ($count > 0) {
            $columns = array_keys($rows[0]);
            $colsStr = '`' . implode('`, `', $columns) . '`';
            
            $values = [];
            foreach ($rows as $row) {
                $escaped = [];
                foreach ($row as $val) {
                    if ($val === null) {
                        $escaped[] = 'NULL';
                    } else {
                        $escaped[] = $pdo->quote($val);
                    }
                }
                $values[] = '(' . implode(', ', $escaped) . ')';
            }
            
            $output .= "INSERT INTO `$table` ($colsStr) VALUES\n";
            $output .= implode(",\n", $values) . ";\n\n";
        }
    }
    
    $output .= "SET FOREIGN_KEY_CHECKS = 1;\n";
    
    // Guardar archivo en el servidor
    $backupDir = __DIR__ . '/backups';
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0755, true);
    }
    
    $filename = 'cuidartevzla_backup_' . date('Ymd_His') . '.sql';
    $filepath = $backupDir . '/' . $filename;
    
    file_put_contents($filepath, $output);
    
    echo json_encode([
        'ok' => true,
        'file' => $filename,
        'size_bytes' => strlen($output),
        'tables' => count($tables),
        'total_rows' => $totalRows
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Error: ' . $e->getMessage()]);
}
