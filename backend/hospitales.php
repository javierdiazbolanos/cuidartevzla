<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - API de Hospitales (hospitales.php)
 * Terremotos de Venezuela - Junio de 2026
 */

require_once __DIR__ . '/db.php';

cors_and_json();
$db = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'GET') {
    json_error('Método HTTP no soportado. Hospitales solo admite consultas GET.', 405);
}

try {
    $stmt = $db->query("
        SELECT id, nombre, municipio, lat, lng, telefono 
        FROM hospitales 
        ORDER BY nombre ASC
    ");
    $hospitales = $stmt->fetchAll();
    
    // Castear id, lat, y lng a tipos nativos
    $resultado = [];
    foreach ($hospitales as $h) {
        $resultado[] = [
            'id' => (int)$h['id'],
            'nombre' => $h['nombre'],
            'municipio' => $h['municipio'],
            'lat' => $h['lat'] !== null ? (float)$h['lat'] : null,
            'lng' => $h['lng'] !== null ? (float)$h['lng'] : null,
            'telefono' => $h['telefono'] ?? null
        ];
    }
    
    json_ok($resultado);
} catch (PDOException $e) {
    json_error('Error al consultar hospitales: ' . $e->getMessage(), 500);
}
