<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - Migración: Trazabilidad de Cargas
 * Crea tabla carga_log, extiende pacientes, añade FK con ON DELETE CASCADE
 * Ejecutar UNA SOLA VEZ vía: GET /api/migrate_carga_log.php
 * Requiere header X-Codigo-Voluntario con código de superusuario
 */

require_once __DIR__ . '/db.php';
cors_and_json();

// Solo superusuarios pueden ejecutar migraciones
$codigo = get_volunteer_code_from_request();
if (!isSuperUser($codigo)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Acceso denegado — se requiere superusuario']);
    exit;
}

try {
    $pdo = get_db_connection();
    $results = [];

    // 1. Crear tabla carga_log si no existe
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS carga_log (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            carga_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            carga_ip VARBINARY(16) NOT NULL COMMENT 'IP en formato binario (inet_pton)',
            carga_codigo VARCHAR(20) NOT NULL COMMENT 'Código de voluntario',
            PRIMARY KEY (id),
            INDEX idx_carga_timestamp (carga_timestamp),
            INDEX idx_carga_codigo (carga_codigo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $results[] = "✓ Tabla carga_log (lista)";

    // 2. Verificar y añadir columna carga_id en pacientes
    $stmt = $pdo->query("SHOW COLUMNS FROM pacientes LIKE 'carga_id'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pacientes ADD COLUMN carga_id INT UNSIGNED NULL COMMENT 'FK a carga_log.id'");
        $results[] = "✓ Columna pacientes.carga_id añadida";
    } else {
        $results[] = "○ Columna pacientes.carga_id ya existe";
    }

    // 3. Verificar y añadir columna carga_secuencial en pacientes
    $stmt = $pdo->query("SHOW COLUMNS FROM pacientes LIKE 'carga_secuencial'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pacientes ADD COLUMN carga_secuencial INT UNSIGNED NULL COMMENT 'N° de registro dentro de la carga'");
        $results[] = "✓ Columna pacientes.carga_secuencial añadida";
    } else {
        $results[] = "○ Columna pacientes.carga_secuencial ya existe";
    }

    // 4. Verificar y añadir índice en carga_id
    $stmt = $pdo->query("SHOW INDEX FROM pacientes WHERE Key_name = 'idx_carga_id'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE pacientes ADD INDEX idx_carga_id (carga_id)");
        $results[] = "✓ Índice idx_carga_id añadido";
    } else {
        $results[] = "○ Índice idx_carga_id ya existe";
    }

    // 5. Verificar y añadir Foreign Key con ON DELETE CASCADE
    $stmt = $pdo->query("
        SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = '" . DB_NAME . "' 
        AND TABLE_NAME = 'pacientes' 
        AND CONSTRAINT_NAME = 'fk_pac_carga'
    ");
    if (!$stmt->fetch()) {
        $pdo->exec("
            ALTER TABLE pacientes 
            ADD CONSTRAINT fk_pac_carga 
            FOREIGN KEY (carga_id) REFERENCES carga_log(id) 
            ON DELETE CASCADE
        ");
        $results[] = "✓ Foreign Key fk_pac_carga (ON DELETE CASCADE) añadida";
    } else {
        $results[] = "○ Foreign Key fk_pac_carga ya existe";
    }

    echo json_encode([
        'ok' => true,
        'migracion' => 'carga_log + trazabilidad',
        'resultados' => $results
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Error en migración: ' . $e->getMessage()
    ]);
}
