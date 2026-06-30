<?php
declare(strict_types=1);

/**
 * Script para homogenizar nombres de pacientes (Proper Case, nombre_norm limpio, cédula solo números).
 * Ejecutar vía navegador (o CLI) y mostrar resultados.
 * Luego eliminar este script por seguridad.
 */

set_time_limit(0);
ignore_user_abort(true);

// Cargar conexión y funciones de homogenización
require_once __DIR__ . '/db.php';

// Seguridad: requerir código de voluntario
require_volunteer_code();

header('Content-Type: text/plain; charset=UTF-8');
echo "Homogeneizando nombres de pacientes...\n\n";

try {
    $pdo = get_db_connection();
    echo "✓ Conexión establecida\n\n";

    $stats = homogenize_patient_names($pdo);

    echo "Estadísticas:\n";
    echo "  Total de registros: {$stats['total']}\n";
    echo "  Nombres cambiados a Proper Case: {$stats['nombre_cambiado']}\n";
    echo "  Nombre_norm actualizados: {$stats['nombre_norm_cambiado']}\n";
    echo "  Cédulas limpiadas (solo números): {$stats['cedula_limpia']}\n";
    if ($stats['errores'] > 0) {
        echo "  Errores encontrados: {$stats['errores']}\n";
    }
    echo "\n✓ Proceso completado.\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    http_response_code(500);
}