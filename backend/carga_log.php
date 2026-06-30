<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - Gestión de Cargas (GET lista + DELETE borrado)
 * Solo accesible por superusuarios
 * 
 * GET  /api/carga_log.php          → lista todas las cargas cronológicamente
 * DELETE /api/carga_log.php?id=57  → borra una carga + sus pacientes (ON DELETE CASCADE)
 */

require_once __DIR__ . '/db.php';
cors_and_json();

// Verificar que es un código de voluntario válido
require_volunteer_code();

$codigo = get_volunteer_code_from_request();

// Solo superusuarios pueden gestionar cargas
if (!isSuperUser($codigo)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Acceso denegado — se requiere superusuario']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ═══════════════════════════════════════════════
// DELETE — Borrar una carga y sus pacientes asociados
// ═══════════════════════════════════════════════
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Se requiere parámetro ?id=N válido']);
        exit;
    }
    
    try {
        $pdo = get_db_connection();
        
        // Verificar que la carga existe
        $stmt = $pdo->prepare("SELECT id, carga_timestamp, carga_codigo FROM carga_log WHERE id = ?");
        $stmt->execute([$id]);
        $carga = $stmt->fetch();
        
        if (!$carga) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => "Carga ID=$id no encontrada"]);
            exit;
        }
        
        // Contar pacientes que serán eliminados (por la FK ON DELETE CASCADE)
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM pacientes WHERE carga_id = ?");
        $stmt->execute([$id]);
        $numPacientes = (int)$stmt->fetchColumn();
        
        // Borrar la carga — los pacientes se borran en cascada automáticamente
        $stmt = $pdo->prepare("DELETE FROM carga_log WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode([
            'ok' => true,
            'mensaje' => "Carga ID=$id eliminada",
            'carga' => [
                'id' => $id,
                'timestamp' => $carga['carga_timestamp'],
                'codigo' => $carga['carga_codigo'],
            ],
            'pacientes_eliminados' => $numPacientes
        ]);
        
    } catch (Exception $e) {
        error_log(sprintf('[carga_log DELETE] %s', $e->getMessage()));
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Error interno al borrar la carga']);
    }
    exit;
}

// ═══════════════════════════════════════════════
// GET — Listar todas las cargas cronológicamente
// ═══════════════════════════════════════════════

try {
    $pdo = get_db_connection();
    
    // Verificar si la tabla carga_log existe
    $tableExists = false;
    try {
        $pdo->query("SELECT 1 FROM carga_log LIMIT 1");
        $tableExists = true;
    } catch (PDOException $e) {
        // Tabla no existe — probablemente falta ejecutar la migración
        $tableExists = false;
    }
    
    if (!$tableExists) {
        echo json_encode([
            'ok' => true,
            'cargas' => [],
            'total' => 0,
            'status' => 'migration_needed',
            'mensaje' => 'La tabla carga_log no existe aún. Ejecute /api/migrate_carga_log.php para crearla.'
        ]);
        exit;
    }
    
    $stmt = $pdo->query("
        SELECT 
            cl.id,
            cl.carga_timestamp,
            cl.carga_ip,
            cl.carga_codigo,
            COUNT(p.id) AS num_registros
        FROM carga_log cl
        LEFT JOIN pacientes p ON p.carga_id = cl.id
        GROUP BY cl.id
        ORDER BY cl.carga_timestamp DESC
        LIMIT 500
    ");
    
    $cargas = [];
    while ($row = $stmt->fetch()) {
        // Convertir IP binaria a hexadecimal legible
        $ipHex = '';
        if ($row['carga_ip'] !== null && strlen($row['carga_ip']) > 0) {
            $ipHex = strtoupper(bin2hex($row['carga_ip']));
            // Para IPv4 (4 bytes mapeados a IPv6), tomar solo los últimos 8 caracteres
            if (strlen($ipHex) === 32) {
                // IPv6 completo o IPv4 mapeado — mostrar solo la parte significativa
                $ipHex = substr($ipHex, -8); // últimos 4 bytes = IPv4 en hex
            }
        }
        
        $cargas[] = [
            'id'             => (int)$row['id'],
            'timestamp'      => $row['carga_timestamp'],
            'ip_hex'         => $ipHex,
            'codigo'         => $row['carga_codigo'],
            'num_registros'  => (int)$row['num_registros'],
        ];
    }
    
    echo json_encode([
        'ok' => true,
        'cargas' => $cargas,
        'total' => count($cargas)
    ]);
    
} catch (Exception $e) {
    error_log(sprintf('[carga_log GET] %s', $e->getMessage()));
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Error interno al listar cargas']);
}
