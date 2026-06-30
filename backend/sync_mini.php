<?php
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

header('Content-Type: application/json; charset=UTF-8');

try {
    require_once __DIR__ . '/db.php';
    cors_and_json();
    $db = get_db_connection();
    require_volunteer_code();
    
    // Leer POST body mínimo
    $raw = file_get_contents('php://input');
    $body_size = strlen($raw);
    $input = json_decode($raw, true);
    
    if (!$input || !isset($input['pacientes']) || !is_array($input['pacientes'])) {
        echo json_encode(['ok' => false, 'error' => 'No patients array', 'body_size' => $body_size]);
        exit;
    }
    
    $count = count($input['pacientes']);
    
    // Solo procesar el primer paciente como prueba
    if ($count > 0) {
        $p = $input['pacientes'][0];
        $nombre = $p['nombre'] ?? '(sin nombre)';
        
        $stmt = $db->prepare("INSERT INTO pacientes (nombre, nombre_norm, estado, posible_duplicado, carga_id, carga_secuencial) VALUES (?, ?, 'desconocido', 0, NULL, NULL)");
        $stmt->execute([$nombre, strtoupper($nombre)]);
        $new_id = (int)$db->lastInsertId();
        
        echo json_encode([
            'ok' => true,
            'body_size' => $body_size,
            'patients_count' => $count,
            'test_insert' => ['id' => $new_id, 'nombre' => $nombre]
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['ok' => false, 'error' => 'Empty patients', 'body_size' => $body_size]);
    }
    
} catch (Throwable $e) {
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
        'type' => get_class($e),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_UNICODE);
}