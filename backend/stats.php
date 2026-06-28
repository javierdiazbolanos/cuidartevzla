<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - API de Estadísticas (stats.php)
 * Devuelve conteos, última fecha de registro y hora de actualización
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
    
    // Última actualización real: MAX(creado_en)
    $ultima_actualizacion_utc = $db->query("SELECT MAX(creado_en) FROM pacientes")->fetchColumn();
    
    // Formatear en hora Venezuela (UTC-4): "28 JUN 02:23 PM VET"
    $vet_time_formatted = null;
    if ($ultima_actualizacion_utc) {
        $dt = new DateTime($ultima_actualizacion_utc, new DateTimeZone('UTC'));
        $dt->setTimezone(new DateTimeZone('America/Caracas'));
        $vet_time_formatted = strtoupper($dt->format('d M h:i A')) . ' VET';
    }
    
    json_ok([
        'pacientes_count' => $pacientes_count,
        'ultimo_registro' => $ultimo_registro,
        'ultima_actualizacion' => $vet_time_formatted,
        'hospitales_count' => $hospitales_count,
    ]);
} catch (PDOException $e) {
    json_error('Error al consultar estadísticas: ' . $e->getMessage(), 500);
}