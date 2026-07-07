<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - API de Edificios Afectados
 * 
 * GET → público, devuelve edificios con búsqueda y filtro por tipo de daño
 */

require_once __DIR__ . '/db.php';

cors_and_json();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'GET') {
    json_error('Método no permitido.', 405);
}

try {
    $db = get_db_connection();

    // Verificar si la tabla existe
    try {
        $db->query("SELECT 1 FROM edificios LIMIT 1");
    } catch (Exception $e) {
        json_ok([]);
    }

    $q = trim($_GET['q'] ?? '');
    $tipo = trim($_GET['tipo'] ?? '');

    $sql = "SELECT id, nombre, tipo_dano, observacion, enlace FROM edificios WHERE 1=1";
    $params = [];

    if ($q !== '') {
        $sql .= " AND (nombre LIKE ? OR observacion LIKE ?)";
        $like = "%{$q}%";
        $params[] = $like;
        $params[] = $like;
    }

    if ($tipo !== '' && in_array($tipo, ['total', 'severo'], true)) {
        $sql .= " AND tipo_dano = ?";
        $params[] = $tipo;
    }

    $sql .= " ORDER BY tipo_dano ASC, nombre ASC LIMIT 1000";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    $edificios = [];
    foreach ($rows as $row) {
        $edificios[] = [
            'id'          => (int) $row['id'],
            'nombre'      => $row['nombre'],
            'tipo_dano'   => $row['tipo_dano'],
            'observacion' => $row['observacion'] ?? '',
            'enlace'      => $row['enlace'] ?? '',
        ];
    }

    json_ok($edificios);

} catch (Exception $e) {
    error_log("edificios.php: " . $e->getMessage());
    json_error('Error interno al obtener edificios.', 500);
}