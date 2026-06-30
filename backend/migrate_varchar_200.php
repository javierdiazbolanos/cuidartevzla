<?php
declare(strict_types=1);

/**
 * Migración: Amplía nombre y nombre_norm a VARCHAR(200)
 * para evitar truncamiento de nombres largos en OCR/formularios.
 * 
 * Ejecutar UNA SOLA VEZ en producción.
 */

// Cargar db.php e inicializar
require_once __DIR__ . '/db.php';
cors_and_json();

$db = get_db_connection();

try {
    $alter1 = "ALTER TABLE pacientes MODIFY COLUMN nombre VARCHAR(200) NOT NULL";
    $db->exec($alter1);
    
    $alter2 = "ALTER TABLE pacientes MODIFY COLUMN nombre_norm VARCHAR(200) NOT NULL";
    $db->exec($alter2);
    
    json_ok([
        'mensaje' => 'Columnas nombre y nombre_norm ampliadas a VARCHAR(200) exitosamente.',
        'columnas' => ['nombre', 'nombre_norm'],
        'nuevo_tamano' => 'VARCHAR(200)',
    ]);
} catch (PDOException $e) {
    // Si las columnas ya son VARCHAR(200), no es error
    if (strpos($e->getMessage(), 'Duplicate column name') !== false || 
        strpos($e->getMessage(), 'already') !== false) {
        json_ok(['mensaje' => 'Las columnas ya son VARCHAR(200). Sin cambios necesarios.']);
    }
    json_error('Error en migración: ' . $e->getMessage(), 500);
}
