<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - Verificación de Superusuario
 * Devuelve si el código de voluntario actual tiene privilegios de superusuario.
 * Usado por el frontend para mostrar/ocultar UI administrativa.
 * 
 * GET /api/superuser_status.php
 * Response: {"ok": true, "is_superuser": true/false, "codigo": "15731877"}
 */

require_once __DIR__ . '/db.php';
cors_and_json();

$codigo = get_volunteer_code_from_request();

echo json_encode([
    'ok' => true,
    'is_superuser' => isSuperUser($codigo),
    'codigo' => $codigo
]);
