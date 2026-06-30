<?php
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json; charset=UTF-8');

try {
    require_once __DIR__ . '/db.php';
    
    $code = $_GET['codigo'] ?? 'none';
    
    // Simular require_volunteer_code sin hacer exit
    $received = get_volunteer_code_from_request();
    $is_authorized = !empty($received);
    
    // Simular DB connection
    $db = get_db_connection();
    $db_version = $db->getAttribute(PDO::ATTR_SERVER_VERSION);
    
    // Verificar carga_log
    $carga_exists = (bool) $db->query("SELECT 1 FROM carga_log LIMIT 1")->fetch();
    
    echo json_encode([
        'ok' => true,
        'code' => $code,
        'received' => $received,
        'authorized' => $is_authorized,
        'db' => $db_version,
        'carga_log' => $carga_exists,
        'funcs' => [
            'paciente_identico' => function_exists('paciente_identico'),
            'capitalize_name' => function_exists('capitalize_name'),
            'require_volunteer_code' => function_exists('require_volunteer_code'),
        ]
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Throwable $e) {
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
        'type' => get_class($e),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_UNICODE);
}