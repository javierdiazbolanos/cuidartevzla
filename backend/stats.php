<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - API de Estadísticas (stats.php)
 * Devuelve conteos y última fecha de actualización
 */

require_once __DIR__ . '/db.php';

cors_and_json();
$db = get_db_connection();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Solo GET permitido', 405);
}

try {
    $pacientes_count = (int)$db->query("SELECT COUNT(*) FROM pacientes")->fetchColumn();
    $ultimo_registro = $db->query("SELECT MAX(ingreso_fecha) FROM pacientes")->fetchColumn();
    $hospitales_count = (int)$db->query("SELECT COUNT(*) FROM hospitales")->fetchColumn();
    
    json_ok([
        'pacientes_count' => $pacientes_count,
        'ultimo_registro' => $ultimo_registro,
        'hospitales_count' => $hospitales_count,
    ]);
} catch (PDOException $e) {
    json_error('Error al consultar estadísticas: ' . $e->getMessage(), 500);
}