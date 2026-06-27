<?php
declare(strict_types=1);

/**
 * Cuídarte Venezuela - API de Pacientes (pacientes.php)
 * Terremotos de Venezuela - Junio de 2026
 */

require_once __DIR__ . '/db.php';

cors_and_json();
$db = get_db_connection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    // --- CONSULTA / DETALLE DE PACIENTES ---
    
    // Caso 1: Detalle por ID único
    if (isset($_GET['id'])) {
        $id = (int)$_GET['id'];
        $stmt = $db->prepare("
            SELECT p.*, h.nombre AS hospital_nombre 
            FROM pacientes p
            LEFT JOIN hospitales h ON p.hospital_id = h.id
            WHERE p.id = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        
        if (!$row) {
            json_error('Paciente no encontrado.', 404);
        }
        
        $paciente = row_to_paciente($row, true);
        json_ok($paciente);
    }
    
    // Caso 2: Búsqueda exacta por cédula
    if (isset($_GET['cedula'])) {
        $cedula_raw = $_GET['cedula'];
        $cedula_clean = clean_cedula($cedula_raw);
        
        if (empty($cedula_clean)) {
            json_error('Cédula inválida o vacía.');
        }
        
        $stmt = $db->prepare("
            SELECT p.*, h.nombre AS hospital_nombre 
            FROM pacientes p
            LEFT JOIN hospitales h ON p.hospital_id = h.id
            WHERE p.cedula = ?
            ORDER BY p.posible_duplicado ASC, p.nombre_norm ASC
        ");
        $stmt->execute([$cedula_clean]);
        $rows = $stmt->fetchAll();
        
        $resultados = [];
        foreach ($rows as $row) {
            $resultados[] = row_to_paciente($row);
        }
        json_ok($resultados);
    }
    
    // Caso 3: Búsqueda general por texto (nombre / cédula parcial)
    $q = $_GET['q'] ?? '';
    $hospital_id = isset($_GET['hospital_id']) && $_GET['hospital_id'] !== '' ? (int)$_GET['hospital_id'] : null;
    
    if (mb_strlen(trim($q)) < 2 && $hospital_id === null) {
        // Retornar vacío si no hay query mínimo ni filtro de hospital
        json_ok([]);
    }
    
    $conditions = [];
    $params = [];
    
    if (mb_strlen(trim($q)) >= 2) {
        $q_norm = norm_nombre($q);
        $cedula_clean = clean_cedula($q);
        
        if (!empty($cedula_clean) && strlen($cedula_clean) >= 5) {
            // Buscar por nombre normalizado o por cédula
            $conditions[] = "(p.nombre_norm LIKE ? OR p.cedula LIKE ?)";
            $params[] = '%' . $q_norm . '%';
            $params[] = '%' . $cedula_clean . '%';
        } else {
            // Buscar solo por nombre
            $conditions[] = "p.nombre_norm LIKE ?";
            $params[] = '%' . $q_norm . '%';
        }
    }
    
    if ($hospital_id !== null && $hospital_id > 0) {
        $conditions[] = "p.hospital_id = ?";
        $params[] = $hospital_id;
    }
    
    $where_clause = '';
    if (!empty($conditions)) {
        $where_clause = "WHERE " . implode(" AND ", $conditions);
    }
    
    // Consulta con JOIN
    $sql = "
        SELECT p.*, h.nombre AS hospital_nombre 
        FROM pacientes p
        LEFT JOIN hospitales h ON p.hospital_id = h.id
        $where_clause
        ORDER BY p.posible_duplicado ASC, p.nombre_norm ASC
        LIMIT 50
    ";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    
    $resultados = [];
    foreach ($rows as $row) {
        $resultados[] = row_to_paciente($row);
    }
    json_ok($resultados);

} elseif ($method === 'POST') {
    // --- CREACIÓN DE NUEVO PACIENTE (SOLO VOLUNTARIOS) ---
    require_volunteer_code();
    
    // Leer cuerpo JSON
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        json_error('Cuerpo de solicitud JSON inválido.');
    }
    
    $nombre = $input['nombre'] ?? '';
    if (empty(trim($nombre))) {
        json_error('El nombre del paciente es obligatorio.');
    }
    
    $nombre_norm = norm_nombre($nombre);
    $cedula = clean_cedula($input['cedula'] ?? null);
    $edad = isset($input['edad']) && $input['edad'] !== '' ? (int)$input['edad'] : null;
    $sexo = norm_sexo($input['sexo'] ?? null);
    $procedencia = !empty($input['procedencia']) ? trim($input['procedencia']) : null;
    $ingreso_detalle = !empty($input['ingreso_detalle']) ? trim($input['ingreso_detalle']) : null;
    $estado = valid_estado($input['estado'] ?? 'desconocido');
    $ingreso_fecha = validate_date($input['ingreso_fecha'] ?? null);
    $posible_duplicado = isset($input['posible_duplicado']) ? (int)(bool)$input['posible_duplicado'] : 0;
    
    // Resolver hospital
    $hospital_id = isset($input['hospital_id']) && $input['hospital_id'] !== '' ? (int)$input['hospital_id'] : null;
    $hospital_nuevo = $input['hospital_nuevo'] ?? null;
    $resolved_hospital_id = resolve_hospital($db, $hospital_id, $hospital_nuevo);
    $hospital_texto = !empty($hospital_nuevo) ? trim($hospital_nuevo) : ($input['hospital_texto'] ?? null);
    
    // Validación automática de duplicados
    if ($posible_duplicado === 0) {
        // Buscar si ya existe alguien con la misma cédula o mismo nombre_norm + edad
        if (!empty($cedula)) {
            $stmtDup = $db->prepare("SELECT id FROM pacientes WHERE cedula = ? LIMIT 1");
            $stmtDup->execute([$cedula]);
            if ($stmtDup->fetch()) {
                $posible_duplicado = 1;
            }
        } else {
            $stmtDup = $db->prepare("SELECT id FROM pacientes WHERE nombre_norm = ? AND edad = ? AND sexo = ? LIMIT 1");
            $stmtDup->execute([$nombre_norm, $edad, $sexo]);
            if ($stmtDup->fetch()) {
                $posible_duplicado = 1;
            }
        }
    }
    
    $sql = "
        INSERT INTO pacientes (
            nombre, nombre_norm, cedula, edad, sexo, procedencia, 
            hospital_id, hospital_texto, ingreso_fecha, ingreso_detalle, 
            estado, posible_duplicado
        ) VALUES (
            ?, ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, 
            ?, ?
        )
    ";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([
        trim($nombre),
        $nombre_norm,
        $cedula,
        $edad,
        $sexo,
        $procedencia,
        $resolved_hospital_id,
        $hospital_texto,
        $ingreso_fecha,
        $ingreso_detalle,
        $estado,
        $posible_duplicado
    ]);
    
    $new_id = (int)$db->lastInsertId();
    json_ok(['id' => $new_id]);

} elseif ($method === 'PUT') {
    // --- ACTUALIZACIÓN DE PACIENTE EXISTENTE (SOLO VOLUNTARIOS) ---
    require_volunteer_code();
    
    if (!isset($_GET['id'])) {
        json_error('ID de paciente requerido.');
    }
    $id = (int)$_GET['id'];
    
    // Verificar existencia
    $stmtCheck = $db->prepare("SELECT id FROM pacientes WHERE id = ?");
    $stmtCheck->execute([$id]);
    if (!$stmtCheck->fetch()) {
        json_error('Paciente no encontrado.', 404);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        json_error('Cuerpo de solicitud JSON inválido.');
    }
    
    // Construir SET dinámico de forma segura
    $fields = [];
    $params = [];
    
    if (isset($input['nombre'])) {
        $nombre = trim($input['nombre']);
        if (empty($nombre)) {
            json_error('El nombre no puede estar vacío.');
        }
        $fields[] = "nombre = ?";
        $params[] = $nombre;
        
        $fields[] = "nombre_norm = ?";
        $params[] = norm_nombre($nombre);
    }
    
    if (isset($input['cedula'])) {
        $fields[] = "cedula = ?";
        $params[] = clean_cedula($input['cedula']);
    }
    
    if (array_key_exists('edad', $input)) {
        $fields[] = "edad = ?";
        $params[] = $input['edad'] !== null && $input['edad'] !== '' ? (int)$input['edad'] : null;
    }
    
    if (isset($input['sexo'])) {
        $fields[] = "sexo = ?";
        $params[] = norm_sexo($input['sexo']);
    }
    
    if (array_key_exists('procedencia', $input)) {
        $fields[] = "procedencia = ?";
        $params[] = !empty($input['procedencia']) ? trim($input['procedencia']) : null;
    }
    
    if (isset($input['estado'])) {
        $fields[] = "estado = ?";
        $params[] = valid_estado($input['estado']);
    }
    
    if (array_key_exists('ingreso_fecha', $input)) {
        $fields[] = "ingreso_fecha = ?";
        $params[] = validate_date($input['ingreso_fecha']);
    }
    
    if (array_key_exists('ingreso_detalle', $input)) {
        $fields[] = "ingreso_detalle = ?";
        $params[] = !empty($input['ingreso_detalle']) ? trim($input['ingreso_detalle']) : null;
    }
    
    if (isset($input['posible_duplicado'])) {
        $fields[] = "posible_duplicado = ?";
        $params[] = (int)(bool)$input['posible_duplicado'];
    }
    
    // Hospitales
    if (array_key_exists('hospital_id', $input) || isset($input['hospital_nuevo'])) {
        $hospital_id = isset($input['hospital_id']) && $input['hospital_id'] !== '' ? (int)$input['hospital_id'] : null;
        $hospital_nuevo = $input['hospital_nuevo'] ?? null;
        $resolved_hospital_id = resolve_hospital($db, $hospital_id, $hospital_nuevo);
        $hospital_texto = !empty($hospital_nuevo) ? trim($hospital_nuevo) : ($input['hospital_texto'] ?? null);
        
        $fields[] = "hospital_id = ?";
        $params[] = $resolved_hospital_id;
        
        $fields[] = "hospital_texto = ?";
        $params[] = $hospital_texto;
    }
    
    if (empty($fields)) {
        json_error('No se enviaron campos válidos para actualizar.');
    }
    
    // Ejecutar consulta
    $sql = "UPDATE pacientes SET " . implode(", ", $fields) . " WHERE id = ?";
    $params[] = $id;
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    json_ok(['updated' => true]);
} else {
    json_error('Método HTTP no soportado.', 405);
}
