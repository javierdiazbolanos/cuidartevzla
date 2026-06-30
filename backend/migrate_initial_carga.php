<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - Asignar carga INICIAL a pacientes existentes
 * Todos los pacientes con carga_id=NULL se asignan a una carga especial "INITIAL"
 * Ejecutar UNA SOLA VEZ: GET /api/migrate_initial_carga.php?codigo=15731877
 */

require_once __DIR__ . '/db.php';
cors_and_json();

$codigo = get_volunteer_code_from_request();
if (!isSuperUser($codigo)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Se requiere superusuario']);
    exit;
}

try {
    $pdo = get_db_connection();
    
    // Verificar cuántos pacientes sin carga hay
    $stmt = $pdo->query("SELECT COUNT(*) FROM pacientes WHERE carga_id IS NULL");
    $sinCarga = (int)$stmt->fetchColumn();
    
    if ($sinCarga === 0) {
        echo json_encode(['ok' => true, 'mensaje' => 'Todos los pacientes ya tienen carga asignada.', 'asignados' => 0]);
        exit;
    }
    
    // Crear entrada de carga INICIAL
    $fechaSismo = '2026-06-15 08:00:00';
    $ipCero = inet_pton('0.0.0.0');
    
    $pdo->beginTransaction();
    
    $stmt = $pdo->prepare("
        INSERT INTO carga_log (carga_timestamp, carga_ip, carga_codigo) 
        VALUES (?, ?, 'INITIAL')
    ");
    $stmt->execute([$fechaSismo, $ipCero]);
    $cargaId = (int)$pdo->lastInsertId();
    
    // Asignar carga_id a todos los pacientes huérfanos
    $pdo->exec("UPDATE pacientes SET carga_id = $cargaId WHERE carga_id IS NULL");
    
    // Asignar secuencial por orden de ID
    $stmt = $pdo->query("SELECT id FROM pacientes WHERE carga_id = $cargaId ORDER BY id");
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $stmtUpd = $pdo->prepare("UPDATE pacientes SET carga_secuencial = ? WHERE id = ?");
    $seq = 1;
    foreach ($ids as $pid) {
        $stmtUpd->execute([$seq, $pid]);
        $seq++;
    }
    
    $pdo->commit();
    
    echo json_encode([
        'ok' => true,
        'mensaje' => "Carga INICIAL creada y $sinCarga pacientes asignados",
        'carga_id' => $cargaId,
        'asignados' => $sinCarga,
        'carga_codigo' => 'INITIAL',
        'carga_timestamp' => $fechaSismo
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Error: ' . $e->getMessage()]);
}
