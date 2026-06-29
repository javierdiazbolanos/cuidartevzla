<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - Ejecutor de Migración historial_merge
 * Subir a htdocs/api/ y acceder vía navegador para crear la tabla.
 * Terremotos de Venezuela - Junio de 2026
 */

// Cargar conexión a BD
require_once __DIR__ . '/db.php';

header('Content-Type: text/plain; charset=UTF-8');

try {
    $db = get_db_connection();
    echo "✓ Conectado a la base de datos\n\n";
    
    // Verificar si la tabla ya existe
    $stmt = $db->query("SHOW TABLES LIKE 'historial_merge'");
    if ($stmt->fetch()) {
        echo "ℹ️  La tabla 'historial_merge' ya existe. Verificando estructura...\n\n";
        $cols = $db->query("DESCRIBE historial_merge")->fetchAll();
        echo "Columnas actuales:\n";
        foreach ($cols as $col) {
            echo "  - {$col['Field']} ({$col['Type']})\n";
        }
        echo "\n✓ No se requieren cambios. La tabla está lista.\n";
        exit;
    }
    
    // Crear la tabla
    $sql = "
        CREATE TABLE IF NOT EXISTS historial_merge (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            paciente_id INT UNSIGNED NOT NULL,
            fuente VARCHAR(100) NOT NULL DEFAULT 'desconocida',
            campos_agregados VARCHAR(500) NULL,
            datos_nuevos JSON NULL,
            creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_paciente (paciente_id),
            KEY idx_fuente (fuente),
            KEY idx_creado (creado_en),
            CONSTRAINT fk_hist_pac FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    
    $db->exec($sql);
    echo "✓ Tabla 'historial_merge' creada exitosamente\n\n";
    
    // Crear índice compuesto
    $db->exec("CREATE INDEX idx_paciente_fecha ON historial_merge (paciente_id, creado_en DESC)");
    echo "✓ Índice 'idx_paciente_fecha' creado\n\n";
    
    // Verificar
    $cols = $db->query("DESCRIBE historial_merge")->fetchAll();
    echo "Estructura creada:\n";
    foreach ($cols as $col) {
        echo "  - {$col['Field']} ({$col['Type']})\n";
    }
    
    echo "\n✅ Migración completada. El motor de deduplicación ya puede registrar auditoría de merges.\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    http_response_code(500);
}
