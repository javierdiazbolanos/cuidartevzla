<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - API de Edificios Afectados (edificios.php)
 * Terremotos de Venezuela - Junio de 2026
 */

require_once __DIR__ . '/db.php';

cors_and_json();
$db = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'GET') {
    json_error('Método HTTP no soportado. Edificios solo admite consultas GET.', 405);
}

try {
    $q = trim($_GET['q'] ?? '');
    $tipo = trim($_GET['tipo'] ?? '');

    $sql = "SELECT id, nombre, tipo_dano, observacion, enlace FROM edificios WHERE 1=1";
    $params = [];

    if ($q !== '') {
        $sql .= " AND (nombre LIKE :q1 OR observacion LIKE :q2)";
        $params[':q1'] = "%{$q}%";
        $params[':q2'] = "%{$q}%";
    }

    if ($tipo !== '' && in_array($tipo, ['total', 'severo'], true)) {
        $sql .= " AND tipo_dano = :tipo";
        $params[':tipo'] = $tipo;
    }

    $sql .= " ORDER BY tipo_dano ASC, nombre ASC LIMIT 500";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $edificios = $stmt->fetchAll();

    $resultado = [];
    foreach ($edificios as $e) {
        $resultado[] = [
            'id' => (int)$e['id'],
            'nombre' => $e['nombre'],
            'tipo_dano' => $e['tipo_dano'],
            'observacion' => $e['observacion'] ?? '',
            'enlace' => $e['enlace'] ?? '',
        ];
    }

    json_ok($resultado);
} catch (PDOException $e) {
    json_error('Error al consultar edificios: ' . $e->getMessage(), 500);
}